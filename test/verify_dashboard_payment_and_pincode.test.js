const http = require('http');
const assert = require('assert');

console.log('===============================================================');
console.log('   TESTING PINCODE VALIDATION & DASHBOARD PAYMENT SYNC');
console.log('===============================================================');

function request(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(data) });
        } catch (_e) {
          resolve({ status: res.statusCode, headers: res.headers, rawBody: data });
        }
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function runTests() {
  const testId = Date.now().toString().slice(-6);

  // -------------------------------------------------------------------------
  // TEST 1: Pincode Must Only Be Numbers (Validation Tests)
  // -------------------------------------------------------------------------
  console.log('\n[TEST 1] Testing Pincode validation...');

  const baseVolunteer = {
    full_name: 'Pincode Test User',
    username: `pintest_${testId}`,
    email: `pintest_${testId}@example.com`,
    phone: '9840112233',
    password: 'password123',
    confirm_password: 'password123',
    aadhaar: '998877665544',
    district_id: 3,
    category: 'Individual',
    work_study_status: 'Employed',
    company_area: 'Guindy',
    blood_group: 'O+',
    occupation: 'Software Engineer',
    address: '10 Anna Salai',
    wing_to_join: 'Management Wing — Governance, Systems & Organizational Support',
    department: '1. Administration & Human Resources Department',
    mode_of_work: 'Offline / On-Field',
    previous_experience: 'Nil',
    previous_works: 'Nil'
  };

  // 1A: Non-numeric pincode should fail
  const resAlpha = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/register',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { ...baseVolunteer, username: `pintest_a_${testId}`, email: `pintest_a_${testId}@example.com`, pincode: '60003A' });

  assert.strictEqual(resAlpha.status, 400, 'Non-numeric pincode must return 400 Bad Request');
  assert(resAlpha.body.error.includes('PIN code must contain exactly 6 digits (numbers only)'), 'Error message must state numbers only');
  console.log('  ✓ [PASS] Non-numeric pincode "60003A" strictly rejected with 400');

  // 1B: Pincode too short (5 digits) should fail
  const resShort = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/register',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { ...baseVolunteer, username: `pintest_b_${testId}`, email: `pintest_b_${testId}@example.com`, pincode: '60003' });

  assert.strictEqual(resShort.status, 400, 'Pincode with 5 digits must return 400 Bad Request');
  console.log('  ✓ [PASS] Short pincode "60003" strictly rejected with 400');

  // 1C: Pincode too long (7 digits) should fail
  const resLong = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/register',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { ...baseVolunteer, username: `pintest_c_${testId}`, email: `pintest_c_${testId}@example.com`, pincode: '6000321' });

  assert.strictEqual(resLong.status, 400, 'Pincode with 7 digits must return 400 Bad Request');
  console.log('  ✓ [PASS] Long pincode "6000321" strictly rejected with 400');

  // -------------------------------------------------------------------------
  // TEST 2: Registration With Payment -> User Dashboard MUST Show Paid
  // -------------------------------------------------------------------------
  console.log('\n[TEST 2] Testing Registration with "Pay Now" payment option...');

  const paidUsername = `paiduser_${testId}`;
  const paidEmail = `paiduser_${testId}@example.com`;
  const gatewayRef = `UPI-REF-${testId}-9988`;

  const regPaidRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/register',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    ...baseVolunteer,
    username: paidUsername,
    email: paidEmail,
    pincode: '600032', // valid 6-digit numeric pincode
    payment_choice: 'pay_now',
    gateway_ref: gatewayRef
  });

  assert.strictEqual(regPaidRes.status, 201, 'Registration must succeed');
  assert.strictEqual(regPaidRes.body.profile.membership_paid, true, 'Registered profile must have membership_paid: true');
  assert(regPaidRes.body.profile.receipt_no, 'Registered profile must contain receipt_no');
  const receiptNo = regPaidRes.body.profile.receipt_no;
  const token = regPaidRes.body.session.access_token;
  console.log(`  ✓ [PASS] Registration with Pay Now succeeded: membership_paid = true, receipt_no = ${receiptNo}`);

  // -------------------------------------------------------------------------
  // TEST 3: User Dashboard (/api/my-profile) MUST Show Paid and Receipt Number
  // -------------------------------------------------------------------------
  console.log('\n[TEST 3] Verifying /api/my-profile for authenticated Dashboard...');

  const profileRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/my-profile',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  assert.strictEqual(profileRes.status, 200, 'Dashboard profile fetch must succeed');
  assert.strictEqual(profileRes.body.profile.membership_paid, true, 'Dashboard profile membership_paid MUST be true');
  assert.strictEqual(profileRes.body.profile.receipt_no, receiptNo, 'Dashboard profile receipt_no must match generated receipt');
  console.log(`  ✓ [PASS] User Dashboard profile reflects: membership_paid = true, receipt_no = ${profileRes.body.profile.receipt_no}`);

  // -------------------------------------------------------------------------
  // TEST 4: Signing in via /api/login also returns membership_paid: true
  // -------------------------------------------------------------------------
  console.log('\n[TEST 4] Verifying /api/login preserves paid status...');

  const loginRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    username: paidUsername,
    password: 'password123'
  });

  assert.strictEqual(loginRes.status, 200, 'Login must succeed');
  assert.strictEqual(loginRes.body.profile.membership_paid, true, 'Login profile must have membership_paid: true');
  assert.strictEqual(loginRes.body.profile.receipt_no, receiptNo, 'Login profile must have receipt_no');
  console.log('  ✓ [PASS] User login successfully returned membership_paid = true with receipt number');

  // -------------------------------------------------------------------------
  // TEST 5: Verify Receipt PDF can be downloaded
  // -------------------------------------------------------------------------
  console.log('\n[TEST 5] Verifying official receipt PDF download...');

  const pdfRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: `/api/receipts/${receiptNo}.pdf`,
    method: 'GET'
  });

  assert.strictEqual(pdfRes.status, 200, 'Receipt PDF must be downloadable');
  assert(pdfRes.headers['content-type'].includes('application/pdf'), 'Content-Type must be application/pdf');
  console.log(`  ✓ [PASS] Receipt PDF ${receiptNo}.pdf is available and valid`);

  // -------------------------------------------------------------------------
  // TEST 6: User who Skips Payment -> then Pays from Dashboard
  // -------------------------------------------------------------------------
  console.log('\n[TEST 6] Testing user who skips payment, then pays from Dashboard...');

  const skipUsername = `skipuser_${testId}`;
  const regSkipRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/register',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    ...baseVolunteer,
    username: skipUsername,
    email: `skipuser_${testId}@example.com`,
    pincode: '600042',
    payment_choice: 'skip'
  });

  assert.strictEqual(regSkipRes.status, 201, 'Skipped registration must succeed');
  assert.strictEqual(regSkipRes.body.profile.membership_paid, false, 'Skipped registration profile must be unpaid');
  const skipToken = regSkipRes.body.session.access_token;
  console.log('  ✓ [PASS] Skipped user initially created as unpaid');

  // User pays later via /api/record-payment
  const dashPayRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/record-payment',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${skipToken}`
    }
  }, {
    gateway_ref: `DASH_PAY_${testId}`
  });

  assert.strictEqual(dashPayRes.status, 200, 'Dashboard payment recording must succeed');
  assert.strictEqual(dashPayRes.body.status, 'paid');
  const dashReceiptNo = dashPayRes.body.receipt_no;
  console.log(`  ✓ [PASS] Dashboard payment recorded: receipt = ${dashReceiptNo}`);

  // Subsequent profile fetch must show paid
  const profileAfterPay = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/my-profile',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${skipToken}` }
  });

  assert.strictEqual(profileAfterPay.body.profile.membership_paid, true, 'Profile must transition to paid');
  assert.strictEqual(profileAfterPay.body.profile.receipt_no, dashReceiptNo, 'Profile must have the new receipt_no');
  console.log('  ✓ [PASS] Dashboard profile successfully transitioned to PAID (₹365) with receipt!');

  console.log('\n===============================================================');
  console.log('   ALL 6 TESTS PASSED 100%! BOTH REQUIREMENTS VERIFIED!');
  console.log('===============================================================');
}

runTests().catch(err => {
  console.error('\n❌ Test Failure:', err);
  process.exit(1);
});
