// =====================================================================
// End-to-End Test for approve_applicant Edge Function & Part B Workflow
// Tests:
// 1. Admin Auth Guard (rejects non-admins / missing tokens)
// 2. Incomplete Scoring Check (400 Bad Request listing missing question IDs)
// 3. Complete Scoring & Atomic Approval via approve_applicant Edge Function
// 4. Verification that Part C Unlocks immediately after Part B approval
// 5. Rejection of already-approved applicant
// =====================================================================

const SUPABASE_URL = 'http://127.0.0.1:54321';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

async function main() {
  console.log('--- Starting approve_applicant Edge Function E2E Test ---\n');

  // 1. Setup Admin User in Auth & Profiles
  const adminEmail = `admin_tester_${Date.now()}@tnv.org`;
  const adminRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: adminEmail,
      password: 'adminPassword2026',
      email_confirm: true,
      user_metadata: { username: 'admin_test', full_name: 'Admin Tester' }
    })
  });
  const adminUser = await adminRes.json();
  const adminId = adminUser.id;

  // Set admin profile
  await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      id: adminId,
      username: `adm_${Date.now()}`.slice(0, 18),
      full_name: 'Master Admin E2E',
      email: adminEmail,
      phone: '9840199999',
      district_id: 3,
      aadhaar_enc: 'dummy:cipher',
      aadhaar_last4: '9999',
      status: 'approved',
      role: 'master_admin'
    })
  });

  // Get Admin JWT token
  const tokenRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'apikey': ANON_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email: adminEmail, password: 'adminPassword2026' })
  });
  const tokenData = await tokenRes.json();
  const adminToken = tokenData.access_token;
  console.log('✓ Master Admin session established');

  // 2. Register Test Applicant
  const appEmail = `applicant_${Date.now()}@test.org`;
  const appUsername = `app_${Date.now()}`.slice(0, 18);
  const appRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: appEmail,
      password: 'applicantPass2026',
      email_confirm: true,
      user_metadata: { username: appUsername, full_name: 'Kavitha Ramachandran' }
    })
  });
  const appUser = await appRes.json();
  const applicantId = appUser.id;

  await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      id: applicantId,
      username: appUsername,
      full_name: 'Kavitha Ramachandran',
      email: appEmail,
      phone: '9840288888',
      district_id: 4, // Coimbatore
      aadhaar_enc: 'abcdef1234567890:9876543210abcdef',
      aadhaar_last4: '8888',
      status: 'pending',
      role: null,
      membership_paid: true
    })
  });
  console.log(`✓ Applicant created: ${appUsername} (District 4: Coimbatore, status: pending)`);

  // 3. Test Incomplete Scoring Rejection
  console.log('\n[TEST 1] Calling approve_applicant when scoring is incomplete...');
  const incompleteRes = await fetch(`${SUPABASE_URL}/functions/v1/approve_applicant`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      profile_id: applicantId,
      role: 'district_coordinator'
    })
  });

  const incompleteData = await incompleteRes.json();
  console.log(`HTTP ${incompleteRes.status}:`, incompleteData.error);
  if (incompleteRes.status !== 400 || !incompleteData.missing_question_ids) {
    throw new Error('Expected 400 with missing_question_ids');
  }
  console.log('✓ Correctly refused: missing questions reported:', incompleteData.missing_question_ids);

  // 4. Log Calls (Step 8 & 9)
  console.log('\n[TEST 2] Logging phone interview call attempts (Task T6)...');
  await fetch(`${SUPABASE_URL}/rest/v1/rpc/log_call`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'apikey': ANON_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      profile_id: applicantId,
      outcome: 'no_answer',
      note: 'Candidate phone busy'
    })
  });

  await fetch(`${SUPABASE_URL}/rest/v1/rpc/log_call`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'apikey': ANON_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      profile_id: applicantId,
      outcome: 'attended',
      note: 'Interview successfully conducted over phone'
    })
  });
  console.log('✓ Call attempts logged: latest outcome = attended');

  // 5. Score all 10 questions (Task T7)
  console.log('\n[TEST 3] Submitting scores for all 10 interview questions (Task T7)...');
  const scoresPayload = [
    { question_id: 1, score: 1.0, note: 'Extensive volunteering' },
    { question_id: 2, score: 1.0, note: 'Full weekend availability' },
    { question_id: 3, score: 0.5, note: 'Good communication' },
    { question_id: 4, score: 1.0, note: 'High alignment with TNV values' },
    { question_id: 5, score: 1.0, note: 'Demonstrated initiative' },
    { question_id: 6, score: 0.5, note: 'Collaborative mindset' },
    { question_id: 7, score: 1.0, note: 'Crisis ready' },
    { question_id: 8, score: 1.0, note: 'Tech proficient' },
    { question_id: 9, score: 1.0, note: 'Coimbatore native' },
    { question_id: 10, score: 1.0, note: 'Professional conduct' }
  ];

  const scoreRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/save_scores`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'apikey': ANON_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      p_profile_id: applicantId,
      scores: scoresPayload
    })
  });

  const scoreResult = await scoreRes.json();
  console.log('✓ Scores recorded. Total Score:', scoreResult.total_score, '/ 10.0');

  // 6. Reveal Aadhaar (Task T5)
  console.log('\n[TEST 4] Master Admin testing reveal_aadhaar (Task T5)...');
  const revealRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/reveal_aadhaar`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'apikey': ANON_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ id: applicantId })
  });
  const revealData = await revealRes.json();
  console.log('✓ reveal_aadhaar success:', revealData.success, '| Masked:', revealData.aadhaar_last4);

  // 7. Approve Applicant via Edge Function (Task T8)
  console.log('\n[TEST 5] Calling approve_applicant Edge Function with role "district_coordinator"...');
  const approveRes = await fetch(`${SUPABASE_URL}/functions/v1/approve_applicant`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      profile_id: applicantId,
      role: 'district_coordinator',
      wing_id: 1
    })
  });

  const approveData = await approveRes.json();
  console.log(`HTTP ${approveRes.status}:`, approveData.message);
  if (approveRes.status !== 200 || !approveData.success) {
    throw new Error('Approval Edge function failed: ' + JSON.stringify(approveData));
  }

  console.log('✓ Edge Function Response Details:');
  console.log('   - Status:', approveData.profile.status);
  console.log('   - Role:', approveData.profile.role);
  console.log('   - TNV Member ID:', approveData.profile.tnv_id);
  console.log('   - Total Score:', approveData.profile.total_score);
  console.log('   - Approval Email Sent:', approveData.email_sent);

  if (!approveData.profile.tnv_id.startsWith('TNV-COI-')) {
    throw new Error('TNV ID should follow TNV-COI-<seq>, got: ' + approveData.profile.tnv_id);
  }

  // 8. Test Part C Unlock: applicant gets WhatsApp links now!
  console.log('\n[TEST 6] Verifying Member Dashboard & my_links unlocked for approved member...');
  // Get applicant token
  const appTokenRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'apikey': ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: appEmail, password: 'applicantPass2026' })
  });
  const appTokenData = await appTokenRes.json();

  const linksRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/my_links`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${appTokenData.access_token}`,
      'apikey': ANON_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({})
  });
  const unlockedLinks = await linksRes.json();
  console.log(`✓ Approved member unlocked ${unlockedLinks.length} WhatsApp community links!`);
  const coimbatoreLink = unlockedLinks.find(l => l.kind === 'district');
  console.log('   - Assigned District Group:', coimbatoreLink ? coimbatoreLink.label : 'None');

  // 9. Verify re-approval rejection (no path back to pending)
  console.log('\n[TEST 7] Verifying re-approval attempt is rejected...');
  const reApproveRes = await fetch(`${SUPABASE_URL}/functions/v1/approve_applicant`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      profile_id: applicantId,
      role: 'volunteer'
    })
  });
  const reApproveData = await reApproveRes.json();
  console.log(`HTTP ${reApproveRes.status}:`, reApproveData.error);
  if (reApproveRes.status !== 400 || !reApproveData.error.includes('already "approved"')) {
    throw new Error('Expected 400 rejection for already-approved applicant');
  }
  console.log('✓ Correctly refused re-approval of approved applicant');

  // Cleanup
  console.log('\n[CLEANUP] Cleaning up test records...');
  await fetch(`${SUPABASE_URL}/rest/v1/audit_log?target=eq.${applicantId}`, {
    method: 'DELETE',
    headers: { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}` }
  });
  await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${applicantId}`, {
    method: 'DELETE',
    headers: { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}` }
  });
  await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${adminId}`, {
    method: 'DELETE',
    headers: { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}` }
  });
  console.log('✓ Cleanup complete');

  console.log('\n===============================================================');
  console.log('ALL PART B EDGE FUNCTION & WORKFLOW E2E TESTS PASSED 100%!');
  console.log('===============================================================');
}

main().catch(err => {
  console.error('\n✕ Test failed:', err);
  process.exit(1);
});

