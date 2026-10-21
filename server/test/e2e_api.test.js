// Automated E2E verification test against http://localhost:3000
const http = require('http');

function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.status, statusCode: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.status, statusCode: res.statusCode, text: body });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function run() {
  console.log('--- E2E Tests for TNV Phase 1 Server (localhost:3000) ---');

  // Test 1: GET /api/districts (Step 1)
  const distRes = await request({ host: 'localhost', port: 3000, path: '/api/districts', method: 'GET' });
  console.log(`[TEST 1] GET /api/districts: ${distRes.data.districts.length} districts loaded`);
  if (distRes.data.districts.length !== 38) throw new Error('Expected 38 districts');

  // Test 2: GET /api/options (Clean dropdowns)
  const optRes = await request({ host: 'localhost', port: 3000, path: '/api/options', method: 'GET' });
  console.log('[TEST 2] GET /api/options: Categories:', optRes.data.categories.join(', '));
  console.log('         Designations:', optRes.data.designations.join(', '));
  
  // Verify no Hindi in categories
  const hasHindi = optRes.data.categories.some(c => /[\u0900-\u097F]/.test(c));
  if (hasHindi) throw new Error('Hindi detected in categories!');

  // Verify no fees in designations
  const hasFee = optRes.data.designations.some(d => /₹|Fee|शुल्क/.test(d));
  if (hasFee) throw new Error('Fee/money detected in designations!');
  console.log('         [PASS] No Hindi and no fee mentions confirmed.');

  // Test 3: Username Available RPC (Step 2)
  const freshUser = 'unique_vol_' + Date.now().toString().slice(-5);
  const availRes = await request({ host: 'localhost', port: 3000, path: `/api/username-available?u=${freshUser}`, method: 'GET' });
  console.log(`[TEST 3] Fresh username "${freshUser}" availability:`, availRes.data.available);
  if (availRes.data.available !== true) throw new Error(`Expected ${freshUser} to be available`);

  // Test 4: Registration with 11-digit Aadhaar (Step 15 Action 1)
  const badAadhaarPayload = {
    full_name: 'Test Volunteer',
    username: 'test_vol_bad',
    email: 'bad@example.com',
    phone: '9840112233',
    password: 'password123',
    aadhaar: '12345678901', // 11 digits
    dob: '1995-01-01',
    gender: 'Male',
    marital_status: 'Single',
    father_or_husband_name: 'Parent Name',
    category: 'General',
    occupation: 'Student',
    address: 'Sample address',
    district_id: 3,
    agree_terms: true
  };
  const badAadhaarRes = await request({ host: 'localhost', port: 3000, path: '/api/register', method: 'POST', headers: { 'Content-Type': 'application/json' } }, badAadhaarPayload);
  console.log(`[TEST 4] 11-digit Aadhaar submission: status ${badAadhaarRes.statusCode}, error: "${badAadhaarRes.data.error}"`);
  if (badAadhaarRes.statusCode !== 400 || !badAadhaarRes.data.error.includes('12 digits')) {
    throw new Error('Failed to reject 11-digit Aadhaar properly');
  }

  // Test 5: Valid Volunteer Registration (Step 3)
  const uid = Date.now().toString().slice(-5);
  const validPayload = {
    ...badAadhaarPayload,
    username: 'fresh_vol_' + uid,
    email: 'fresh.vol' + uid + '@example.com',
    aadhaar: '98765432' + uid.slice(0, 4), // 12 digits
    preferred_designation: 'Active Member'
  };
  const validRes = await request({ host: 'localhost', port: 3000, path: '/api/register', method: 'POST', headers: { 'Content-Type': 'application/json' } }, validPayload);
  console.log(`[TEST 5] Valid Volunteer Registration: status ${validRes.statusCode}`);
  console.log('         Profile ID:', validRes.data.user.id);
  console.log('         Status:', validRes.data.profile.status);
  console.log('         Masked Aadhaar:', validRes.data.profile.aadhaar_last4);
  console.log('         Session Token:', validRes.data.session.access_token);
  console.log('         Email Sending: Cleanly omitted per client requirement');
  
  if (validRes.statusCode !== 201) throw new Error('Expected HTTP 201 Created');
  if (validRes.data.profile.status !== 'pending') throw new Error('Expected status to be pending');
  if (validRes.data.profile.aadhaar_last4 !== validPayload.aadhaar.slice(-4)) {
    throw new Error(`Expected last4 to be ${validPayload.aadhaar.slice(-4)}, got ${validRes.data.profile.aadhaar_last4}`);
  }
  if (validRes.data.email_sent) throw new Error('Email should not be sent (client requested removal)');

  console.log('\n--- ALL E2E TESTS PASSED SUCCESSFULLY! ---');
}

run().catch(err => {
  console.error('E2E Test Failed:', err);
  process.exit(1);
});
