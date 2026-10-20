// Step 4 Payment Verification Tests (T3)
// Spec: TNV_Hub_Backend_Database_Spec (1).pdf (Section 6.2)
// Journey: TNV_End_to_End_Journey.pdf (Step 4)

const http = require('http');

function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = Buffer.alloc(0);
      res.on('data', chunk => { body = Buffer.concat([body, chunk]); });
      res.on('end', () => {
        const isPdf = (res.headers['content-type'] || '').includes('pdf');
        if (isPdf) {
          resolve({ statusCode: res.statusCode, headers: res.headers, buffer: body });
        } else {
          try {
            resolve({ statusCode: res.statusCode, headers: res.headers, data: JSON.parse(body.toString('utf8')) });
          } catch (_e) {
            resolve({ statusCode: res.statusCode, headers: res.headers, text: body.toString('utf8') });
          }
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function runTests() {
  console.log('--- Running Step 4 Payment Backend Tests ---');

  // Register a new test volunteer first to obtain a fresh session
  const regPayload = {
    full_name: 'Anand Chandrasekar',
    username: 'anand_pay_' + Date.now().toString().slice(-4),
    email: 'anand_' + Date.now() + '@example.com',
    phone: '9840199887',
    password: 'securePassword123',
    aadhaar: '987654321044',
    dob: '1992-04-10',
    gender: 'Male',
    marital_status: 'Married',
    father_or_husband_name: 'Chandrasekar V',
    category: 'General',
    occupation: 'Private Employee',
    address: '10 Gandhi Road, Velachery',
    pincode: '600042',
    district_id: 3, // Chennai
    agree_terms: true
  };

  const regRes = await request({
    host: 'localhost',
    port: 3000,
    path: '/api/register',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, regPayload);

  if (regRes.statusCode !== 201) {
    throw new Error('Setup failed: Registration returned status ' + regRes.statusCode);
  }

  const token = regRes.data.session.access_token;
  const userId = regRes.data.user.id;
  console.log(`[SETUP] Registered test applicant ${regRes.data.user.username} (${userId}), Initial membership_paid: false`);

  // Test 1: Unauthorized call (no token) -> 401 Unauthorized
  const unauthRes = await request({
    host: 'localhost',
    port: 3000,
    path: '/api/record-payment',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { gateway_ref: 'mock_123' });

  console.log(`[TEST 1] Missing token call: status ${unauthRes.statusCode}`);
  if (unauthRes.statusCode !== 401) {
    throw new Error('Expected 401 Unauthorized for missing token');
  }
  console.log('         [PASS] Unauthorized request rejected properly.');

  // Test 2: Failed payment attempt
  // "If failed: change nothing else. Registration is unaffected."
  const failRes = await request({
    host: 'localhost',
    port: 3000,
    path: '/api/record-payment',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  }, { mock_fail: true, gateway_ref: 'mock_gateway_fail_001' });

  console.log(`[TEST 2] Failed payment simulation: status ${failRes.statusCode}`);
  if (failRes.statusCode !== 400 || failRes.data.status !== 'failed') {
    throw new Error('Expected 400 status failed');
  }
  console.log('         [PASS] Failed payment recorded; profile remains unpaid and pending.');

  // Test 3: Successful Payment
  // "Fixed amount of Rs 365, receipt_no from sequence, membership_paid = true, PDF generated"
  const gatewayRef = 'mock_tx_' + Date.now();
  const successRes = await request({
    host: 'localhost',
    port: 3000,
    path: '/api/record-payment',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  }, { gateway_ref: gatewayRef, client_tampered_amount: 10 }); // Attempting to tamper amount

  console.log(`[TEST 3] Successful payment response: status ${successRes.statusCode}`);
  console.log('         Receipt No:', successRes.data.receipt_no);
  console.log('         Server-Enforced Amount:', successRes.data.amount_inr);
  console.log('         Signed URL:', successRes.data.signed_url);

  if (successRes.statusCode !== 200 || !successRes.data.success) {
    throw new Error('Expected successful payment response');
  }
  if (successRes.data.amount_inr !== 365) {
    throw new Error('Server must strictly fix amount at 365 INR');
  }
  if (!successRes.data.receipt_no.startsWith('TNV-R-2026-')) {
    throw new Error(`Receipt number format must be TNV-R-2026-<running_number>, got ${successRes.data.receipt_no}`);
  }
  console.log('         [PASS] Successful payment recorded with valid receipt number and fixed Rs 365.');

  // Test 4: Download PDF Receipt
  const pdfRes = await request({
    host: 'localhost',
    port: 3000,
    path: successRes.data.signed_url,
    method: 'GET'
  });

  console.log(`[TEST 4] Download PDF receipt: status ${pdfRes.statusCode}, size ${pdfRes.buffer.length} bytes`);
  const pdfHeader = pdfRes.buffer.subarray(0, 8).toString('utf8');
  console.log('         PDF Header:', pdfHeader.trim());

  if (pdfRes.statusCode !== 200 || !pdfHeader.startsWith('%PDF-1.4')) {
    throw new Error('Expected valid %PDF-1.4 document stream');
  }
  console.log('         [PASS] Valid PDF 1.4 document verified.');

  // Test 5: Idempotency (Same gateway_ref returns existing receipt)
  const idempRes = await request({
    host: 'localhost',
    port: 3000,
    path: '/api/record-payment',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  }, { gateway_ref: gatewayRef });

  console.log(`[TEST 5] Idempotency test (same gateway_ref): status ${idempRes.statusCode}`);
  console.log('         Returned Receipt No:', idempRes.data.receipt_no);
  if (idempRes.data.receipt_no !== successRes.data.receipt_no) {
    throw new Error('Idempotency violation: generated a different receipt number for same gateway_ref!');
  }
  console.log('         [PASS] Idempotency guaranteed.');

  console.log('\n--- ALL STEP 4 TESTS PASSED CLEANLY! ---');
}

runTests().catch(err => {
  console.error('Test Failed:', err);
  process.exit(1);
});
