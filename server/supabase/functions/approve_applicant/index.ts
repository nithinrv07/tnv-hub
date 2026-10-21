/**
-- =====================================================================
-- TNV Hub Portal - Edge Function: approve_applicant
-- Spec: TNV_Hub_Backend_Database_Spec (1).pdf (Section 6.3)
-- Journey: TNV_End_to_End_Journey.pdf (Part B, Step 11 / Tasks T7 & T8)
--
-- Rules:
-- 1. Admin only (caller must be authenticated with role master_admin or dept_admin).
-- 2. Reject if applicant is missing or already approved. No path back to pending.
-- 3. Refuse if any active question has no score (lists missing question IDs).
-- 4. Computes total score and generates official TNV ID from sequence.
-- 5. Atomic transaction: updates status to 'approved', role, tnv_id, writes verifications and audit_log.
-- 6. Sends approval email. Email failure is logged, never rolled back.
-- 7. Returns updated profile summary to the admin.
-- =====================================================================
*/

import { getServiceClient } from '../_shared/supabaseClient.ts';
import { sendEmail } from '../_shared/email.ts';
import { AppRole } from '../_shared/types.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

interface ApproveApplicantInput {
  profile_id: string;
  role: AppRole;
  wing_id?: number;
}

/**
 * Sends congratulations and credentials reminder on member approval.
 * Email failure is strictly non-fatal.
 */
async function sendApprovalEmail(
  email: string,
  fullName: string,
  username: string,
  tnvId: string,
  role: string
): Promise<boolean> {
  const portalUrl = Deno?.env?.get('PORTAL_URL') || process?.env?.PORTAL_URL || 'https://portal.tnv.org';
  const loginUrl = `${portalUrl}/login`;

  const subject = `Congratulations ${fullName}! Your TNV Application is Verified & Approved`;
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #10b981; border-radius: 8px;">
      <div style="background-color: #10b981; color: white; padding: 16px; border-radius: 6px 6px 0 0; text-align: center;">
        <h2 style="margin: 0;">Welcome to Tamil Nadu Volunteers</h2>
        <p style="margin: 4px 0 0 0; font-size: 14px;">Your Application has been Verified & Approved</p>
      </div>
      <div style="padding: 20px 10px;">
        <p>Dear <strong>${fullName}</strong>,</p>
        <p>We are pleased to inform you that your volunteer verification and interview process has been completed successfully!</p>
        
        <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 16px; margin: 20px 0;">
          <p style="margin: 0 0 8px 0; font-size: 14px; color: #166534;"><strong>Official TNV Member ID:</strong> <span style="font-size: 18px; color: #0f172a; font-family: monospace;">${tnvId}</span></p>
          <p style="margin: 0 0 8px 0; font-size: 14px; color: #166534;"><strong>Assigned Role:</strong> <span style="text-transform: capitalize; color: #0f172a;">${role.replace(/_/g, ' ')}</span></p>
          <p style="margin: 0; font-size: 14px; color: #166534;"><strong>Username:</strong> ${username}</p>
        </div>

        <p>Your Member Dashboard is now fully unlocked. You can now:</p>
        <ul style="color: #475569; font-size: 14px;">
          <li>Download your Official Digital Volunteer ID Card</li>
          <li>Download your TNV Appointment Letter</li>
          <li>Access your District, Wing & Sector WhatsApp Community Groups</li>
        </ul>

        <p style="text-align: center; margin: 30px 0;">
          <a href="${loginUrl}" style="background-color: #059669; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Access Member Dashboard</a>
        </p>

        <p style="font-size: 13px; color: #64748b; margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 15px;">
          Tamil Nadu Volunteers Platform • Inspiring Civic Action & Public Leadership
        </p>
      </div>
    </div>
  `;

  const text = `Welcome to Tamil Nadu Volunteers!\n\nDear ${fullName},\n\nYour volunteer application has been approved.\nTNV ID: ${tnvId}\nAssigned Role: ${role}\n\nLog in to access your ID Card and WhatsApp Groups: ${loginUrl}`;

  const result = await sendEmail({ to: email, subject, html, text });
  return result.success;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
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
  // STEP 1: Identify caller & verify Admin role from JWT
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

  const adminUserId = authData.user.id;

  // Check admin role in profiles
  const { data: callerProfile, error: callerError } = await supabaseAdmin
    .from('profiles')
    .select('id, role')
    .eq('id', adminUserId)
    .single();

  const isAdmin = callerProfile && (callerProfile.role === 'master_admin' || callerProfile.role === 'dept_admin');
  if (callerError || !isAdmin) {
    return new Response(
      JSON.stringify({ error: 'Forbidden: caller must be a Master Admin or Department Admin to approve applicants' }),
      { status: 403, headers: corsHeaders }
    );
  }

  // =========================================================================
  // Parse & Validate Request Body
  // =========================================================================
  let body: Partial<ApproveApplicantInput>;
  try {
    body = await req.json();
  } catch (_e) {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON request body' }),
      { status: 400, headers: corsHeaders }
    );
  }

  const profileId = body.profile_id;
  const chosenRole = body.role;
  const wingId = body.wing_id || 1;

  if (!profileId) {
    return new Response(
      JSON.stringify({ error: 'profile_id is required' }),
      { status: 400, headers: corsHeaders }
    );
  }

  const validRoles: AppRole[] = ['volunteer', 'district_coordinator', 'wing_lead', 'dept_admin', 'master_admin'];
  if (!chosenRole || !validRoles.includes(chosenRole)) {
    return new Response(
      JSON.stringify({ error: `Invalid role: "${chosenRole}". Must be one of: ${validRoles.join(', ')}` }),
      { status: 400, headers: corsHeaders }
    );
  }

  // =========================================================================
  // STEP 2: Load applicant and verify status
  // =========================================================================
  const { data: applicant, error: applicantError } = await supabaseAdmin
    .from('profiles')
    .select('id, status, full_name, username, email, district_id')
    .eq('id', profileId)
    .maybeSingle();

  if (applicantError || !applicant) {
    return new Response(
      JSON.stringify({ error: `Applicant profile with ID "${profileId}" does not exist` }),
      { status: 404, headers: corsHeaders }
    );
  }

  if (applicant.status !== 'pending') {
    return new Response(
      JSON.stringify({ error: `Applicant is already "${applicant.status}". Only pending applicants can be approved.` }),
      { status: 400, headers: corsHeaders }
    );
  }

  // =========================================================================
  // STEP 3: Verify all active interview questions are scored
  // =========================================================================
  const { data: activeQuestions, error: qError } = await supabaseAdmin
    .from('interview_questions')
    .select('id, position')
    .eq('active', true)
    .order('position', { ascending: true });

  if (qError) {
    return new Response(
      JSON.stringify({ error: `Failed to load interview questions: ${qError.message}` }),
      { status: 500, headers: corsHeaders }
    );
  }

  const { data: recordedScores, error: sError } = await supabaseAdmin
    .from('interview_scores')
    .select('question_id, score')
    .eq('profile_id', profileId);

  if (sError) {
    return new Response(
      JSON.stringify({ error: `Failed to load recorded scores: ${sError.message}` }),
      { status: 500, headers: corsHeaders }
    );
  }

  const scoredQuestionIds = new Set((recordedScores || []).map(s => s.question_id));
  const missingQuestions = (activeQuestions || []).filter(q => !scoredQuestionIds.has(q.id));

  if (missingQuestions.length > 0) {
    return new Response(
      JSON.stringify({
        error: 'Cannot approve applicant: scoring is incomplete. Every active interview question must be scored first.',
        missing_question_ids: missingQuestions.map(q => q.id),
        active_count: (activeQuestions || []).length,
        scored_count: scoredQuestionIds.size,
      }),
      { status: 400, headers: corsHeaders }
    );
  }

  // =========================================================================
  // STEP 4, 5, 6, 7: Execute Atomic Approval Transaction via RPC approve_applicant_tx
  // =========================================================================
  const { data: txResult, error: txError } = await supabaseAdmin.rpc('approve_applicant_tx', {
    p_profile_id: profileId,
    p_role: chosenRole,
    p_wing_id: wingId,
  });

  if (txError || !txResult) {
    return new Response(
      JSON.stringify({ error: `Approval transaction failed: ${txError?.message}` }),
      { status: 500, headers: corsHeaders }
    );
  }

  // =========================================================================
  // STEP 8: Send approval email (failure is non-fatal)
  // =========================================================================
  let emailSent = false;
  try {
    emailSent = await sendApprovalEmail(
      applicant.email,
      applicant.full_name,
      applicant.username,
      txResult.tnv_id,
      chosenRole
    );
  } catch (err: any) {
    console.error('Failed to send approval email (non-fatal):', err.message);
  }

  // =========================================================================
  // STEP 9: Return confirmed summary
  // =========================================================================
  return new Response(
    JSON.stringify({
      success: true,
      message: 'Applicant successfully verified and approved',
      profile: {
        id: profileId,
        full_name: applicant.full_name,
        username: applicant.username,
        email: applicant.email,
        status: 'approved',
        role: chosenRole,
        wing_id: wingId,
        tnv_id: txResult.tnv_id,
        total_score: txResult.total_score,
      },
      email_sent: emailSent,
    }),
    { status: 200, headers: corsHeaders }
  );
});

