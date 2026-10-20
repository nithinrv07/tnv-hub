// Step 5 Applicant Dashboard & Security Guard Tests (T4 & T5)
// Spec: TNV_Hub_Backend_Database_Spec (1).pdf (Section 5, 7, 8)
// Journey: TNV_End_to_End_Journey.pdf (Step 5 & Step 6)

const http = require('http');

function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        try {
          resolve({ statusCode: res.statusCode, data: JSON.parse(body) });
        } catch (_e) {
          resolve({ statusCode: res.statusCode, text: body });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function runStep5Tests() {
  console.log('--- Running Step 5 Applicant Dashboard & Security Guard Tests ---');

  // Test 1: Register an applicant who skips payment
  const uid = Date.now().toString().slice(-4);
  const regPayload = {
    full_name: 'Kavitha Ramasamy',
    username: 'kavitha_' + uid,
    email: 'kavitha_' + uid + '@example.com',
    phone: '9840112233',
    password: 'password2026',
    aadhaar: '98765432' + uid,
    dob: '1998-07-20',
    gender: 'Female',
    marital_status: 'Single',
    father_or_husband_name: 'Ramasamy M',
    category: 'OBC',
    occupation: 'Teacher / Professor',
    address: '22 Gandhi Road, Salem',
    pincode: '636007',
    district_id: 23, // Salem
    agree_terms: true
  };

  const regRes = await request({
    host: 'localhost',
    port: 3000,
    path: '/api/register',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, regPayload);

  if (regRes.statusCode !== 201) throw new Error('Registration failed');
  const sessionToken = regRes.data.session.access_token;
  console.log(`[SETUP] Registered applicant @${regPayload.username}`);

  // Test 2: Step 6 Login with Username & Password
  const loginRes = await request({
    host: 'localhost',
    port: 3000,
    path: '/api/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { username: regPayload.username, password: regPayload.password });

  console.log(`[TEST 2A] Login with valid credentials: status ${loginRes.statusCode}`);
  if (loginRes.statusCode !== 200 || !loginRes.data.session.access_token) {
    throw new Error('Login failed with valid credentials');
  }

  // Generic error test for wrong password
  const badLoginRes = await request({
    host: 'localhost',
    port: 3000,
    path: '/api/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { username: regPayload.username, password: 'wrongPassword' });

  console.log(`[TEST 2B] Login with wrong password: status ${badLoginRes.statusCode}, error: "${badLoginRes.data.error}"`);
  if (badLoginRes.statusCode !== 401 || !badLoginRes.data.error.includes('Invalid')) {
    throw new Error('Generic error rule violated');
  }
  console.log('         [PASS] Step 6 Username + Password authentication verified.');

  // Test 3: Load Dashboard Profile (Status is pending)
  const profileRes = await request({
    host: 'localhost',
    port: 3000,
    path: '/api/my-profile',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${sessionToken}` }
  });

  console.log(`[TEST 3] GET /api/my-profile: status ${profileRes.statusCode}`);
  console.log('         Status:', profileRes.data.profile.status);
  console.log('         Role:', profileRes.data.profile.role);
  console.log('         Membership Paid:', profileRes.data.profile.membership_paid);

  if (profileRes.data.profile.status !== 'pending') throw new Error('Status must be pending');
  if (profileRes.data.profile.role !== null) throw new Error('Role must be null until approved');
  if (profileRes.data.profile.membership_paid !== false) throw new Error('Membership must be unpaid');
  console.log('         [PASS] Applicant dashboard status strictly "pending" / Under Review.');

  // Test 4: my_links() RPC call for pending applicant (MUST RETURN ZERO ROWS)
  const linksRes = await request({
    host: 'localhost',
    port: 3000,
    path: '/api/my-links',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${sessionToken}` }
  });

  console.log(`[TEST 4] GET /api/my-links for pending user: returned ${linksRes.data.links.length} rows`);
  if (linksRes.data.links.length !== 0) {
    throw new Error(`Security Violation: Expected 0 rows for pending applicant, got ${linksRes.data.links.length}`);
  }
  console.log('         [PASS] WhatsApp community links return zero rows while status is pending.');

  // Test 5: ID card & Appointment letter access for pending applicant (MUST BE 403 REFUSED)
  const docsRes = await request({
    host: 'localhost',
    port: 3000,
    path: '/api/member-documents',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${sessionToken}` }
  });

  console.log(`[TEST 5] GET /api/member-documents for pending user: status ${docsRes.statusCode}`);
  if (docsRes.statusCode !== 403) {
    throw new Error('Expected 403 Forbidden for member documents while pending');
  }
  console.log('         [PASS] ID card and appointment letter are locked until approved.');

  // Test 6: Direct /admin page / queue access as applicant (MUST BE 403 REFUSED)
  const adminRes = await request({
    host: 'localhost',
    port: 3000,
    path: '/api/admin/queue',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${sessionToken}` }
  });

  console.log(`[TEST 6] GET /api/admin/queue as applicant: status ${adminRes.statusCode}`);
  if (adminRes.statusCode !== 403) {
    throw new Error('Expected 403 Forbidden for applicant attempting admin queue access');
  }
  console.log('         [PASS] Admin portal access strictly refused for applicants.');

  // Test 7: Pay now from dashboard (Step 4 sequence starting from 0001)
  const payRes = await request({
    host: 'localhost',
    port: 3000,
    path: '/api/record-payment',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${sessionToken}`
    }
  }, { gateway_ref: `UPI-TEST-${uid}` });

  console.log(`[TEST 7] Pay from dashboard: status ${payRes.statusCode}, Receipt: ${payRes.data.receipt_no}`);
  if (!payRes.data.receipt_no.startsWith('TNV-R-2026-')) {
    throw new Error('Invalid receipt number format');
  }
  console.log('         [PASS] Payment recorded from dashboard and sequence continues smoothly.');

  console.log('\n--- ALL STEP 5 DASHBOARD TESTS PASSED CLEANLY! ---');
}

runStep5Tests().catch(err => {
  console.error('Test Failed:', err);
  process.exit(1);
});
