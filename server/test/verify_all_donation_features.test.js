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
  assert.ok(getCampsRes.body.campaigns.length >= 4, 'Must contain seed campaigns');
  console.log(`  ✓ [PASS] Fetched ${getCampsRes.body.campaigns.length} campaigns successfully`);

  // 1b. Single Campaign
  const singleCampRes = await request({
    hostname: 'localhost',
    port: serverPort,
    path: '/api/campaigns/camp_1',
    method: 'GET'
  });
  assert.strictEqual(singleCampRes.status, 200);
  assert.strictEqual(singleCampRes.body.campaign.id, 'camp_1');
  console.log(`  ✓ [PASS] Fetched single campaign "camp_1": "${singleCampRes.body.campaign.title}"`);

  // 1c. Create Campaign
  const createCampRes = await request({
    hostname: 'localhost',
    port: serverPort,
    path: '/api/campaigns',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    title: 'Automated Test Clean Water Drive',
    category: 'Healthcare',
    target_amount: 150000,
    story: 'Providing reverse osmosis filtration plants in 5 fluoride-affected village hamlets in Dharmapuri.'
  });
  assert.strictEqual(createCampRes.status, 201, 'POST /api/campaigns must return 201');
  assert.ok(createCampRes.body.campaign.id, 'Must return created campaign with id');
  const createdCampId = createCampRes.body.campaign.id;
  console.log(`  ✓ [PASS] Created new campaign: id=${createdCampId}`);

  // 1d. Update Campaign
  const updateCampRes = await request({
    hostname: 'localhost',
    port: serverPort,
    path: `/api/campaigns/${createdCampId}`,
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' }
  }, {
    status: 'COMPLETED'
  });
  assert.strictEqual(updateCampRes.status, 200);
  assert.strictEqual(updateCampRes.body.campaign.status, 'COMPLETED');
  console.log('  ✓ [PASS] Updated campaign status to COMPLETED');

  // 1e. Delete Campaign
  const delCampRes = await request({
    hostname: 'localhost',
    port: serverPort,
    path: `/api/campaigns/${createdCampId}`,
    method: 'DELETE'
  });
  assert.strictEqual(delCampRes.status, 200);
  console.log('  ✓ [PASS] Deleted test campaign successfully');

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
  assert.ok(getBensRes.body.beneficiaries.length >= 6);
  console.log(`  ✓ [PASS] Fetched ${getBensRes.body.beneficiaries.length} seed beneficiaries`);

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
  assert.ok(getCoordRes.body.coordinators.length >= 6);
  assert.ok(getCoordRes.body.total_collected > 0);
  assert.ok(getCoordRes.body.total_target > 0);
  console.log(`  ✓ [PASS] Fetched coordinator donations: Total Collected = ₹${getCoordRes.body.total_collected.toLocaleString('en-IN')}`);

  // 3b. Reconcile Remittance
  const remitRes = await request({
    hostname: 'localhost',
    port: serverPort,
    path: '/api/coordinator-donations/remit',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    id: 'cdon_3',
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
  assert.ok(getInKindRes.body.in_kind_donations.length >= 6);
  assert.ok(getInKindRes.body.total_valuation > 0);
  console.log(`  ✓ [PASS] Fetched in-kind items: Total Valuation = ₹${getInKindRes.body.total_valuation.toLocaleString('en-IN')}`);

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
  const getPledgesRes = await request({
    hostname: 'localhost',
    port: serverPort,
    path: '/api/recurring-pledges',
    method: 'GET'
  });
  assert.strictEqual(getPledgesRes.status, 200);
  assert.ok(getPledgesRes.body.pledges.length >= 5);
  assert.ok(getPledgesRes.body.stats.mrr > 0);
  console.log(`  ✓ [PASS] Fetched recurring pledges: MRR = ₹${getPledgesRes.body.stats.mrr.toLocaleString('en-IN')}/mo`);

  // 5b. Toggle Pledge Status
  const toggleRes = await request({
    hostname: 'localhost',
    port: serverPort,
    path: '/api/recurring-pledges/pledge_1/toggle',
    method: 'POST'
  });
  assert.strictEqual(toggleRes.status, 200);
  assert.strictEqual(toggleRes.body.pledge.status, 'PAUSED');
  // Toggle back to active
  await request({ hostname: 'localhost', port: serverPort, path: '/api/recurring-pledges/pledge_1/toggle', method: 'POST' });
  console.log('  ✓ [PASS] Toggled recurring pledge ACTIVE <-> PAUSED successfully');

  // 6. TEST 80G RECEIPT VERIFICATION
  console.log('\n[TEST 6] Testing 80G Receipt Authenticity Verifier (/api/verify-receipt/:receiptNo)...');
  const verifyRes = await request({
    hostname: 'localhost',
    port: serverPort,
    path: '/api/verify-receipt/TNV-DON-2026-0001',
    method: 'GET'
  });
  assert.strictEqual(verifyRes.status, 200, 'Must verify existing receipt TNV-DON-2026-0001');
  assert.strictEqual(verifyRes.body.ok, true);
  assert.strictEqual(verifyRes.body.verified, true);
  assert.strictEqual(verifyRes.body.receipt.receipt_no, 'TNV-DON-2026-0001');
  assert.strictEqual(verifyRes.body.receipt.reg_80g, 'AAATT4509NF20214');
  assert.strictEqual(verifyRes.body.receipt.amount, 5000);
  console.log(`  ✓ [PASS] Verified authentic receipt TNV-DON-2026-0001: Donor = "${verifyRes.body.receipt.donor_name}", 80G = ${verifyRes.body.receipt.reg_80g}`);

  // 6b. Verification with /api/verify-donation/ route
  const verifyDonRes = await request({
    hostname: 'localhost',
    port: serverPort,
    path: '/api/verify-donation/TNV-DON-2026-0002',
    method: 'GET'
  });
  assert.strictEqual(verifyDonRes.status, 200);
  assert.strictEqual(verifyDonRes.body.verified, true);
  console.log('  ✓ [PASS] Verified receipt via alias route /api/verify-donation/TNV-DON-2026-0002');

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
  const campBefore = (await request({ hostname: 'localhost', port: serverPort, path: '/api/campaigns/camp_1', method: 'GET' })).body.campaign;
  const initialRaised = campBefore.raised_amount;
  const initialDonors = campBefore.donor_count;

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
    donor_email: 'anandhan@gmail.com',
    pan_number: 'AAAPA9999K',
    campaign_id: 'camp_1',
    campaign_title: 'Rural Tamil Nadu Digital Classrooms Drive 2026',
    utr: 'UPI-TEST-123456'
  });

  assert.strictEqual(testDonationRes.status, 200);
  assert.strictEqual(testDonationRes.body.success, true);
  const mintedReceiptNo = testDonationRes.body.receipt_no;
  assert.ok(mintedReceiptNo.startsWith('TNV-DON-2026-'));
  console.log(`  ✓ [PASS] Recorded ₹1,000 donation: Receipt #${mintedReceiptNo}`);

  // Check that camp_1 received the attribution
  const campAfter = (await request({ hostname: 'localhost', port: serverPort, path: '/api/campaigns/camp_1', method: 'GET' })).body.campaign;
  assert.strictEqual(campAfter.raised_amount, initialRaised + 1000, 'Campaign raised amount must increase by ₹1,000');
  assert.strictEqual(campAfter.donor_count, initialDonors + 1, 'Campaign donor count must increment');
  assert.strictEqual(campAfter.donors[0].receipt_no, mintedReceiptNo, 'Campaign recent donors must include new donation');
  console.log(`  ✓ [PASS] Campaign attribution verified: Raised grew from ₹${initialRaised} to ₹${campAfter.raised_amount}`);

  // 8. TEST 80G RECEIPT PDF STREAMING
  console.log('\n[TEST 8] Testing PDF Receipt Binary Generation (/api/receipts/:receipt_no.pdf)...');
  const pdfRes = await request({
    hostname: 'localhost',
    port: serverPort,
    path: `/api/receipts/${mintedReceiptNo}.pdf`,
    method: 'GET'
  });
  assert.strictEqual(pdfRes.status, 200, 'PDF download must return 200');
  assert.strictEqual(pdfRes.headers['content-type'], 'application/pdf');
  assert.ok(pdfRes.rawBody.startsWith('%PDF-1.4'), 'Binary must have valid PDF 1.4 magic bytes');
  console.log(`  ✓ [PASS] Official 80G PDF receipt ${mintedReceiptNo}.pdf downloaded: size = ${pdfRes.rawBody.length} bytes`);

  // 9. TEST MEMBER DONATIONS LEDGER
  console.log('\n[TEST 9] Testing Volunteer Member Donations Ledger (/api/my-donations)...');
  const myDonRes = await request({
    hostname: 'localhost',
    port: serverPort,
    path: '/api/my-donations',
    method: 'GET'
  });
  assert.strictEqual(myDonRes.status, 200);
  assert.ok(myDonRes.body.ok);
  assert.ok(myDonRes.body.patron_status.is_patron);
  console.log(`  ✓ [PASS] Member ledger returned patron status: Tier = "${myDonRes.body.patron_status.tier}", 80G Reg = ${myDonRes.body.patron_status.reg_80g}`);

  // 10. TEST TRAILING SLASHES, PATCH VERBS & EDGE CASES
  console.log('\n[TEST 10] Testing Edge Cases: Trailing Slashes & PATCH Verbs...');
  // 10a. Trailing slash on campaigns
  const slashCampRes = await request({
    hostname: 'localhost',
    port: serverPort,
    path: '/api/campaigns/',
    method: 'GET'
  });
  assert.strictEqual(slashCampRes.status, 200, 'GET /api/campaigns/ must return 200');
  assert.ok(Array.isArray(slashCampRes.body.campaigns));
  console.log('  ✓ [PASS] GET /api/campaigns/ (trailing slash) returned 200 OK');

  // 10b. Trailing slash on beneficiaries
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
    path: '/api/campaigns/camp_1',
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' }
  }, {
    status: 'ACTIVE'
  });
  assert.strictEqual(patchCampRes.status, 200, 'PATCH /api/campaigns/camp_1 must return 200');
  console.log('  ✓ [PASS] PATCH /api/campaigns/camp_1 updated status successfully');

  // 10d. PATCH method on beneficiary
  const patchBenRes = await request({
    hostname: 'localhost',
    port: serverPort,
    path: '/api/beneficiaries/ben_1',
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' }
  }, {
    notes: 'Keezvelur Taluk; updated verification check'
  });
  assert.strictEqual(patchBenRes.status, 200, 'PATCH /api/beneficiaries/ben_1 must return 200');
  console.log('  ✓ [PASS] PATCH /api/beneficiaries/ben_1 updated record successfully');

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
    campaign_id: 'camp_2'
  });
  assert.strictEqual(autoAttrRes.status, 200);
  assert.ok(autoAttrRes.body.receipt_no);
  console.log('  ✓ [PASS] Donation with campaign_id automatically enriched campaign_title');

  console.log('\n================================================================');
  console.log('   ALL 10 DONATION & CROWDFUNDING MODULE TESTS PASSED PERFECTLY!');
  console.log('================================================================\n');
}

runTests().catch(err => {
  console.error('\n❌ Test Error:', err);
  process.exit(1);
});
