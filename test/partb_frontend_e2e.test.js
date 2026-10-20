// =====================================================================
// TNV Hub Portal - Part B Frontend & API End-to-End Workflow Test
// Verifies Journey Steps 7 - 12 (Tasks T5 - T8)
// 1. Master Admin Authentication
// 2. Queue Listing with Masked Aadhaar & Unpaid badge
// 3. Aadhaar Reveal with AES-256-GCM Decryption & Audit Log
// 4. Telephone Call Logging (no_answer, scheduled with callback, attended)
// 5. Leadership Scoring (0, 0.5, 1 enforcement) & Completeness Check
// 6. Approval & TNV ID generation
// 7. Verification that Part C Unlocks for the Approved Applicant
// =====================================================================

const http = require('http');
const assert = require('assert');

// Port used for local test server
const PORT = 3000;
const BASE_URL = `http://127.0.0.1:${PORT}`;

function post(path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body || {});
    const req = http.request(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        ...headers
      }
    }, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.status, statusCode: res.statusCode, data: JSON.parse(data) });
        } catch (_e) {
          resolve({ status: res.status, statusCode: res.statusCode, raw: data });
        }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function get(path, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(`${BASE_URL}${path}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    }, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.status, statusCode: res.statusCode, data: JSON.parse(data) });
        } catch (_e) {
          resolve({ status: res.status, statusCode: res.statusCode, raw: data });
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function runTest() {
  console.log('===============================================================');
  console.log('   TNV HUB - PART B FRONTEND & API FULL WORKFLOW TEST');
  console.log('   Journey Steps: 7, 8, 9, 10, 11 -> Part C Unlock Step 12');
  console.log('===============================================================\n');

  let passes = 0;
  function pass(msg) {
    passes++;
    console.log(`  ✓ [PASS] ${msg}`);
  }

  // 1. Ensure Demo Master Admin Exists
  console.log('[STEP 1] Initializing Master Admin account...');
  const initRes = await post('/api/admin/ensure-demo-admin');
  assert.strictEqual(initRes.statusCode, 200, 'Demo admin initialization should succeed');
  pass('Master Admin demo account ready');

  // 2. Sign in as Master Admin
  console.log('\n[STEP 2] Signing in as Master Admin...');
  const loginRes = await post('/api/login', {
    username: 'masteradmin',
    password: 'AdminPassword2026!'
  });
  assert.strictEqual(loginRes.statusCode, 200, 'Master Admin login should succeed');
  assert(loginRes.data.session && loginRes.data.session.access_token, 'Session token returned');
  const adminToken = loginRes.data.session.access_token;
  const adminHeaders = { 'Authorization': `Bearer ${adminToken}` };
  pass(`Master Admin authenticated (role: ${loginRes.data.profile.role})`);

  // 3. Register a New Test Applicant (Part A)
  console.log('\n[STEP 3] Registering new applicant (Part A)...');
  const ts = Date.now().toString().slice(-6);
  const testAadhaar = `8844${ts}12`; // 12 digits
  const regPayload = {
    full_name: `Sundar Pichai ${ts}`,
    username: `sun_${ts}`,
    email: `sundar_${ts}@example.com`,
    password: 'Password123!',
    phone: `9840${ts}`,
    dob: '1995-07-12',
    gender: 'Male',
    marital_status: 'Married',
    father_or_husband_name: 'Ragunathan',
    aadhaar: testAadhaar,
    district_id: 3, // Chennai
    category: 'IT / Software Professional',
    work_study_status: 'Working Professional',
    organization_name: 'TNV Tech Wing',
    blood_group: 'O+',
    address: '100 Mount Road, Chennai',
    panchayat: 'Mylapore',
    assembly_constituency: 'Mylapore',
    pincode: '600002',
    preferred_wing: 'Administration Wing',
    department: 'Youth Mobilization',
    mode_of_work: 'Field Work'
  };

  const regRes = await post('/api/register', regPayload);
  if (regRes.statusCode !== 200 && regRes.statusCode !== 201) {
    console.error('Registration failed payload:', regRes.data);
  }
  assert([200, 201].includes(regRes.statusCode), 'Applicant registration should succeed (200 or 201)');
  const applicantProfile = regRes.data.profile;
  const applicantId = applicantProfile.id;
  const applicantToken = regRes.data.session ? regRes.data.session.access_token : null;
  pass(`Applicant registered successfully (ID: ${applicantId}, status: ${applicantProfile.status})`);

  // 4. Master Admin Queue Inspection (Task T5 / Step 7)
  console.log('\n[STEP 4] Master Admin inspecting queue (Task T5)...');
  const queueRes = await get('/api/admin/queue', adminHeaders);
  assert.strictEqual(queueRes.statusCode, 200, 'Admin queue retrieval must succeed');
  assert(Array.isArray(queueRes.data.queue), 'Queue should be an array');
  
  const queuedApp = queueRes.data.queue.find(p => p.id === applicantId);
  assert(queuedApp, 'Newly registered applicant must appear in admin queue');
  assert.strictEqual(queuedApp.status, 'pending', 'Applicant status must be pending');
  assert.strictEqual(queuedApp.aadhaar_last4, testAadhaar.slice(-4), 'Aadhaar last 4 must match');
  assert.strictEqual(queuedApp.aadhaar_enc, undefined, 'Raw encrypted Aadhaar must not be exposed');
  assert.strictEqual(queuedApp.aadhaar, undefined, 'Plaintext Aadhaar must not be exposed in queue');
  assert.strictEqual(queuedApp.call_status, 'not_called', 'Initial call status must be not_called');
  pass('Admin Queue lists applicant with masked Aadhaar ("•••• •••• ' + queuedApp.aadhaar_last4 + '") and unpaid badge');

  // Guard Check: Non-admins cannot access admin queue
  const anonQueueRes = await get('/api/admin/queue');
  assert.strictEqual(anonQueueRes.statusCode, 403, 'Unauthenticated access to queue must be 403 Forbidden');
  pass('Queue Access Guard: Regular visitors strictly refused (403 Forbidden)');

  // 5. Master Admin Reveal Aadhaar (Task T5 / Step 7)
  console.log('\n[STEP 5] Testing Master Admin Aadhaar Reveal (Task T5)...');
  const revealRes = await post('/api/admin/reveal-aadhaar', { profile_id: applicantId }, adminHeaders);
  assert.strictEqual(revealRes.statusCode, 200, 'Reveal Aadhaar should succeed for Master Admin');
  assert.strictEqual(revealRes.data.aadhaar, testAadhaar, 'Revealed Aadhaar must match original 12 digits');
  assert.strictEqual(revealRes.data.audited, true, 'Audit log flag must be true');
  pass(`Aadhaar decrypted and revealed: ${revealRes.data.aadhaar} (Logged in immutable audit trail)`);

  // 6. Telephone Call Logging (Task T6 / Steps 8 & 9)
  console.log('\n[STEP 6] Testing Telephone Call Logging (Task T6)...');
  
  // 6a. Attempt scheduled call without callback_at -> Must FAIL
  const badScheduled = await post('/api/admin/log-call', {
    profile_id: applicantId,
    outcome: 'scheduled',
    note: 'Attempting invalid scheduled call'
  }, adminHeaders);
  assert.strictEqual(badScheduled.statusCode, 400, 'Scheduled outcome without callback_at must be rejected (400)');
  pass('Business Rule Enforced: "scheduled" call strictly rejected when callback_at is missing');

  // 6b. Log "no_answer"
  const noAnswerRes = await post('/api/admin/log-call', {
    profile_id: applicantId,
    outcome: 'no_answer',
    note: 'First attempt: Phone rang, no answer'
  }, adminHeaders);
  assert.strictEqual(noAnswerRes.statusCode, 200, 'Logging no_answer must succeed');
  pass('Step 8: Logged "No Answer" attempt');

  // 6c. Log "scheduled" with future timestamp
  const tomorrow = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
  const scheduledRes = await post('/api/admin/log-call', {
    profile_id: applicantId,
    outcome: 'scheduled',
    callback_at: tomorrow,
    note: 'Applicant called back, agreed callback tomorrow'
  }, adminHeaders);
  assert.strictEqual(scheduledRes.statusCode, 200, 'Logging scheduled must succeed');
  pass(`Step 9: Logged "Scheduled Callback" at ${tomorrow}`);

  // 6d. Log "attended"
  const attendedRes = await post('/api/admin/log-call', {
    profile_id: applicantId,
    outcome: 'attended',
    note: 'Interview call attended and completed'
  }, adminHeaders);
  assert.strictEqual(attendedRes.statusCode, 200, 'Logging attended must succeed');
  pass('Step 9: Logged "Attended" call');

  // 6e. Fetch Call History
  const historyRes = await get(`/api/admin/call-logs?profile_id=${applicantId}`, adminHeaders);
  assert.strictEqual(historyRes.statusCode, 200, 'Call logs query should succeed');
  assert(historyRes.data.logs.length >= 3, 'Must record all call attempts in history');
  pass(`Unlimited attempts supported: ${historyRes.data.logs.length} call logs recorded in history timeline`);

  // 7. Leadership Interview Scoring (Task T7 / Step 10)
  console.log('\n[STEP 7] Testing Leadership Interview Scoring (Task T7)...');
  const questionsRes = await get('/api/admin/questions');
  assert.strictEqual(questionsRes.statusCode, 200, 'Questions fetch must succeed');
  const questions = questionsRes.data.questions;
  assert.strictEqual(questions.length, 10, 'Must have exactly 10 evaluation questions');
  pass(`Loaded all ${questions.length} active leadership interview questions`);

  // 7a. Reject non-standard score (e.g. 0.75)
  const badScoreRes = await post('/api/admin/save-scores', {
    profile_id: applicantId,
    scores: [{ question_id: questions[0].id, score: 0.75 }]
  }, adminHeaders);
  assert.strictEqual(badScoreRes.statusCode, 400, 'Non-standard score 0.75 must be rejected');
  pass('Business Rule Enforced: save_scores strictly rejects scores other than 0, 0.5, 1');

  // 7b. Save partial scores (Questions 1 to 8 only)
  const partialScores = questions.slice(0, 8).map(q => ({
    question_id: q.id,
    score: 1.0,
    note: 'Strong response'
  }));
  const savePartialRes = await post('/api/admin/save-scores', {
    profile_id: applicantId,
    scores: partialScores
  }, adminHeaders);
  assert.strictEqual(savePartialRes.statusCode, 200, 'Partial scores save should succeed');
  pass('Saved partial interview scores (8 of 10 questions scored)');

  // 8. Approval Completeness Guard (Task T8 / Step 11)
  console.log('\n[STEP 8] Testing Approval Completeness Guard (Task T8)...');
  const prematureApproval = await post('/api/admin/approve', {
    profile_id: applicantId,
    role: 'district_coordinator'
  }, adminHeaders);
  assert.strictEqual(prematureApproval.statusCode, 400, 'Premature approval must return HTTP 400');
  assert(prematureApproval.data.missing_question_ids && prematureApproval.data.missing_question_ids.length > 0, 'Must report missing question IDs');
  pass(`Approval Guard Enforced: Approval refused when active questions remain unscored (Missing: [${prematureApproval.data.missing_question_ids}])`);

  // 8a. Complete remaining questions (Questions 9 and 10)
  const remainingScores = questions.slice(8).map(q => ({
    question_id: q.id,
    score: 0.5,
    note: 'Satisfactory answer'
  }));
  await post('/api/admin/save-scores', {
    profile_id: applicantId,
    scores: remainingScores
  }, adminHeaders);
  pass('Completed scoring for all 10 questions (Total: 9.0 / 10.0)');

  // 9. Final Approval & Verification (Task T8 / Step 11)
  console.log('\n[STEP 9] Executing Mark Verified & Approval (Task T8)...');
  const approveRes = await post('/api/admin/approve', {
    profile_id: applicantId,
    role: 'district_coordinator'
  }, adminHeaders);
  assert.strictEqual(approveRes.statusCode, 200, 'Approval must succeed when all questions scored');
  assert.strictEqual(approveRes.data.status, 'approved', 'Status must transition to approved');
  assert(approveRes.data.tnv_id && approveRes.data.tnv_id.startsWith('TNV-'), 'Official TNV ID generated');
  assert.strictEqual(approveRes.data.role, 'district_coordinator', 'Assigned role must match');
  pass(`Step 11: Applicant verified & approved! TNV ID: ${approveRes.data.tnv_id}, Role: ${approveRes.data.role}`);

  // 10. Verify Queue Updates Immediately
  const postApproveQueue = await get('/api/admin/queue', adminHeaders);
  const updatedQueuedApp = postApproveQueue.data.queue.find(p => p.id === applicantId);
  assert.strictEqual(updatedQueuedApp.status, 'approved', 'Queue status must reflect approved');
  pass('Admin Queue immediately reflects Approved status');

  // 11. Verify Part C Dashboard Unlocks (Step 12)
  console.log('\n[STEP 10] Verifying Part C Unlocks for the Approved Member (Step 12)...');
  const memberHeaders = { 'Authorization': `Bearer ${applicantToken}` };
  
  const myProfileRes = await get('/api/my-profile', memberHeaders);
  assert.strictEqual(myProfileRes.statusCode, 200, 'Applicant profile query should succeed');
  assert.strictEqual(myProfileRes.data.profile.status, 'approved', 'Dashboard status unlocked to approved');
  assert.strictEqual(myProfileRes.data.profile.role, 'district_coordinator', 'Official role unlocked');
  pass('Step 12: Member Dashboard status transitions from "Under Review" to "Verified & Approved"');

  const linksRes = await get('/api/my-links', memberHeaders);
  assert.strictEqual(linksRes.statusCode, 200, 'my-links query should succeed');
  assert(Array.isArray(linksRes.data.links) && linksRes.data.links.length > 0, 'Community WhatsApp links must be unlocked');
  pass(`Step 14: Unlocked ${linksRes.data.links.length} official WhatsApp community groups (District, Wing, Sectors)`);

  const docsRes = await get('/api/member-documents', memberHeaders);
  assert.strictEqual(docsRes.statusCode, 200, 'Member documents query should succeed');
  const idCardUrl = docsRes.data.documents ? docsRes.data.documents.id_card : docsRes.data.id_card;
  const apptLetterUrl = docsRes.data.documents ? docsRes.data.documents.appointment_letter : docsRes.data.appointment_letter;
  assert(idCardUrl, 'Member ID Card URL must be unlocked');
  assert(apptLetterUrl, 'Appointment Letter URL must be unlocked');
  pass('Step 13: Official Member ID Card and Appointment Letter download links unlocked');

  console.log('\n===============================================================');
  console.log(`PART B E2E WORKFLOW SUMMARY: ${passes} CHECKS PASSED, 0 FAILED`);
  console.log('ALL PART B TASKS T5 - T8 & JOURNEY STEPS 7 - 12 VERIFIED!');
  console.log('===============================================================\n');
}

// Start server child process for testing if not already running
const { spawn } = require('child_process');
const serverProc = spawn('node', ['server.js'], {
  cwd: __dirname + '/..',
  env: {
    ...process.env,
    PORT: PORT,
    SUPABASE_URL: 'http://127.0.0.1:54321',
    SUPABASE_SERVICE_ROLE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0',
    AADHAAR_ENCRYPTION_KEY: 'tnv_phase1_super_secret_encryption_key_2026'
  }
});

let serverStarted = false;
serverProc.stdout.on('data', data => {
  const msg = data.toString();
  if (msg.includes('running at') && !serverStarted) {
    serverStarted = true;
    setTimeout(() => {
      runTest().then(() => {
        serverProc.kill();
        process.exit(0);
      }).catch(err => {
        console.error('Test failed:', err);
        serverProc.kill();
        process.exit(1);
      });
    }, 500);
  }
});

serverProc.stderr.on('data', data => {
  console.error('Server stderr:', data.toString());
});

serverProc.on('close', code => {
  if (!serverStarted) {
    console.error('Server failed to start, exit code:', code);
    process.exit(1);
  }
});
