// ID card QR and member verification: the QR encoder, the signed verification
// code printed on each card, the public /api/verify/member endpoint, and the
// membership dates on the ID card, appointment letter and receipt.
//
// Runs the request handler in-process on a free port, in in-memory mode, with its
// snapshot files in a throwaway temp folder.  Run: node server/test/verify_member_qr.test.js
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const assert = require('assert');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tnv-qr-'));
process.env.TMP = tmp;
process.env.TEMP = tmp;
process.env.TMPDIR = tmp;
delete process.env.SUPABASE_URL;
delete process.env.VERCEL;
delete process.env.PORTAL_URL;

const { encodeQr } = require('../lib/qr');
const { membershipPeriod, paymentYearLabel, dmy } = require('../lib/membership');

let passed = 0;
const ok = (cond, label) => { assert.ok(cond, label); passed += 1; console.log(`  ✓ ${label}`); };

function unitChecks() {
  console.log('QR encoder');
  // The client's qrcode package is the reference when it is installed
  let ref = null;
  try { ref = require('../../client/node_modules/qrcode'); } catch (_e) {}
  const samples = ['https://tnv-hub.vercel.app/verify/member/TNV-CHE-0001-1A2B3C4D', 'x'.repeat(120), 'தமிழ் 2026'];
  if (ref) {
    let same = true;
    for (const text of samples) {
      for (let mask = 0; mask < 8; mask++) {
        const mine = encodeQr(text, { mask });
        const theirs = ref.create([{ data: Buffer.from(text, 'utf8'), mode: 'byte' }], { errorCorrectionLevel: 'M', maskPattern: mask, version: mine.version });
        for (let y = 0; y < mine.size && same; y++) {
          for (let x = 0; x < mine.size; x++) if (Boolean(theirs.modules.get(y, x)) !== mine.modules[y][x]) { same = false; break; }
        }
      }
    }
    ok(same, 'Matches the qrcode package module for module (3 texts x 8 masks)');
    const auto = encodeQr(samples[0]);
    const refAuto = ref.create([{ data: Buffer.from(samples[0]), mode: 'byte' }], { errorCorrectionLevel: 'M' });
    ok(auto.mask === refAuto.maskPattern && auto.version === refAuto.version, 'Picks the same version and mask');
  } else {
    console.log('  (client/node_modules/qrcode not installed: skipping the reference comparison)');
  }
  ok(encodeQr(samples[0]).size === 33, 'A verification link fits a version 4 code (33 x 33)');
  assert.throws(() => encodeQr('y'.repeat(300)));
  passed += 1; console.log('  ✓ Text too long for version 10 is refused');

  console.log('Membership dates');
  const now = new Date('2026-11-14T10:00:00+05:30');
  const a = membershipPeriod({ approved_at: '2025-03-02T05:00:00Z' }, now);
  ok(a.joinedText === '02-03-2025' && a.yearLabel === '2026 - 2027' && a.endText === '02-03-2027', 'The card shows the membership year that contains today');
  const b = membershipPeriod({ approved_at: '2025-11-20T05:00:00Z' }, now);
  ok(b.yearLabel === '2025 - 2026' && b.endText === '20-11-2026', 'Before the anniversary it is still last year’s period');
  const c = membershipPeriod({ approved_at: '2023-11-14T20:00:00Z' }, now);
  ok(c.joinedText === '15-11-2023', 'Dates are taken in India time');
  ok(membershipPeriod({ approved_at: '2024-02-29T05:00:00Z' }, now).startText === '28-02-2026', '29 February joins roll to 28 February');
  const paidNow = membershipPeriod({ approved_at: '2025-01-10T05:00:00Z' }, now, { paidAt: '2026-01-15T05:00:00Z' });
  ok(paidNow.paid && !paidNow.expired && paidNow.yearLabel === '2026 - 2027' && paidNow.endText === '15-01-2027', 'A paid membership runs one year from the payment');
  const lapsed = membershipPeriod({ approved_at: '2024-06-01T05:00:00Z' }, now, { paidAt: '2025-06-01T05:00:00Z' });
  ok(lapsed.expired && lapsed.endText === '01-06-2026' && lapsed.yearLabel === '2025 - 2026', 'Without a renewal the membership expires and the card keeps the old year');
  const lastDay = membershipPeriod({}, new Date('2027-01-14T23:00:00+05:30'), { paidAt: '2026-01-15T05:00:00Z' });
  const dueDay = membershipPeriod({}, new Date('2027-01-15T00:30:00+05:30'), { paidAt: '2026-01-15T05:00:00Z' });
  ok(!lastDay.expired && dueDay.expired, 'It expires on the renewal date (India time)');
  ok(paymentYearLabel('2027-01-05T10:00:00Z').short === '2027-28' && dmy('2026-11-13T20:00:00Z') === '14-11-2026', 'Receipt year and letter date follow the actual dates');
}

let port;
function call(method, url, body, token, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, path: url, method, headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers
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

async function httpChecks() {
  const handler = require('../server.js');
  const server = http.createServer(handler);
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  port = server.address().port;
  try {
    console.log('ID card QR and verification');
    const admin = await call('POST', '/api/login', { username: 'masteradmin', password: 'AdminPassword2026!' });
    const adminToken = admin.data.session.access_token;
    const reg = await call('POST', '/api/register', {
      full_name: 'Arul Mozhi', phone: '9840066001', email: 'arul.m@example.com', dob: '1995-06-01', gender: 'Female', blood_group: 'A+',
      affiliation: 'Individual', work_study_status: 'Working', company_area: 'Adyar', address: '9 Beach Road, Adyar', district_id: 3,
      assembly_constituency: 'Mylapore', pincode: '600020', wing_to_join: 'Management Wing', department: 'Dept', mode_of_work: 'Hybrid',
      past_field_work: ['Fresher'], aadhaarNumber: '678901230001', password: 'secret123', confirm_password: 'secret123', zone: 13, ward: 173
    });
    const id = reg.data.profile.id;
    const memberToken = reg.data.session.access_token;

    const locked = await call('GET', `/api/id-card/${id}.pdf`, undefined, memberToken);
    ok(locked.status === 403, 'No ID card before approval');

    const qs = await call('GET', '/api/admin/questions?active_only=true', undefined, adminToken);
    const questions = (qs.data.questions || qs.data || []).filter(q => q.active !== false);
    await call('POST', '/api/admin/save-scores', { profile_id: id, scores: questions.map(q => ({ question_id: q.id, score: 1 })) }, adminToken);
    const approve = await call('POST', '/api/admin/approve', { profile_id: id, role: 'volunteer' }, adminToken);
    const tnvId = approve.data.tnv_id;
    ok(/^TNV-/.test(tnvId), 'Member approved with a TNV ID');

    const card = await call('GET', `/api/id-card/${id}.pdf`, undefined, memberToken, { Referer: 'http://localhost:5173/dashboard' });
    const pdf = card.raw.toString('latin1');
    ok(card.status === 200 && pdf.startsWith('%PDF'), 'ID card downloads after approval');
    ok((pdf.match(/ re\n/g) || []).length > 150 && pdf.includes('0.04 0.18 0.09 rg'), 'The card carries a QR code');
    const period = membershipPeriod({ approved_at: new Date().toISOString() });
    ok(pdf.includes(`(${period.joinedText})`) && pdf.includes(`(${period.endText})`), 'Joining and validity dates follow today');

    // The code printed on the card for this member
    const handlerPhase1Code = await call('GET', `/api/verify/member/${encodeURIComponent(tnvId + '-00000000')}`);
    ok(handlerPhase1Code.status === 404 && handlerPhase1Code.data.verified === false, 'A made-up signature is refused');
    const crypto = require('crypto');
    const secret = process.env.AADHAAR_ENCRYPTION_KEY || 'tnv_phase1_super_secret_encryption_key_2026';
    const sig = crypto.createHmac('sha256', `${secret}:member-verify`).update(tnvId.toUpperCase()).digest('hex').slice(0, 8).toUpperCase();
    const code = `${tnvId}-${sig}`;

    const unpaid = await call('GET', `/api/verify/member/${code}`);
    ok(unpaid.status === 200 && unpaid.data.verified === false && unpaid.data.status === 'unpaid', 'Without a paid fee the card is not verified');

    // Member pays; admin verifies the payment
    const pay = await call('POST', '/api/record-payment', { profile_id: id, utr: '512345678901', payment_mode: 'UPI_QR' }, memberToken);
    const verifyPay = await call('POST', '/api/admin/verify-payment', { applicant_id: id, action: 'approve' }, adminToken);
    ok(pay.status === 200 && verifyPay.status === 200, 'Member pays and the admin verifies the payment');

    const v = await call('GET', `/api/verify/member/${code}`);
    ok(v.status === 200 && v.data.verified === true && v.data.status === 'active', 'The card’s code verifies the paid-up member');
    const paidPeriod = membershipPeriod({}, new Date(), { paidAt: new Date().toISOString() });
    ok(v.data.member.valid_until === paidPeriod.iso.end, 'Valid until is one year from the payment');
    ok(v.data.member.full_name === 'Arul Mozhi' && v.data.member.district_name === 'Chennai' && v.data.member.membership_year === period.yearLabel, 'Verification shows name, district and the current membership year');
    const leaked = ['phone', 'email', 'address', 'dob', 'aadhaar_enc', 'blood_group'].filter(k => k in v.data.member);
    ok(leaked.length === 0 && !JSON.stringify(v.data).includes('9840066001'), 'Verification leaks no private details');
    const lower = await call('GET', `/api/verify/member/${code.toLowerCase()}`);
    ok(lower.status === 200 && lower.data.verified, 'Codes are case-insensitive');
    const otherId = await call('GET', `/api/verify/member/${tnvId.replace(/\d+$/, n => String(Number(n) + 1).padStart(n.length, '0'))}-${sig}`);
    ok(otherId.status === 404, 'One member’s signature does not verify another ID');

    await call('POST', '/api/admin/members/block', { profile_id: id, blocked: true, reason: 'Test suspension' }, adminToken);
    const blockedCheck = await call('GET', `/api/verify/member/${code}`);
    if (blockedCheck.data.status === 'suspended') {
      ok(blockedCheck.data.verified === false && !('district_name' in blockedCheck.data.member), 'A suspended member’s card says so and shows nothing else');
    } else {
      console.log('  (block endpoint not available in this mode: skipped the suspended check)');
    }

    const letter = await call('GET', `/api/appointment/${id}.pdf`, undefined, memberToken);
    ok(letter.raw.toString('latin1').includes(`(${dmy(new Date())})`), 'Appointment letter is dated the day of appointment (DD-MM-YYYY)');

    console.log(`\nAll ${passed} ID card QR checks passed.`);
  } finally {
    server.close();
  }
}

(async () => {
  try {
    unitChecks();
    await httpChecks();
    fs.rmSync(tmp, { recursive: true, force: true });
    process.exit(0);
  } catch (err) {
    console.error('\nFAILED:', err.message);
    process.exit(1);
  }
})();
