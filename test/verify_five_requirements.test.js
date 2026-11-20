const assert = require('assert');
const http = require('http');

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request({
      hostname: '127.0.0.1',
      port: 3000,
      path,
      method,
      headers: {
        ...(data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {}),
        ...headers
      }
    }, res => {
      let respData = '';
      res.on('data', chunk => { respData += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(respData || '{}') });
        } catch (_e) {
          resolve({ status: res.statusCode, raw: respData });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function runTests() {
  console.log('--- STARTING 5 REQUIREMENTS VERIFICATION ---');

  // 1. Aadhaar Number & Registration Validation
  console.log('\n[TEST 1] Register with invalid aadhaarNumber (< 12 digits)');
  const testUsername = 'usr_' + Math.floor(100000 + Math.random() * 900000);
  const badAadhaarRes = await request('POST', '/api/register', {
    candidate_name: 'Test Candidate',
    phone: '9876543210',
    username: testUsername,
    password: 'Password123',
    aadhaarNumber: '12345', // Invalid: only 5 digits
    gender: 'Male',
    district_id: 'Chennai',
    wing_id: 'Youth Wing'
  });
  assert.strictEqual(badAadhaarRes.status, 400, 'Should reject invalid aadhaar');
  console.log('✓ Invalid Aadhaar number (< 12 digits) correctly rejected with 400');

  console.log('\n[TEST 2] Register with valid 12-digit aadhaarNumber');
  const goodAadhaarRes = await request('POST', '/api/register', {
    candidate_name: 'Parity Test Candidate',
    full_name: 'Parity Test Candidate',
    email: testUsername + '@example.com',
    phone: '98765' + Math.floor(10000 + Math.random() * 90000),
    username: testUsername,
    password: 'Password123',
    aadhaarNumber: '998877665544',
    gender: 'Male',
    blood_group: 'O+',
    dob: '1995-05-15',
    district_id: 3,
    assembly_constituency: 'Chennai Central',
    panchayat_area: 'Anna Nagar',
    pincode: '625020',
    affiliation_type: 'Individual',
    work_status: 'Working',
    profession: 'Software Engineer',
    company_name: 'Tech Corp',
    company_area: 'Madurai',
    previous_works: 'Active community volunteer in flood relief operations and youth mentorship programs.',
    interest_wing: 'Management Wing',
    interest_department: 'State Coordination',
    willing_field_volunteer: 'Both'
  });
  assert.strictEqual(goodAadhaarRes.status, 201, 'Should accept valid registration with aadhaarNumber: ' + JSON.stringify(goodAadhaarRes.data));
  const newUserId = goodAadhaarRes.data.user?.id || goodAadhaarRes.data.profile?.id;
  assert.ok(newUserId, 'User ID should be returned');
  console.log('✓ Candidate registered successfully with 12-digit aadhaarNumber and reference fields. ID:', newUserId);

  // 2. Unverified Candidate State
  console.log('\n[TEST 3] Candidate Profile State is Pending');
  console.log('Register response:', goodAadhaarRes.data);
  const candidateToken = goodAadhaarRes.data.token || goodAadhaarRes.data.session?.access_token;
  const loginRes = await request('POST', '/api/login', {
    username: testUsername,
    password: 'Password123'
  });
  console.log('Login response:', loginRes);
  const tokenToUse = loginRes.data?.token || candidateToken;
  const profileRes = await request('GET', '/api/my-profile', null, {
    'Authorization': `Bearer ${tokenToUse}`
  });
  assert.strictEqual(profileRes.status, 200, 'Candidate profile fetched');
  assert.strictEqual(profileRes.data.profile.status, 'pending', 'Candidate status must be pending');
  console.log('✓ Unverified candidate correctly holds status: pending');

  // 3. Admin Authentication & Queue
  console.log('\n[TEST 4] Admin Login and Queue Access');
  const adminLoginRes = await request('POST', '/api/login', {
    username: 'masteradmin',
    password: 'AdminPassword2026!'
  });
  assert.strictEqual(adminLoginRes.status, 200, 'Admin login succeeded');
  const adminToken = adminLoginRes.data.token || adminLoginRes.data.session?.access_token;

  const queueRes = await request('GET', '/api/admin/queue', null, {
    'Authorization': `Bearer ${adminToken}`
  });
  assert.strictEqual(queueRes.status, 200, 'Admin queue fetched');
  const queue = queueRes.data.queue || queueRes.data.applicants || [];
  const foundApplicant = queue.find(a => a.id === newUserId || a.username === testUsername);
  assert.ok(foundApplicant, 'Newly registered candidate present in admin review queue');
  console.log('✓ Applicant present in live admin queue');

  // 4. Call Log Module Parity (No Scheduled Callbacks)
  console.log('\n[TEST 5] Call Log Operations with Reference Statuses (No callback_time)');
  const callStatuses = ['Attending', 'Postponed', 'No Answer', 'Not Attending'];
  for (const st of callStatuses) {
    const logRes = await request('POST', '/api/admin/log-call', {
      profile_id: newUserId,
      status: st,
      notes: `Screening test note for ${st}`
    }, {
      'Authorization': `Bearer ${adminToken}`
    });
    assert.strictEqual(logRes.status, 200, `Should log call with status ${st}`);
  }
  console.log('✓ All 4 reference call statuses successfully logged without scheduled callbacks');

  const historyRes = await request('GET', `/api/admin/call-logs?profile_id=${newUserId}`, null, {
    'Authorization': `Bearer ${adminToken}`
  });
  assert.strictEqual(historyRes.status, 200, 'Call logs history retrieved');
  const logs = historyRes.data.logs || historyRes.data.call_logs || [];
  assert.strictEqual(logs.length, 4, 'Should have exactly 4 logged calls for candidate');
  console.log('✓ Call logs timeline correctly contains all 4 logged screening attempts');

  console.log('\n--- ALL VERIFICATIONS PASSED SUCCESSFULLY! ---');
}

runTests().catch(err => {
  console.error('VERIFICATION FAILED:', err);
  process.exit(1);
});
