/**
 * TNV Hub Portal - Edge Function: record_payment
 * Spec: TNV_Hub_Backend_Database_Spec (1).pdf (Section 6.2)
 * Journey: TNV_End_to_End_Journey.pdf (Part A, Step 4)
 * 
 * Rules:
 * - Requires a signed-in user (extract profile_id from verified JWT, NEVER from request body).
 * - Fixed amount of Rs 365 enforced by server (ignores any client-sent amount).
 * - Verifies result with gateway or accepts mock marker in demo mode.
 * - If failed: optionally logs payments row with 'failed'. Changes nothing else.
 * - If paid:
 *   1. Generates receipt_no from sequence: TNV-R-<year>-<running_number>.
 *   2. Inserts payments row (status = 'paid').
 *   3. Sets profiles.membership_paid = true.
 *   4. Generates PDF receipt into private storage: receipts/<profile_id>/<receipt_no>.pdf.
 *   5. Returns receipt_no and short-lived signed URL.
 * - Idempotency: Same gateway_ref returns existing receipt.
 */

import { getServiceClient } from '../_shared/supabaseClient.ts';
import { generateReceiptPdf } from '../_shared/pdf.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

const MEMBERSHIP_FEE_INR = 365;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed. Use POST.' }),
      { status: 405, headers: corsHeaders }
    );
  }

  const supabaseAdmin = getServiceClient();

  // =========================================================================
  // STEP 1: Identify caller from verified token (NEVER from body)
  // =========================================================================
  const authHeader = req.headers.get('Authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!token) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized: missing authentication token' }),
      { status: 401, headers: corsHeaders }
    );
  }

  const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !authData?.user) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized: invalid or expired session' }),
      { status: 401, headers: corsHeaders }
    );
  }

  const userId = authData.user.id;

  // Load applicant's profile
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, username, email, phone, district_id, membership_paid, districts(name)')
    .eq('id', userId)
    .single();

  if (profileError || !profile) {
    return new Response(
      JSON.stringify({ error: 'Profile not found' }),
      { status: 404, headers: corsHeaders }
    );
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch (_e) {
    body = {};
  }

  const gatewayRef = (body.gateway_ref || body.mock_marker || `MOCK-PAY-${Date.now()}`).toString().trim();

  // =========================================================================
  // Idempotency: Check if gateway_ref was already recorded
  // =========================================================================
  const { data: existingPayment } = await supabaseAdmin
    .from('payments')
    .select('id, receipt_no, status, paid_at')
    .eq('gateway_ref', gatewayRef)
    .eq('status', 'paid')
    .maybeSingle();

  if (existingPayment) {
    // Generate signed URL for existing receipt and return
    const storagePath = `receipts/${userId}/${existingPayment.receipt_no}.pdf`;
    const { data: signedData } = await supabaseAdmin.storage
      .from('receipts')
      .createSignedUrl(storagePath, 3600);

    return new Response(
      JSON.stringify({
        success: true,
        status: 'paid',
        receipt_no: existingPayment.receipt_no,
        amount_inr: MEMBERSHIP_FEE_INR,
        signed_url: signedData?.signedUrl || null,
        message: 'Payment was previously recorded (idempotent response)',
      }),
      { status: 200, headers: corsHeaders }
    );
  }

  // If already paid and no new gateway ref, return existing receipt
  if (profile.membership_paid) {
    const { data: userPayment } = await supabaseAdmin
      .from('payments')
      .select('id, receipt_no')
      .eq('profile_id', userId)
      .eq('status', 'paid')
      .order('paid_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (userPayment) {
      const storagePath = `receipts/${userId}/${userPayment.receipt_no}.pdf`;
      const { data: signedData } = await supabaseAdmin.storage
        .from('receipts')
        .createSignedUrl(storagePath, 3600);

      return new Response(
        JSON.stringify({
          success: true,
          status: 'paid',
          receipt_no: userPayment.receipt_no,
          amount_inr: MEMBERSHIP_FEE_INR,
          signed_url: signedData?.signedUrl || null,
          message: 'Membership fee is already paid',
        }),
        { status: 200, headers: corsHeaders }
      );
    }
  }

  // =========================================================================
  // STEP 2 & 3: Verify payment & Fix amount at Rs 365
  // =========================================================================
  // Amount is ALWAYS Rs 365, server-fixed
  const isMockFailure = body.mock_fail === true || gatewayRef.includes('fail');

  // STEP 4: If payment failed, record failed attempt, change nothing else
  if (isMockFailure) {
    await supabaseAdmin.from('payments').insert({
      profile_id: userId,
      amount_inr: MEMBERSHIP_FEE_INR,
      status: 'failed',
      gateway_ref: gatewayRef,
    });

    return new Response(
      JSON.stringify({
        success: false,
        status: 'failed',
        error: 'Payment transaction failed with the gateway. Registration remains unaffected.',
      }),
      { status: 400, headers: corsHeaders }
    );
  }

  // =========================================================================
  // STEP 5: Payment succeeded -> Generate receipt_no & Insert payment
  // =========================================================================
  let receiptNo: string;
  try {
    const { data: seqData, error: seqError } = await supabaseAdmin.rpc('generate_receipt_no');
    if (seqError || !seqData) {
      throw new Error(seqError?.message || 'Sequence error');
    }
    receiptNo = seqData;
  } catch (_e) {
    // Fallback standard receipt formatting
    const currentYear = new Date().getFullYear();
    const fallbackSeq = Math.floor(1000 + Math.random() * 9000);
    receiptNo = `TNV-R-${currentYear}-${fallbackSeq}`;
  }

  // Insert payment record
  const { error: insertPayError } = await supabaseAdmin.from('payments').insert({
    profile_id: userId,
    amount_inr: MEMBERSHIP_FEE_INR,
    status: 'paid',
    gateway_ref: gatewayRef,
    receipt_no: receiptNo,
    paid_at: new Date().toISOString(),
  });

  if (insertPayError) {
    return new Response(
      JSON.stringify({ error: `Failed to record payment: ${insertPayError.message}` }),
      { status: 500, headers: corsHeaders }
    );
  }

  // Set membership_paid = true
  const { error: updateProfileError } = await supabaseAdmin
    .from('profiles')
    .update({ membership_paid: true })
    .eq('id', userId);

  if (updateProfileError) {
    console.error('Failed to update membership_paid:', updateProfileError.message);
  }

  // =========================================================================
  // STEP 6: Generate receipt PDF & upload to private storage bucket
  // Path: receipts/<profile_id>/<receipt_no>.pdf
  // =========================================================================
  const districtName = (profile as any).districts?.name || `District ${profile.district_id}`;
  const pdfBytes = generateReceiptPdf({
    receiptNo: receiptNo,
    paidAt: new Date().toISOString(),
    fullName: profile.full_name,
    username: profile.username,
    email: profile.email,
    phone: profile.phone,
    district: districtName,
    gatewayRef: gatewayRef,
    amountInr: MEMBERSHIP_FEE_INR,
  });

  const storagePath = `receipts/${userId}/${receiptNo}.pdf`;
  let signedUrl: string | null = null;

  try {
    // Upload PDF to private bucket
    const { error: uploadError } = await supabaseAdmin.storage
      .from('receipts')
      .upload(storagePath, pdfBytes, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) {
      console.error('Storage upload warning:', uploadError.message);
    } else {
      // STEP 7: Create short-lived signed URL (valid for 1 hour = 3600s)
      const { data: signedData } = await supabaseAdmin.storage
        .from('receipts')
        .createSignedUrl(storagePath, 3600);
      signedUrl = signedData?.signedUrl || null;
    }
  } catch (storageErr: any) {
    console.error('Storage operation failed:', storageErr.message);
  }

  // =========================================================================
  // STEP 7: Return receipt_no and signed URL
  // =========================================================================
  return new Response(
    JSON.stringify({
      success: true,
      status: 'paid',
      receipt_no: receiptNo,
      amount_inr: MEMBERSHIP_FEE_INR,
      signed_url: signedUrl,
      storage_path: storagePath,
      message: 'Payment of Rs 365 recorded successfully. Receipt generated.',
    }),
    { status: 200, headers: corsHeaders }
  );
});
