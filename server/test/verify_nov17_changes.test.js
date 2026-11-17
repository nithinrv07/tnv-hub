// November changes: members outside Tamil Nadu and abroad, TNV Club registration,
// "willing to lead", NGO sign-in email fixed to the organisation email, who approved
// a member and when, payment decisions that can be changed with a remark, admin
// access by constituency, and the member panel's document links.
//
// Runs the request handler in-process on a free port, in in-memory mode, with its
// snapshot files in a throwaway temp folder.  Run: node server/test/verify_nov17_changes.test.js
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const assert = require('assert');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tnv-nov17-'));
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
        resolve({ status: res.statusCode, data, raw });
      });
    });
    req.on('error', reject);
    if (body !== undefined) req.write(JSON.stringify(body));
    req.end();
  });
}

const LOGO = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
const base = (o = {}) => ({
  full_name: 'Test Member', phone: '9840070001', email: 't1@example.com', dob: '1996-01-01', gender: 'Female', blood_group: 'B+',
  affiliation: 'Individual', work_study_status: 'Working', company_area: 'Adyar', address: '5 Main Road, Adyar', district_id: 3,
  assembly_constituency: 'Mylapore', pincode: '600020', wing_to_join: 'Management Wing', department: 'Dept', mode_of_work: 'Hybrid',
  past_field_work: ['Fresher'], aadhaarNumber: '567890120001', password: 'secret123', confirm_password: 'secret123', zone: 13, ward: 173,
  willing_to_lead: 'yes', ...o
});

async function run() {
  const handler = require('../server.js');
  const server = http.createServer(handler);
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  port = server.address().port;
  try {
    const admin = await call('POST', '/api/login', { username: 'masteradmin', password: 'AdminPassword2026!' });
    const A = admin.data.session.access_token;
    const queue = async () => (await call('GET', '/api/admin/queue', undefined, A)).data.queue || [];

    console.log('Registration outside Tamil Nadu');
    const abroadNoPassport = await call('POST', '/api/register', base({ residency: 'abroad', email: 'a1@example.com', phone: '+971501234567', country: 'United Arab Emirates', pincode: '00000', aadhaarNumber: '' }));
    ok(abroadNoPassport.status === 400 && abroadNoPassport.data.field === 'passport_number', 'Someone abroad gives a passport, not Aadhaar');
    const abroadIndianPhone = await call('POST', '/api/register', base({ residency: 'abroad', email: 'a2@example.com', phone: '9840070002', country: 'Singapore', passport_number: 'K1234567', pincode: '018989' }));
    ok(abroadIndianPhone.status === 400 && abroadIndianPhone.data.field === 'phone', 'Someone abroad gives a number with the country code');
    const abroad = await call('POST', '/api/register', base({ residency: 'abroad', email: 'a3@example.com', phone: '+65 9123 4567', country: 'Singapore', nationality: 'Indian', city: 'Singapore', passport_number: 'k1234567', pincode: '018989', aadhaarNumber: '' }));
    ok(abroad.status === 201 && abroad.data.profile.aadhaar_last4 === '4567', 'An overseas volunteer registers with a passport');
    const otherState = await call('POST', '/api/register', base({ residency: 'india', email: 'k1@example.com', phone: '9840070003', aadhaarNumber: '567890120003', state: 'Karnataka', home_district: 'Bengaluru Urban', city: 'Bengaluru', pincode: '560001', district_id: 4, assembly_constituency: '', zone: '', ward: '' }));
    ok(otherState.status === 201, 'A volunteer from another state registers');
    const noState = await call('POST', '/api/register', base({ residency: 'india', email: 'k2@example.com', phone: '9840070004', aadhaarNumber: '567890120004', district_id: 4, zone: '', ward: '' }));
    ok(noState.status === 400 && noState.data.field === 'state', 'Another state needs the state');
    const club = await call('POST', '/api/register', base({ registration_type: 'club', email: 'c1@example.com', phone: '9840070005', aadhaarNumber: '567890120005', willing_to_lead: 'no' }));
    ok(club.status === 201, 'A TNV Club member registers with the volunteer form');
    const q1 = await queue();
    const rowAbroad = q1.find(r => r.email === 'a3@example.com');
    const rowState = q1.find(r => r.email === 'k1@example.com');
    const rowClub = q1.find(r => r.email === 'c1@example.com');
    ok(rowAbroad.residency === 'abroad' && rowAbroad.id_type === 'passport' && rowAbroad.country === 'Singapore', 'Admins see where an overseas volunteer lives and which ID they gave');
    ok(rowState.residency === 'india' && rowState.state === 'Karnataka' && rowState.home_district === 'Bengaluru Urban', 'Admins see the state and district of a volunteer from another state');
    ok(rowClub.registration_type === 'club' && rowClub.willing_to_lead === false, 'TNV Club and "willing to lead" are recorded');

    console.log('NGO sign-in email');
    const ngoBody = { organisation_name: 'Green Hands Trust', category: 'NGO / Trust', logo: LOGO, org_email: 'Office@GreenHands.org', org_phone: '9444012345', poc_name: 'R. Lakshmi', poc_designation: 'President', poc_phone: '9444098765', district_name: 'Coimbatore', interests: ['Mega Tree Plantation (1 Crore Palm Mission)'], proposal: 'Monthly tree planting drives with our 200 volunteers.', email: 'someone.else@example.com', password: 'trust123' };
    const ngo = await call('POST', '/api/collab/register', ngoBody);
    ok(ngo.status === 201, 'NGO registers');
    const viaOther = await call('POST', '/api/login', { username: 'someone.else@example.com', password: 'trust123' });
    const viaOrg = await call('POST', '/api/login', { username: 'office@greenhands.org', password: 'trust123' });
    ok(viaOther.status !== 200 && viaOrg.status === 200, 'The NGO signs in with its organisation email only');

    console.log('Approval details');
    const qs = await call('GET', '/api/admin/questions?active_only=true', undefined, A);
    const questions = (qs.data.questions || qs.data || []).filter(q => q.active !== false);
    const memberId = club.data.profile.id;
    await call('POST', '/api/admin/save-scores', { profile_id: memberId, scores: questions.map(q => ({ question_id: q.id, score: 1 })) }, A);
    const approve = await call('POST', '/api/admin/approve', { profile_id: memberId, role: 'volunteer' }, A);
    ok(approve.status === 200 && approve.data.approved_by_name && approve.data.approved_at, 'Approving returns who approved and when');
    const rowApproved = (await queue()).find(r => r.id === memberId);
    ok(rowApproved.approved_by_name === approve.data.approved_by_name && rowApproved.approved_at, 'The member list shows who approved and when');
    const letter = await call('GET', `/api/appointment/${memberId}.pdf?t=${A}`);
    const card = await call('GET', `/api/id-card/${memberId}.pdf?t=${A}`);
    ok(letter.status === 200 && letter.raw.slice(0, 4).toString() === '%PDF' && card.status === 200, "The panel's appointment letter and ID card links open the member's documents");
    const adminOwn = await call('GET', '/api/appointment/usr_nobody.pdf', undefined, A);
    ok(adminOwn.status === 404, "An unknown member does not fall back to the admin's own letter");

    console.log('Payment decisions');
    const payer = await call('POST', '/api/register', base({ email: 'p1@example.com', phone: '9840070006', aadhaarNumber: '567890120006' }));
    const payerId = payer.data.profile.id;
    await call('POST', '/api/record-payment', { gateway_ref: '612345678901', screenshot: LOGO }, payer.data.session.access_token);
    const approvePay = await call('POST', '/api/admin/verify-payment', { applicant_id: payerId, action: 'approve' }, A);
    ok(approvePay.status === 200 && approvePay.data.receipt_no && approvePay.data.payment_decisions.length === 1, 'Payment approved with a receipt and a history entry');
    const noRemark = await call('POST', '/api/admin/verify-payment', { applicant_id: payerId, action: 'reject' }, A);
    ok(noRemark.status === 400 && noRemark.data.field === 'remark', 'Changing a decision needs a remark');
    const rejectPay = await call('POST', '/api/admin/verify-payment', { applicant_id: payerId, action: 'reject', remark: 'Credit was reversed by the bank' }, A);
    ok(rejectPay.status === 200 && rejectPay.data.status === 'rejected' && rejectPay.data.payment_decisions[0].edit === true, 'Approved payment changed to rejected with the remark');
    const rowRejected = (await queue()).find(r => r.id === payerId);
    ok(rowRejected.payment_status === 'rejected' && !rowRejected.membership_paid && rowRejected.payment_screenshot, 'Rejected payment keeps its screenshot so it can be looked at again');
    const reapprove = await call('POST', '/api/admin/verify-payment', { applicant_id: payerId, action: 'approve', remark: 'Bank confirmed the credit' }, A);
    ok(reapprove.status === 200 && reapprove.data.receipt_no === approvePay.data.receipt_no && reapprove.data.payment_decisions.length === 3, 'Approving again keeps the same receipt number and the full history');
    const again = await call('POST', '/api/admin/verify-payment', { applicant_id: payerId, action: 'approve', remark: 'again' }, A);
    ok(again.status === 409, 'The same decision is not recorded twice');

    console.log('Admin access by constituency');
    const lead = await call('POST', '/api/register', base({ email: 'lead@example.com', phone: '9840070007', aadhaarNumber: '567890120007' }));
    await call('POST', '/api/test/toggle-approval', { status: 'approved' }, lead.data.session.access_token);
    const other = await call('POST', '/api/register', base({ email: 'velachery@example.com', phone: '9840070008', aadhaarNumber: '567890120008', assembly_constituency: 'Velachery' }));
    ok(other.status === 201, 'A Velachery member registers');
    const grant = await call('POST', '/api/admin/access', { profile_id: lead.data.profile.id, districts: ['Chennai'], constituencies: ['Mylapore'], modules: ['members'] }, A);
    ok(grant.status === 200 && grant.data.admin.constituencies.join() === 'Mylapore', 'Master Admin limits an admin to one constituency');
    const leadLogin = await call('POST', '/api/login', { username: 'lead@example.com', password: 'secret123' });
    const scoped = await call('GET', '/api/admin/queue', undefined, leadLogin.data.session.access_token);
    ok(scoped.status === 200 && scoped.data.queue.length > 0 && scoped.data.queue.every(r => r.assembly_constituency === 'Mylapore'), 'That admin sees only Mylapore members');
    const myAccess = await call('GET', '/api/admin/my-access', undefined, leadLogin.data.session.access_token);
    ok(myAccess.data.constituencies.join() === 'Mylapore', 'Their access lists the constituency');

    console.log(`\nAll ${passed} November checks passed.`);
  } finally {
    server.close();
  }
}

run().then(() => { fs.rmSync(tmp, { recursive: true, force: true }); process.exit(0); }).catch(err => {
  console.error('\nFAILED:', err.message);
  process.exit(1);
});
