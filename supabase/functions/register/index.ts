/**
 * TNV Hub Portal - Edge Function: register
 * Spec: TNV_Hub_Backend_Database_Spec (1).pdf (Section 6.1)
 * Journey: TNV_End_to_End_Journey.pdf (Part A, Step 3)
 * 
 * Rules:
 * - Public endpoint (no login required)
 * - Validates input; rejects with clear message on first error, creates nothing
 * - Rejects duplicate username or email with field-level name
 * - Creates user in Supabase Auth with chosen password
 * - Encrypts Aadhaar via AES-256-GCM; stores cipher and last4; plain number never saved
 * - Inserts profile (status = 'pending', role = null, membership_paid = false)
 * - Inserts notifications row (kind = 'new_registration')
 * - Sends welcome email with username and login link (NO password)
 * - Returns active session so applicant is logged in immediately
 * - If failure after Auth user creation, deletes Auth user (clean rollback)
 */

import { getServiceClient, getAnonClient } from '../_shared/supabaseClient.ts';
import { validateRegistrationInput } from '../_shared/validation.ts';
import { validateDistrictExists } from '../_shared/districts.ts';
import { encryptAadhaar } from '../_shared/crypto.ts';
import { RegisterInput } from '../_shared/types.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

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

  let body: Partial<RegisterInput>;
  try {
    body = await req.json();
  } catch (_e) {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON request body' }),
      { status: 400, headers: corsHeaders }
    );
  }

  // =========================================================================
  // STEP 1: Validate input
  // =========================================================================
  const validation = validateRegistrationInput(body);
  if (!validation.valid) {
    return new Response(
      JSON.stringify({ error: validation.error, field: validation.field }),
      { status: 400, headers: corsHeaders }
    );
  }

  const cleanPhone = (body.phone || '').replace(/[\s-]/g, '');
  const cleanAadhaar = (body.aadhaar || '').replace(/[\s-]/g, '');
  const username = body.username!.trim();
  const email = body.email!.trim().toLowerCase();

  const supabaseAdmin = getServiceClient();

  // Validate District exists in database
  const districtExists = await validateDistrictExists(supabaseAdmin, body.district_id!);
  if (!districtExists) {
    return new Response(
      JSON.stringify({ error: 'Selected district does not exist', field: 'district_id' }),
      { status: 400, headers: corsHeaders }
    );
  }

  // =========================================================================
  // STEP 2: Check duplicates (username, email)
  // =========================================================================
  const { data: existingUsername } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .ilike('username', username)
    .maybeSingle();

  if (existingUsername) {
    return new Response(
      JSON.stringify({ error: 'Username is already taken', field: 'username' }),
      { status: 409, headers: corsHeaders }
    );
  }

  const { data: existingEmail } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .ilike('email', email)
    .maybeSingle();

  if (existingEmail) {
    return new Response(
      JSON.stringify({ error: 'Email is already registered', field: 'email' }),
      { status: 409, headers: corsHeaders }
    );
  }

  let createdAuthUserId: string | null = null;

  try {
    // =========================================================================
    // STEP 3: Create Auth user
    // =========================================================================
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: body.password!,
      email_confirm: true,
      user_metadata: {
        username: username,
        full_name: body.full_name!.trim(),
      },
    });

    if (authError || !authData?.user) {
      if (authError?.message?.toLowerCase().includes('already registered')) {
        return new Response(
          JSON.stringify({ error: 'Email is already registered in authentication', field: 'email' }),
          { status: 409, headers: corsHeaders }
        );
      }
      return new Response(
        JSON.stringify({ error: `Auth registration failed: ${authError?.message}` }),
        { status: 400, headers: corsHeaders }
      );
    }

    createdAuthUserId = authData.user.id;

    // =========================================================================
    // STEP 4: Encrypt Aadhaar (AES-256-GCM)
    // =========================================================================
    const { aadhaar_enc, aadhaar_last4 } = await encryptAadhaar(cleanAadhaar);

    // =========================================================================
    // STEP 5: Insert Profile
    // =========================================================================
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: createdAuthUserId,
        username: username,
        full_name: body.full_name!.trim(),
        email: email,
        phone: cleanPhone,
        address: body.address!.trim(),
        district_id: body.district_id!,
        aadhaar_enc: aadhaar_enc,
        aadhaar_last4: aadhaar_last4,
        status: 'pending',
        role: null,
        membership_paid: false,
        dob: body.dob || null,
        gender: body.gender || null,
        marital_status: body.marital_status || null,
        father_or_husband_name: body.father_or_husband_name || null,
        category: body.category || body.affiliation || null,
        affiliation: body.affiliation || body.category || null,
        organization_name: body.organization_name || null,
        work_study_status: body.work_study_status || null,
        employer_name: body.employer_name || null,
        blood_group: body.blood_group || null,
        occupation: body.occupation || null,
        assembly_constituency: body.assembly_constituency || null,
        panchayat: body.panchayat || null,
        wing_to_join: body.wing_to_join || null,
        department: body.department || null,
        mode_of_work: body.mode_of_work || null,
        previous_experience: body.previous_experience || null,
        past_field_work: body.past_field_work || [],
        pincode: body.pincode || null,
        preferred_designation: body.preferred_designation || null,
        photo_path: body.photo_path || null,
      })
      .select('id, username, full_name, email, phone, district_id, category, affiliation, organization_name, work_study_status, employer_name, occupation, assembly_constituency, panchayat, wing_to_join, department, mode_of_work, previous_experience, past_field_work, aadhaar_last4, status, membership_paid, photo_path, created_at')
      .single();

    if (profileError || !profile) {
      throw new Error(`Failed to create profile: ${profileError?.message}`);
    }

    // =========================================================================
    // STEP 6: Insert Admin Notification
    // =========================================================================
    const { error: notifError } = await supabaseAdmin
      .from('notifications')
      .insert({
        kind: 'new_registration',
        profile_id: createdAuthUserId,
        read: false,
      });

    if (notifError) {
      console.error('Failed to create admin notification:', notifError.message);
      // Non-fatal, keep going
    }

    // Note: Email dispatch omitted per client requirement (no emails sent).

    // =========================================================================
    // STEP 8: Return session
    // =========================================================================
    let session = null;
    try {
      const anonClient = getAnonClient();
      const { data: sessionData } = await anonClient.auth.signInWithPassword({
        email: email,
        password: body.password!,
      });
      session = sessionData?.session || null;
    } catch (sessionErr: any) {
      console.error('Auto-login session generation error:', sessionErr.message);
    }

    return new Response(
      JSON.stringify({
        message: 'Registration successful. Application is under review.',
        user: {
          id: createdAuthUserId,
          email: email,
          username: username,
        },
        session: session,
        profile: profile,
      }),
      { status: 201, headers: corsHeaders }
    );

  } catch (error: any) {
    // =========================================================================
    // Failure handling: Clean rollback
    // If any step fails after auth user creation, delete auth user
    // =========================================================================
    if (createdAuthUserId) {
      console.warn(`Rolling back auth user ${createdAuthUserId} due to error:`, error.message);
      await supabaseAdmin.auth.admin.deleteUser(createdAuthUserId).catch((e: any) => {
        console.error('Failed to delete auth user during rollback:', e.message);
      });
    }

    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error during registration' }),
      { status: 500, headers: corsHeaders }
    );
  }
});
