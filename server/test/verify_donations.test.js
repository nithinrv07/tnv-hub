// Donations audit: access control, verification before receipts, real receipts only,
// campaigns counting verified money, and the beneficiary, field collection, in-kind
// and pledge registers.
//
// Runs the request handler in-process on a free port, in in-memory mode, with its
// snapshot files in a throwaway temp folder.  Run: node server/test/verify_donations.test.js
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const assert = require('assert');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tnv-don-'));
process.env.TMP = tmp;
process.env.TEMP = tmp;
process.env.TMPDIR = tmp;
delete process.env.SUPABASE_URL;
delete process.env.VERCEL;

let passed = 0;
const ok = (cond, label) => { assert.ok(cond, label); passed += 1; console.log(`  ✓ ${label}`); };

let port;
function call(method, url, body, token) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, path: url, method, headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    } }, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const raw = Buffer.concat(chunks);
        let data = {};
        try { data = JSON.parse(raw.toString('utf8')); } catch (_e) { data = { raw }; }
        resolve({ status: res.statusCode, data, raw, type: res.headers['content-type'] });
      });
    });
    req.on('error', reject);
    if (body !== undefined) req.write(JSON.stringify(body));
    req.end();
  });
}

const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
const gift = (over = {}) => ({ amount: 1000, donor_name: 'Lakshmi Narayanan', donor_phone: '9840011111', donor_email: 'lakshmi@example.com', pan_number: 'ABCDE1234F', utr: '412345678901', ...over });

async function run() {
  const handler = require('../server.js');
  const server = http.createServer(handler);
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  port = server.address().port;
  try {
    const admin = await call('POST', '/api/login', { username: 'masteradmin', password: 'AdminPassword2026!' });
    const A = admin.data.session.access_token;
    const member = await call('POST', '/api/register', {
      full_name: 'Ravi Kumar', phone: '9840022222', email: 'ravi.k@example.com', dob: '1994-02-02', gender: 'Male', blood_group: 'O+',
      affiliation: 'Individual', work_study_status: 'Working', company_area: 'Adyar', address: '2 Main Road, Adyar', district_id: 3,
      assembly_constituency: 'Mylapore', pincode: '600020', wing_to_join: 'Management Wing', department: 'Dept', mode_of_work: 'Hybrid',
      past_field_work: ['Fresher'], aadhaarNumber: '789012340001', password: 'secret123', confirm_password: 'secret123', zone: 13, ward: 173
    });
    const M = member.data.session.access_token;

    console.log('Access control');
    for (const [method, url, body] of [
      ['GET', '/api/donations'], ['GET', '/api/beneficiaries'], ['GET', '/api/coordinator-donations'], ['GET', '/api/in-kind-donations'], ['GET', '/api/recurring-pledges'],
      ['POST', '/api/campaigns', { title: 'Hack', target_amount: 5000 }], ['POST', '/api/beneficiaries', { name: 'X', district: 'Y' }],
      ['POST', '/api/in-kind-donations', { item_name: 'Rice', donor_name: 'Z', quantity: 1 }], ['POST', '/api/recurring-pledges', { donor_name: 'Z', amount: 10 }],
      ['POST', '/api/admin/verify-donation', { donation_id: 'x' }]
    ]) {
      const anon = await call(method, url, body);
      const asMember = await call(method, url, body, M);
      ok(anon.status === 403 && asMember.status === 403, `${method} ${url} needs an admin`);
    }

    console.log('Campaigns');
    const draft = await call('POST', '/api/campaigns', { title: 'School bags for Kallakurichi', target_amount: 50000, category: 'Education', status: 'ACTIVE', story: 'short' }, A);
    ok(draft.status === 400 && draft.data.field === 'story', 'An active campaign needs a real description');
    const camp = await call('POST', '/api/campaigns', { title: 'School bags for Kallakurichi', target_amount: 50000, category: 'Education', status: 'ACTIVE', story: 'Two hundred children in Kallakurichi start school without bags. Each bag with books costs ₹250.' }, A);
    ok(camp.status === 201 && camp.data.campaign.raised_amount === 0, 'Admin creates a campaign');
    const campId = camp.data.campaign.id;
    const hidden = await call('POST', '/api/campaigns', { title: 'Draft idea not ready', target_amount: 9000, status: 'DRAFT' }, A);
    const publicList = await call('GET', '/api/campaigns');
    ok(publicList.data.campaigns.some(c => c.id === campId) && !publicList.data.campaigns.some(c => c.id === hidden.data.campaign.id), 'The public sees active campaigns, not drafts');

    console.log('Public donation');
    const noProof = await call('POST', '/api/donations', gift({ utr: '' }));
    ok(noProof.status === 400 && noProof.data.field === 'utr', 'A donation needs a UTR or a screenshot');
    const badPan = await call('POST', '/api/donations', gift({ pan_number: '123' }));
    ok(badPan.status === 400 && badPan.data.field === 'pan_number', 'PAN is checked');
    const d1 = await call('POST', '/api/donations', gift({ campaign_id: campId }));
    ok(d1.status === 201 && d1.data.status === 'pending_verification' && !d1.data.receipt_no && !d1.data.pdf_url, 'A new donation waits for verification, with no receipt yet');
    const dup = await call('POST', '/api/donations', gift({ campaign_id: campId }));
    ok(dup.status === 409, 'The same UTR cannot be used twice');
    const d2 = await call('POST', '/api/donations', gift({ utr: '', screenshot: PNG, donor_name: 'Meena', donor_email: '', is_anonymous: true, donor_phone: '9840033333', pan_number: '' }));
    ok(d2.status === 201, 'A donation with a screenshot is accepted');

    const listed = await call('GET', '/api/donations', undefined, A);
    const one = listed.data.donations.find(d => d.id === d1.data.reference);
    ok(listed.data.donations.length === 2 && !('screenshot' in listed.data.donations[0]) && listed.data.donations.find(d => d.id === d2.data.reference).has_proof, 'Admin list loads, without screenshot images');
    const proof = await call('GET', `/api/admin/donations/${d2.data.reference}/proof`, undefined, A);
    ok(proof.status === 200 && proof.data.screenshot === PNG, 'Admin can open the payment screenshot');
    const before = await call('GET', `/api/campaigns/${campId}`);
    ok(before.data.campaign.raised_amount === 0, 'Unverified money does not count towards the campaign');

    console.log('Verification and receipts');
    const rej = await call('POST', '/api/admin/verify-donation', { donation_id: d2.data.reference, action: 'reject' }, A);
    ok(rej.status === 400, 'Rejecting needs a reason');
    const v1 = await call('POST', '/api/admin/verify-donation', { donation_id: one.id, action: 'verify' }, A);
    const year = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }).slice(0, 4);
    ok(v1.status === 200 && v1.data.receipt_no === `TNV-DON-${year}-0001`, 'Verifying issues the first receipt number of the year');
    const again = await call('POST', '/api/admin/verify-donation', { donation_id: one.id, action: 'verify' }, A);
    ok(again.status === 409, 'A donation is verified only once');
    const v2 = await call('POST', '/api/admin/verify-donation', { donation_id: d2.data.reference, action: 'verify' }, A);
    ok(v2.data.receipt_no === `TNV-DON-${year}-0002`, 'Receipt numbers follow on from the saved records');
    const after = await call('GET', `/api/campaigns/${campId}`);
    ok(after.data.campaign.raised_amount === 1000 && after.data.campaign.donor_count === 1, 'Verified money counts towards the campaign');
    ok(!JSON.stringify(after.data).includes('9840011111') && !JSON.stringify(after.data).includes('412345678901'), 'Campaign donors show no phone or UTR');

    const receiptNo = v1.data.receipt_no;
    const anonPdf = await call('GET', `/api/receipts/${receiptNo}.pdf`);
    ok(anonPdf.status === 403, 'A receipt PDF is not open to anyone with the number');
    const adminPdf = await call('GET', `/api/receipts/${receiptNo}.pdf?t=${A}`);
    ok(adminPdf.status === 200 && adminPdf.raw.slice(0, 4).toString() === '%PDF', 'Admin can open the receipt PDF');
    const mail = await call('GET', '/api/admin/mail/log?kind=donation', undefined, A);
    const link = mail.data.entries[0] && mail.data.entries.find(e => e.meta && e.meta.receipt_no === receiptNo);
    ok(Boolean(link), 'The donor is emailed the receipt');
    const crypto = require('crypto');
    const secret = process.env.AADHAAR_ENCRYPTION_KEY || 'tnv_phase1_super_secret_encryption_key_2026';
    const k = crypto.createHmac('sha256', `${secret}:donation-receipt`).update(receiptNo).digest('hex').slice(0, 16);
    const donorPdf = await call('GET', `/api/receipts/${receiptNo}.pdf?k=${k}`);
    const forged = await call('GET', `/api/receipts/${receiptNo}.pdf?k=0000000000000000`);
    ok(donorPdf.status === 200 && forged.status === 403, 'The signed donor link works; a made-up one does not');
    const fake = await call('GET', `/api/receipts/TNV-DON-${year}-0999.pdf?t=${A}`);
    ok(fake.status === 404, 'No PDF is made for a receipt that does not exist');

    const check = await call('GET', `/api/verify-receipt/${receiptNo}`);
    ok(check.status === 200 && check.data.verified && check.data.receipt.pan_number === 'ABXXXXX34F' && check.data.receipt.donor_phone === '98******11', 'Public receipt check works and masks PAN and phone');
    const fakeCheck = await call('GET', `/api/verify-receipt/TNV-DON-${year}-0999`);
    ok(fakeCheck.status === 404 && fakeCheck.data.verified === false, 'A made-up receipt number is not verified');
    const anonCheck = await call('GET', `/api/verify-receipt/${v2.data.receipt_no}`);
    ok(anonCheck.data.receipt.donor_name === 'Anonymous supporter', 'Anonymous donors stay anonymous');

    const delCamp = await call('DELETE', `/api/campaigns/${campId}`, undefined, A);
    ok(delCamp.status === 409, 'A campaign with donations cannot be deleted');

    const walkIn = await call('POST', '/api/donations', { amount: 5000, donor_name: 'Selvi Traders', donor_phone: '9840044444', payment_channel: 'Cash', confirm_received: true }, A);
    ok(walkIn.status === 201 && walkIn.data.status === 'verified' && walkIn.data.receipt_no === `TNV-DON-${year}-0003`, 'The admin desk can record cash already received, with a receipt');
    const publicConfirm = await call('POST', '/api/donations', gift({ utr: '512345678901', confirm_received: true }));
    ok(publicConfirm.data.status === 'pending_verification', 'The public cannot skip verification');

    const mine = await call('POST', '/api/donations', gift({ utr: '612345678901', donor_phone: '9840022222', donor_email: 'ravi.k@example.com', donor_name: 'Ravi Kumar' }), M);
    const myList = await call('GET', '/api/my-donations', undefined, M);
    ok(mine.status === 201 && myList.data.donations.length === 1 && myList.data.donations[0].status === 'pending_verification' && myList.data.patron_status.total_contributed === 0, 'A member sees their own donation as pending, with nothing made up');

    console.log('Beneficiaries');
    const ben = await call('POST', '/api/beneficiaries', { name: 'Government school, Ulundurpet', district: 'Kallakurichi', category: 'Education', amount_valuation: 0 }, A);
    ok(ben.status === 201 && ben.data.beneficiary.status === 'APPLIED', 'Admin adds a beneficiary');
    const give = await call('PUT', `/api/beneficiaries/${ben.data.beneficiary.id}`, { status: 'AID_DISBURSED' }, A);
    ok(give.status === 400, 'Aid cannot be marked given without an amount');
    const give2 = await call('PUT', `/api/beneficiaries/${ben.data.beneficiary.id}`, { status: 'AID_DISBURSED', amount_valuation: 25000 }, A);
    ok(give2.status === 200 && give2.data.beneficiary.disbursed_by && give2.data.beneficiary.disbursed_at, 'Giving aid records who and when');
    const delBen = await call('DELETE', `/api/beneficiaries/${ben.data.beneficiary.id}`, undefined, A);
    ok(delBen.status === 409, 'A beneficiary who received aid cannot be deleted');

    console.log('Coordinator collections');
    const coord = await call('POST', '/api/coordinator-donations', { coordinator_name: 'K. Arul', district: 'Salem', target_quota: 20000, phone: '9840055555' }, A);
    const cid = coord.data.coordinators[0].id;
    await call('POST', `/api/coordinator-donations/${cid}/collections`, { amount: 3000, donor_count: 6 }, A);
    const twice = await call('POST', `/api/coordinator-donations/${cid}/collections`, { amount: 2000, donor_count: 4 }, A);
    const c1 = twice.data.coordinators[0];
    ok(c1.collected_amount === 5000 && c1.pending_amount === 5000 && c1.remittance_status === 'PENDING_REMITTANCE', 'Collections add up and wait for settlement');
    const wrongAmt = await call('POST', '/api/coordinator-donations/remit', { id: cid, amount: 3000, remittance_mode: 'UPI', reference: '712345678901' }, A);
    ok(wrongAmt.status === 400, 'Settlement must match what is pending');
    const settle = await call('POST', '/api/coordinator-donations/remit', { id: cid, amount: 5000, remittance_mode: 'UPI', reference: '712345678901' }, A);
    ok(settle.status === 200 && settle.data.coordinators[0].pending_amount === 0 && settle.data.coordinators[0].collected_amount === 5000 && settle.data.pending_reconciliation === 0, 'Settling clears the pending amount and keeps the total');

    console.log('In-kind gifts');
    const ink = await call('POST', '/api/in-kind-donations', { item_name: 'Rice bags (25 kg)', quantity: 40, unit: 'bags', estimated_valuation: 48000, donor_name: 'Sri Murugan Stores' }, A);
    ok(ink.status === 201 && ink.data.donation.certificate_no === `TNV-IKC-${year}-0001`, 'In-kind gift gets a certificate number');
    const fwd = await call('PUT', `/api/in-kind-donations/${ink.data.donation.id}`, { status: 'DISTRIBUTED', distributed_to: 'Flood camp, Cuddalore' }, A);
    const back = await call('PUT', `/api/in-kind-donations/${ink.data.donation.id}`, { status: 'RECEIVED' }, A);
    ok(fwd.status === 200 && fwd.data.donation.history.length === 2 && back.status === 409, 'Status only moves forward and keeps a history');

    console.log('Recurring pledges');
    const pl = await call('POST', '/api/recurring-pledges', { donor_name: 'Anitha', donor_phone: '9840066666', amount: 500, frequency: 'MONTHLY', cycle_day: 5 }, A);
    ok(pl.status === 201 && pl.data.pledge.total_contributed === 0 && pl.data.pledge.successful_cycles === 0, 'A new pledge starts with nothing paid (no pretend auto-debit)');
    const due1 = pl.data.pledge.next_due_date;
    const pay = await call('POST', `/api/recurring-pledges/${pl.data.pledge.id}/payments`, { amount: 500, reference: '812345678901' }, A);
    ok(pay.status === 200 && pay.data.pledge.total_contributed === 500 && pay.data.pledge.next_due_date > due1 && pay.data.pledge.next_due_date.endsWith('-05'), 'Recording a payment moves the next due date on a month');
    const payDup = await call('POST', `/api/recurring-pledges/${pl.data.pledge.id}/payments`, { amount: 500, reference: '812345678901' }, A);
    ok(payDup.status === 409, 'A payment reference is recorded once');
    const cancel = await call('POST', `/api/recurring-pledges/${pl.data.pledge.id}/status`, { status: 'CANCELLED' }, A);
    const restart = await call('POST', `/api/recurring-pledges/${pl.data.pledge.id}/toggle`, undefined, A);
    ok(cancel.status === 200 && restart.status === 409, 'A cancelled pledge stays cancelled');

    console.log('Persistence');
    const snapshotFile = fs.readdirSync(tmp, { recursive: true }).some(f => String(f).includes('sync_campaigns'));
    ok(snapshotFile, 'Campaigns are saved to the snapshot store, not just memory');

    console.log(`\nAll ${passed} donation checks passed.`);
  } finally {
    server.close();
  }
}

run().then(() => { fs.rmSync(tmp, { recursive: true, force: true }); process.exit(0); }).catch(err => {
  console.error('\nFAILED:', err.message);
  process.exit(1);
});
