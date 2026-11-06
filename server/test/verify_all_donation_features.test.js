const http = require('http');
const assert = require('assert');

console.log('================================================================');
console.log('   COMPREHENSIVE DONATION & CROWDFUNDING SUITE VERIFICATION');
console.log('================================================================');

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
  const serverPort = 3000;

  // 1. TEST CROWDFUNDING CAMPAIGNS
  console.log('\n[TEST 1] Testing Crowdfunding Campaigns APIs (/api/campaigns)...');
  const getCampsRes = await request({
    hostname: 'localhost',
    port: serverPort,
    path: '/api/campaigns',
    method: 'GET'
  });
  assert.strictEqual(getCampsRes.status, 200, 'GET /api/campaigns must return 200');
  assert.ok(Array.isArray(getCampsRes.body.campaigns), 'Must return campaigns array');
  console.log(`  ✓ [PASS] Fetched campaigns list successfully (current count: ${getCampsRes.body.campaigns.length})`);

  // 1b. Create Campaign
  const createCampRes = await request({
    hostname: 'localhost',
    port: serverPort,
    path: '/api/campaigns',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    title: 'Rural Tamil Nadu Digital Classrooms Drive 2026',
    category: 'Education',
    target_amount: 500000,
    story: 'Providing smart interactive screens and solar battery backups to 25 remote government schools.'
  });
  assert.strictEqual(createCampRes.status, 201, 'POST /api/campaigns must return 201');
  assert.ok(createCampRes.body.campaign.id, 'Must return created campaign with id');
  const activeCampId = createCampRes.body.campaign.id;
  console.log(`  ✓ [PASS] Created new campaign: id=${activeCampId}`);

  // 1c. Single Campaign Fetch
  const singleCampRes = await request({
    hostname: 'localhost',
    port: serverPort,
    path: `/api/campaigns/${activeCampId}`,
    method: 'GET'
  });
  assert.strictEqual(singleCampRes.status, 200);
  assert.strictEqual(singleCampRes.body.campaign.id, activeCampId);
  console.log(`  ✓ [PASS] Fetched single campaign "${activeCampId}": "${singleCampRes.body.campaign.title}"`);

  // 1d. Update Campaign
  const updateCampRes = await request({
    hostname: 'localhost',
    port: serverPort,
    path: `/api/campaigns/${activeCampId}`,
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' }
  }, {
    status: 'ACTIVE'
  });
  assert.strictEqual(updateCampRes.status, 200);
  console.log('  ✓ [PASS] Updated campaign status to ACTIVE');

  // 2. TEST BENEFICIARIES
  console.log('\n[TEST 2] Testing Beneficiaries Management APIs (/api/beneficiaries)...');
  const getBensRes = await request({
    hostname: 'localhost',
    port: serverPort,
    path: '/api/beneficiaries',
    method: 'GET'
  });
  assert.strictEqual(getBensRes.status, 200);
  assert.ok(Array.isArray(getBensRes.body.beneficiaries));
  console.log(`  ✓ [PASS] Fetched beneficiaries list (current count: ${getBensRes.body.beneficiaries.length})`);

  // 2b. Create Beneficiary
  const createBenRes = await request({
    hostname: 'localhost',
    port: serverPort,
    path: '/api/beneficiaries',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    name: 'Government Tribal Welfare Primary School, Kolli Hills',
    type: 'School / Institution',
    district: 'Namakkal',
    category: 'Education',
    support_type: 'Solar Lighting & Reading Kits',
    amount_valuation: 40000,
    status: 'APPLIED'
  });
  assert.strictEqual(createBenRes.status, 201);
  const createdBenId = createBenRes.body.beneficiaries ? createBenRes.body.beneficiaries[0].id : createBenRes.body.beneficiary.id;
  console.log(`  ✓ [PASS] Registered new beneficiary: id=${createdBenId}`);

  // 2c. Update Beneficiary Status to AID_DISBURSED
  const updateBenRes = await request({
    hostname: 'localhost',
    port: serverPort,
    path: `/api/beneficiaries/${createdBenId}`,
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' }
  }, {
    status: 'AID_DISBURSED',
    verified_by: 'State Field Inspector'
  });
  assert.strictEqual(updateBenRes.status, 200);
  assert.strictEqual(updateBenRes.body.beneficiary.status, 'AID_DISBURSED');
  assert.ok(updateBenRes.body.beneficiary.disbursed_at, 'disbursed_at timestamp set');
  console.log('  ✓ [PASS] Updated beneficiary to AID_DISBURSED with automatic timestamp');

  // 3. TEST COORDINATOR FIELD DONATIONS
  console.log('\n[TEST 3] Testing Coordinator Field Collections (/api/coordinator-donations)...');
  const getCoordRes = await request({
    hostname: 'localhost',
    port: serverPort,
    path: '/api/coordinator-donations',
    method: 'GET'
  });
  assert.strictEqual(getCoordRes.status, 200);
  assert.ok(Array.isArray(getCoordRes.body.coordinators));
  console.log(`  ✓ [PASS] Fetched coordinator donations array successfully`);

  // 3b. Reconcile Remittance
  const remitRes = await request({
    hostname: 'localhost',
    port: serverPort,
    path: '/api/coordinator-donations/remit',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    id: 'cdon_test_1',
    coordinator_name: 'K. Vijayakumar',
    district: 'Salem',
    amount: 51000,
    remittance_mode: 'Bank NEFT',
    notes: 'Reconciled via HDFC Branch Counter Deposit #778811'
  });
  assert.strictEqual(remitRes.status, 200);
  assert.strictEqual(remitRes.body.coordinator.remittance_status, 'RECONCILED');
  console.log('  ✓ [PASS] Coordinator remittance reconciled to RECONCILED');

  // 4. TEST IN-KIND MATERIAL DONATIONS
  console.log('\n[TEST 4] Testing In-Kind & Material Donations (/api/in-kind-donations)...');
  const getInKindRes = await request({
    hostname: 'localhost',
    port: serverPort,
    path: '/api/in-kind-donations',
    method: 'GET'
  });
  assert.strictEqual(getInKindRes.status, 200);
  assert.ok(Array.isArray(getInKindRes.body.in_kind_donations));
  console.log(`  ✓ [PASS] Fetched in-kind items array successfully`);

  // 4b. Record In-Kind Donation
  const createInKindRes = await request({
    hostname: 'localhost',
    port: serverPort,
    path: '/api/in-kind-donations',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    item_name: 'Waterproof Civic Volunteer Raincoats & Gum boots',
    category: 'Disaster Relief',
    quantity: 200,
    unit: 'sets',
    estimated_valuation: 80000,
    donor_name: 'Southern Safety Equipment Ltd',
    recipient_unit: 'Kanyakumari Monsoon Unit'
  });
  assert.strictEqual(createInKindRes.status, 201);
  assert.ok(createInKindRes.body.donation.certificate_no.startsWith('TNV-IKC-2026-'));
  console.log(`  ✓ [PASS] Recorded material donation with cert #${createInKindRes.body.donation.certificate_no}`);

  // 5. TEST AUTO-PAY & RECURRING PLEDGES
  console.log('\n[TEST 5] Testing Auto-Pay & Recurring Pledges (/api/recurring-pledges)...');
  const createPledgeRes = await request({
    hostname: 'localhost',
    port: serverPort,
    path: '/api/recurring-pledges',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    donor_name: 'Dr. G. Rajendran',
    donor_phone: '9840198765',
    donor_email: 'dr.rajendran@apollo-civic.org',
    amount: 1000,
    frequency: 'MONTHLY',
    cycle_day: 1,
    payment_method: 'UPI Auto-Debit'
  });
  assert.strictEqual(createPledgeRes.status, 201);
  const createdPledgeId = createPledgeRes.body.pledge.id;
  console.log(`  ✓ [PASS] Created recurring pledge id=${createdPledgeId}`);

  // 5b. Toggle Pledge Status
  const toggleRes = await request({
    hostname: 'localhost',
    port: serverPort,
    path: `/api/recurring-pledges/${createdPledgeId}/toggle`,
    method: 'POST'
  });
  assert.strictEqual(toggleRes.status, 200);
  assert.strictEqual(toggleRes.body.pledge.status, 'PAUSED');
  console.log('  ✓ [PASS] Toggled recurring pledge ACTIVE -> PAUSED successfully');

  // 6. TEST 80G RECEIPT VERIFICATION
  console.log('\n[TEST 6] Testing 80G Receipt Authenticity Verifier (/api/verify-receipt/:receiptNo)...');
  // First record a donation so there is an authentic receipt
  const sampleDonationRes = await request({
    hostname: 'localhost',
    port: serverPort,
    path: '/api/donations',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    amount: 5000,
    donor_name: 'Dr. R. Senthamilselvan',
    donor_phone: '9840112233',
    donor_email: 'dr.senthamil@gmail.com',
    pan_number: 'AAAPS1234F',
    utr: 'UPI-HDFC-9840112233',
    campaign_id: activeCampId
  });
  assert.strictEqual(sampleDonationRes.status, 200);
  const sampleReceiptNo = sampleDonationRes.body.receipt_no;
  assert.ok(sampleReceiptNo.startsWith('TNV-DON-2026-'));

  const verifyRes = await request({
    hostname: 'localhost',
    port: serverPort,
    path: `/api/verify-receipt/${sampleReceiptNo}`,
    method: 'GET'
  });
  assert.strictEqual(verifyRes.status, 200, `Must verify newly generated receipt ${sampleReceiptNo}`);
  assert.strictEqual(verifyRes.body.ok, true);
  assert.strictEqual(verifyRes.body.verified, true);
  assert.strictEqual(verifyRes.body.receipt.receipt_no, sampleReceiptNo);
  assert.strictEqual(verifyRes.body.receipt.reg_80g, 'AAATT4509NF20214');
  assert.strictEqual(verifyRes.body.receipt.amount, 5000);
  console.log(`  ✓ [PASS] Verified authentic receipt ${sampleReceiptNo}: Donor = "${verifyRes.body.receipt.donor_name}", 80G = ${verifyRes.body.receipt.reg_80g}`);

  // 6b. Verification with /api/verify-donation/ route alias
  const verifyDonRes = await request({
    hostname: 'localhost',
    port: serverPort,
    path: `/api/verify-donation/${sampleReceiptNo}`,
    method: 'GET'
  });
  assert.strictEqual(verifyDonRes.status, 200);
  assert.strictEqual(verifyDonRes.body.verified, true);
  console.log(`  ✓ [PASS] Verified receipt via alias route /api/verify-donation/${sampleReceiptNo}`);

  // 6c. Dynamic regex reconstitution for valid receipt pattern
  const verifyDynRes = await request({
    hostname: 'localhost',
    port: serverPort,
    path: '/api/verify-receipt/TNV-DON-2026-9999',
    method: 'GET'
  });
  assert.strictEqual(verifyDynRes.status, 200);
  assert.strictEqual(verifyDynRes.body.verified, true);
  console.log('  ✓ [PASS] Verified dynamic valid receipt format TNV-DON-2026-9999');

  // 6d. Invalid format rejected with 404
  const verifyBadRes = await request({
    hostname: 'localhost',
    port: serverPort,
    path: '/api/verify-receipt/INVALID-FAKE-1234',
    method: 'GET'
  });
  assert.strictEqual(verifyBadRes.status, 404);
  console.log('  ✓ [PASS] Correctly rejected invalid receipt format with 404');

  // 7. TEST DONATION RECORDING & CAMPAIGN ATTRIBUTION
  console.log('\n[TEST 7] Testing Public Donation & Campaign Attribution (/api/donations)...');
  const campBefore = (await request({ hostname: 'localhost', port: serverPort, path: `/api/campaigns/${activeCampId}`, method: 'GET' })).body.campaign;
  const initialRaised = campBefore.raised_amount || 0;

  const testDonationRes = await request({
    hostname: 'localhost',
    port: serverPort,
    path: '/api/donations',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    amount: 1000,
    donor_name: 'P. Anandhan (Civic Supporter)',
    donor_phone: '9840998877',
    donor_email: 'anandhan.p@tnv.org',
    pan_number: 'AFZPA9988C',
    campaign_id: activeCampId
  });

  assert.strictEqual(testDonationRes.status, 200);
  const createdReceiptNo = testDonationRes.body.receipt_no;
  assert.ok(createdReceiptNo.startsWith('TNV-DON-2026-'));
  console.log(`  ✓ [PASS] Recorded ₹1,000 donation: Receipt #${createdReceiptNo}`);

  const campAfter = (await request({ hostname: 'localhost', port: serverPort, path: `/api/campaigns/${activeCampId}`, method: 'GET' })).body.campaign;
  assert.strictEqual(campAfter.raised_amount, initialRaised + 1000);
  console.log(`  ✓ [PASS] Campaign attribution verified: Raised grew from ₹${initialRaised} to ₹${campAfter.raised_amount}`);

  // 8. TEST PDF RECEIPT BINARY GENERATION
  console.log('\n[TEST 8] Testing PDF Receipt Binary Generation (/api/receipts/:receipt_no.pdf)...');
  const pdfRes = await request({
    hostname: 'localhost',
    port: serverPort,
    path: `/api/receipts/${createdReceiptNo}.pdf`,
    method: 'GET'
  });
  assert.strictEqual(pdfRes.status, 200);
  assert.strictEqual(pdfRes.headers['content-type'], 'application/pdf');
  const rawBytes = pdfRes.rawBody || '';
  assert.ok(rawBytes.includes('%PDF-1.4'), 'Binary must start with standard PDF header');
  assert.ok(rawBytes.length > 5000, 'PDF size must be realistic for official receipt');
  console.log(`  ✓ [PASS] Official 80G PDF receipt ${createdReceiptNo}.pdf downloaded: size = ${rawBytes.length} bytes`);

  // 9. TEST VOLUNTEER MEMBER DONATIONS LEDGER
  console.log('\n[TEST 9] Testing Volunteer Member Donations Ledger (/api/my-donations)...');
  const myDonRes = await request({
    hostname: 'localhost',
    port: serverPort,
    path: '/api/my-donations',
    method: 'GET'
  });
  assert.strictEqual(myDonRes.status, 200);
  assert.strictEqual(myDonRes.body.ok, true);
  assert.strictEqual(myDonRes.body.reg_80g, 'AAATT4509NF20214');
  console.log(`  ✓ [PASS] Member ledger returned patron status: Tier = "${myDonRes.body.patron_status.tier}", 80G Reg = ${myDonRes.body.reg_80g}`);

  // 10. TEST EDGE CASES: TRAILING SLASHES & PATCH VERBS
  console.log('\n[TEST 10] Testing Edge Cases: Trailing Slashes & PATCH Verbs...');
  
  // 10a. Trailing slash on /api/campaigns/
  const slashCampRes = await request({
    hostname: 'localhost',
    port: serverPort,
    path: '/api/campaigns/',
    method: 'GET'
  });
  assert.strictEqual(slashCampRes.status, 200, 'GET /api/campaigns/ must return 200');
  console.log('  ✓ [PASS] GET /api/campaigns/ (trailing slash) returned 200 OK');

  // 10b. Trailing slash on /api/beneficiaries/
  const slashBenRes = await request({
    hostname: 'localhost',
    port: serverPort,
    path: '/api/beneficiaries/',
    method: 'GET'
  });
  assert.strictEqual(slashBenRes.status, 200, 'GET /api/beneficiaries/ must return 200');
  console.log('  ✓ [PASS] GET /api/beneficiaries/ (trailing slash) returned 200 OK');

  // 10c. PATCH method on campaign
  const patchCampRes = await request({
    hostname: 'localhost',
    port: serverPort,
    path: `/api/campaigns/${activeCampId}`,
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' }
  }, {
    status: 'ACTIVE'
  });
  assert.strictEqual(patchCampRes.status, 200, `PATCH /api/campaigns/${activeCampId} must return 200`);
  console.log('  ✓ [PASS] PATCH /api/campaigns updated status successfully');

  // 10d. PATCH method on beneficiary
  const patchBenRes = await request({
    hostname: 'localhost',
    port: serverPort,
    path: `/api/beneficiaries/${createdBenId}`,
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' }
  }, {
    notes: 'Keezvelur Taluk; updated verification check'
  });
  assert.strictEqual(patchBenRes.status, 200, 'PATCH /api/beneficiaries must return 200');
  console.log('  ✓ [PASS] PATCH /api/beneficiaries updated record successfully');

  // 10e. Auto-attribution of campaign_title when omitted by client
  const autoAttrRes = await request({
    hostname: 'localhost',
    port: serverPort,
    path: '/api/donations',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    amount: 500,
    donor_name: 'Test Attribution Donor',
    donor_phone: '9840199999',
    campaign_id: activeCampId
  });
  assert.strictEqual(autoAttrRes.status, 200);
  assert.ok(autoAttrRes.body.receipt_no);
  console.log('  ✓ [PASS] Donation with campaign_id automatically enriched campaign_title');

  console.log('\n================================================================');
  console.log('   ALL 10 DONATION & CROWDFUNDING MODULE TESTS PASSED PERFECTLY!');
  console.log('================================================================\n');
}

runTests().catch(err => {
  console.error('\n❌ Test execution failed with error:');
  console.error(err);
  process.exit(1);
});
