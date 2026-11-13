// Mail service and birthday cards: providers (Resend, ZeptoMail, log), the email log,
// once-a-year birthday emails, the daily limit queue, the daily cron job, the
// member's birthday card and the admin email endpoints.
//
// Runs the request handler in-process on a free port, in in-memory mode, with its
// snapshot files in a throwaway temp folder.  Run: node server/test/verify_mail.test.js
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const assert = require('assert');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tnv-mail-'));
process.env.TMP = tmp;
process.env.TEMP = tmp;
process.env.TMPDIR = tmp;
delete process.env.SUPABASE_URL;
delete process.env.VERCEL;
for (const k of ['MAIL_PROVIDER', 'RESEND_API_KEY', 'ZEPTOMAIL_TOKEN', 'ZEPTOMAIL_API_URL', 'MAIL_FROM', 'EMAIL_FROM', 'MAIL_REPLY_TO', 'MAIL_DAILY_LIMIT', 'CRON_SECRET']) delete process.env[k];

const { createMailer, mailConfig } = require('../mail/mailer');
const templates = require('../mail/templates');
const { BIRTHDAY_CARDS, pickBirthdayCard } = require('../mail/birthdayCards');
const { birthdayToday } = require('../routes/mailRoutes');

let passed = 0;
const ok = (cond, label) => { assert.ok(cond, label); passed += 1; console.log(`  ✓ ${label}`); };

// A stand-in for supabase_bridge's snapshot store
function memoryBridge() {
  const store = {};
  return {
    store,
    isConfigured: () => false,
    getSupabaseSnapshot: async key => (key in store ? JSON.parse(JSON.stringify(store[key])) : null),
    saveSupabaseSnapshot: async (key, data) => { store[key] = JSON.parse(JSON.stringify(data)); return true; }
  };
}

const msg = (over = {}) => ({ to: 'a@example.com', toName: 'Asha', subject: 'Hi', html: '<p>Hi</p>', text: 'Hi', kind: 'test', ...over });

async function unitChecks() {
  console.log('Mailer');
  ok(mailConfig().provider === 'log', 'With no API key the mailer only logs');
  process.env.RESEND_API_KEY = 're_test';
  ok(mailConfig().provider === 'resend', 'A Resend key picks Resend');
  delete process.env.RESEND_API_KEY;
  process.env.ZEPTOMAIL_TOKEN = 'zt';
  ok(mailConfig().provider === 'zeptomail', 'A ZeptoMail token picks ZeptoMail');
  delete process.env.ZEPTOMAIL_TOKEN;
  process.env.MAIL_FROM = 'TNV Team <hello@tnv.example>';
  ok(mailConfig().fromName === 'TNV Team' && mailConfig().fromAddress === 'hello@tnv.example', 'MAIL_FROM is split into name and address');
  delete process.env.MAIL_FROM;

  const bridge = memoryBridge();
  const mailer = createMailer({ supabaseBridge: bridge });
  const r1 = await mailer.send(msg({ idempotencyKey: 'k1' }));
  ok(r1.status === 'logged', 'Log provider records the email as logged');
  const r2 = await mailer.send(msg({ idempotencyKey: 'k1' }));
  ok(r2.status === 'skipped' && r2.error === 'Already sent.', 'The same idempotency key is not sent twice');
  const bad = await mailer.send(msg({ to: 'not-an-email' }));
  ok(bad.status === 'skipped', 'An invalid address is skipped, not sent');

  process.env.MAIL_DAILY_LIMIT = '2';
  const batch = await mailer.sendMany([msg({ to: 'b@example.com' }), msg({ to: 'c@example.com' }), msg({ to: 'd@example.com' })]);
  ok(batch.map(r => r.status).join(',') === 'logged,queued,queued', 'Over the daily limit, emails are queued');
  const st = await mailer.status();
  ok(st.sent_today === 2 && st.queued === 2 && st.remaining_today === 0, 'Status counts today and the queue');
  const flushSameDay = await mailer.flushQueue();
  ok(flushSameDay.sent === 0 && flushSameDay.still_queued === 2, 'The queue waits while today’s limit is used up');
  process.env.MAIL_DAILY_LIMIT = '10';
  const flush = await mailer.flushQueue();
  ok(flush.sent === 2 && flush.still_queued === 0, 'Queued emails go out when there is room');
  const log = await mailer.listLog();
  ok(log.length === 5 && !log.some(e => 'payload' in e), 'The log lists every email without stored bodies');
  delete process.env.MAIL_DAILY_LIMIT;

  // Provider request shapes, with fetch stubbed
  const realFetch = global.fetch;
  const seen = [];
  global.fetch = async (url, opts) => {
    seen.push({ url, opts, body: JSON.parse(opts.body) });
    const json = url.includes('resend') ? { id: 'rs_1' } : { request_id: 'zm_1', data: [{ message: 'OK' }] };
    return { ok: true, status: 200, text: async () => JSON.stringify(json) };
  };
  try {
    process.env.RESEND_API_KEY = 're_live';
    process.env.MAIL_FROM = 'Tamil Nadu Volunteers <noreply@tnv.example>';
    const m2 = createMailer({ supabaseBridge: memoryBridge() });
    const rs = await m2.send(msg({ idempotencyKey: 'birthday-x-2026', kind: 'birthday' }));
    const rq = seen[0];
    ok(rs.status === 'sent' && rs.provider_id === 'rs_1', 'Resend: sent, with Resend’s id');
    ok(rq.url === 'https://api.resend.com/emails' && rq.opts.headers.Authorization === 'Bearer re_live' && rq.opts.headers['Idempotency-Key'] === 'birthday-x-2026', 'Resend: key and idempotency header');
    ok(rq.body.from === 'Tamil Nadu Volunteers <noreply@tnv.example>' && rq.body.to[0] === 'Asha <a@example.com>' && rq.body.html && rq.body.text && rq.body.tags[0].value === 'birthday', 'Resend: from, to, html, text and tag');
    delete process.env.RESEND_API_KEY;

    process.env.ZEPTOMAIL_TOKEN = 'Zoho-enczapikey abc123';
    process.env.MAIL_REPLY_TO = 'help@tnv.example';
    const m3 = createMailer({ supabaseBridge: memoryBridge() });
    const zm = await m3.send(msg());
    const zq = seen[1];
    ok(zm.status === 'sent' && zm.provider === 'zeptomail', 'ZeptoMail: sent');
    ok(zq.url === 'https://cpaas.zoho.com/v1.1/email' && zq.opts.headers.Authorization === 'Zoho-enczapikey abc123', 'ZeptoMail: send URL and token header (prefix not doubled)');
    ok(zq.body.from.address === 'noreply@tnv.example' && zq.body.to[0].email_address.address === 'a@example.com' && zq.body.htmlbody && zq.body.textbody && zq.body.reply_to[0].address === 'help@tnv.example', 'ZeptoMail: from, to, htmlbody, textbody and reply-to');

    global.fetch = async () => ({ ok: false, status: 422, text: async () => JSON.stringify({ message: 'The domain is not verified.' }) });
    process.env.RESEND_API_KEY = 're_live';
    delete process.env.ZEPTOMAIL_TOKEN;
    const failed = await createMailer({ supabaseBridge: memoryBridge() }).send(msg());
    ok(failed.status === 'failed' && failed.error === 'The domain is not verified.', 'A provider error is recorded with its reason');
  } finally {
    global.fetch = realFetch;
    for (const k of ['RESEND_API_KEY', 'ZEPTOMAIL_TOKEN', 'MAIL_FROM', 'MAIL_REPLY_TO']) delete process.env[k];
  }

  console.log('Birthday cards and templates');
  ok(BIRTHDAY_CARDS.length === 4 && new Set(BIRTHDAY_CARDS.map(c => c.id)).size === 4, 'Four card designs');
  ok(pickBirthdayCard('abc', 2026) === pickBirthdayCard('abc', 2026), 'Same member, same year, same card');
  const spread = new Set(Array.from({ length: 40 }, (_, i) => pickBirthdayCard(`member-${i}`, 2026).id));
  ok(spread.size === 4, 'Cards are spread across all four designs');
  ok(birthdayToday('2000-11-14', '2026-11-14').turning === 26 && birthdayToday('14-11-2000', '2026-11-14') && !birthdayToday('2000-11-15', '2026-11-14'), 'Birthday detection (YYYY-MM-DD and DD-MM-YYYY)');
  ok(birthdayToday('2004-02-29', '2026-02-28') && birthdayToday('2004-02-29', '2028-02-29') && !birthdayToday('2004-02-29', '2028-02-28'), '29 February birthdays fall on 28 February outside leap years');
  const t = templates.birthday({ member: { full_name: '<b>Ravi</b> K', district_name: 'Salem' }, card: BIRTHDAY_CARDS[0], turning: 30 });
  ok(!t.html.includes('<b>Ravi</b>') && t.html.includes('&lt;b&gt;Ravi'), 'Member names are escaped in email HTML');
  ok(t.text.includes('Salem') && t.subject.includes('Happy Birthday'), 'Birthday email names the district and has a text version');
  const bc = templates.broadcast({ full_name: 'Meena S', subject: 'Camp', body: 'Dear {name},\nSee you <soon>.' });
  ok(bc.text.startsWith('Dear Meena,') && bc.html.includes('&lt;soon&gt;'), 'Admin messages fill {name} and escape HTML');
}

let port;
function call(method, url, body, token) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, path: url, method, headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: token.startsWith('Bearer ') ? token : `Bearer ${token}` } : {})
    } }, res => {
      let raw = '';
      res.on('data', c => { raw += c; });
      res.on('end', () => {
        let data = {};
        try { data = JSON.parse(raw); } catch (_e) { data = { raw }; }
        resolve({ status: res.statusCode, data });
      });
    });
    req.on('error', reject);
    if (body !== undefined) req.write(JSON.stringify(body));
    req.end();
  });
}

const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
const [ty, tm, td] = today.split('-');
const birthdayDob = `${Number(ty) - 25}-${tm}-${td === '29' && tm === '02' ? '28' : td}`;

const volunteer = (overrides = {}) => ({
  full_name: 'Kavin Raj',
  phone: '9876501234',
  email: 'kavin.r@example.com',
  dob: birthdayDob,
  gender: 'Male',
  blood_group: 'B+',
  affiliation: 'Individual',
  work_study_status: 'Working',
  company_area: 'Adyar',
  address: '4 Temple Street, Adyar',
  district_id: 3,
  assembly_constituency: 'Mylapore',
  pincode: '600020',
  wing_to_join: 'Management Wing',
  department: 'Dept',
  mode_of_work: 'Hybrid',
  past_field_work: ['Fresher'],
  aadhaarNumber: '345678901234',
  password: 'secret123',
  confirm_password: 'secret123',
  zone: 13,
  ward: 173,
  ...overrides
});

async function httpChecks() {
  const handler = require('../server.js');
  const server = http.createServer(handler);
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  port = server.address().port;
  try {
    console.log('Email triggers and routes');
    const admin = await call('POST', '/api/login', { username: 'masteradmin', password: 'AdminPassword2026!' });
    const adminToken = admin.data.session.access_token;

    const reg = await call('POST', '/api/register', volunteer());
    ok(reg.status === 201, 'Member with a birthday today registers');
    const kavinToken = reg.data.session.access_token;
    const other = await call('POST', '/api/register', volunteer({ full_name: 'Divya M', email: 'divya.m@example.com', phone: '9876505678', aadhaarNumber: '456789012345', dob: '1999-01-01' === birthdayDob ? '1999-01-02' : '1999-01-01' }));
    ok(other.status === 201, 'A second member registers');

    const welcome = await call('GET', '/api/admin/mail/log?kind=welcome', undefined, adminToken);
    ok(welcome.data.entries.some(e => e.to === 'kavin.r@example.com' && e.status === 'logged'), 'Registration sends a welcome email');

    const notAdmin = await call('GET', '/api/admin/mail/status', undefined, kavinToken);
    ok(notAdmin.status === 403, 'Members cannot see the email status');
    const st = await call('GET', '/api/admin/mail/status', undefined, adminToken);
    ok(st.status === 200 && st.data.provider === 'log' && st.data.daily_limit === 100, 'Admin sees the provider and the daily limit');

    const card = await call('GET', '/api/my-birthday', undefined, kavinToken);
    ok(card.data.is_birthday === true && card.data.turning === 25 && BIRTHDAY_CARDS.some(c => c.id === card.data.card.id), 'The member sees a birthday card on their birthday');
    ok(card.data.card.title.includes('Kavin') && card.data.card.message.includes('Chennai'), 'The card is filled with their name and district');
    const notToday = await call('GET', '/api/my-birthday', undefined, other.data.session.access_token);
    ok(notToday.data.is_birthday === false, 'No card on other days');
    const anon = await call('GET', '/api/my-birthday');
    ok(anon.status === 401, 'The birthday card needs sign-in');

    const cron = await call('GET', '/api/cron/daily');
    ok(cron.status === 200 && cron.data.birthdays.birthdays === 1 && cron.data.birthdays.sent === 1, 'The daily job sends today’s birthday card');
    const cronAgain = await call('GET', '/api/cron/daily');
    ok(cronAgain.data.birthdays.sent === 0 && cronAgain.data.birthdays.already_sent === 1, 'Running it again does not send a second card');
    const bdLog = await call('GET', '/api/admin/mail/log?kind=birthday', undefined, adminToken);
    const entry = bdLog.data.entries[0];
    ok(bdLog.data.entries.length === 1 && entry.meta.card === card.data.card.id, 'The email uses the same card as the dashboard');
    const manual = await call('POST', '/api/admin/mail/birthday', { profile_id: reg.data.profile.id }, adminToken);
    ok(manual.status === 409, 'Admin cannot send the same year’s card twice');

    process.env.CRON_SECRET = 'cron-test-secret';
    const noSecret = await call('GET', '/api/cron/daily');
    const withSecret = await call('GET', '/api/cron/daily', undefined, 'Bearer cron-test-secret');
    ok(noSecret.status === 401 && withSecret.status === 200, 'With CRON_SECRET set, the daily job needs the secret');
    delete process.env.CRON_SECRET;

    const test = await call('POST', '/api/admin/mail/test', { to: 'admin@example.com' }, adminToken);
    ok(test.status === 200 && test.data.entry.status === 'logged', 'Admin can send a test email');
    const badTest = await call('POST', '/api/admin/mail/test', { to: 'nope' }, adminToken);
    ok(badTest.status === 400, 'Test email needs a valid address');

    const ids = [reg.data.profile.id, other.data.profile.id];
    const bc = await call('POST', '/api/admin/mail/broadcast', { subject: 'Beach clean-up', body: 'Dear {name}, join us on Sunday.', recipient_ids: ids }, adminToken);
    ok(bc.status === 200 && bc.data.sent === 2 && bc.data.failed === 0, 'Admin message is emailed to each member');
    const missing = await call('POST', '/api/admin/mail/broadcast', { subject: '', body: 'x', recipient_ids: ids }, adminToken);
    ok(missing.status === 400, 'Admin message needs a subject');

    const qs = await call('GET', '/api/admin/questions?active_only=true', undefined, adminToken);
    const questions = (qs.data.questions || qs.data || []).filter(q => q.active !== false);
    await call('POST', '/api/admin/save-scores', { profile_id: reg.data.profile.id, scores: questions.map(q => ({ question_id: q.id, score: 1 })) }, adminToken);
    const approve = await call('POST', '/api/admin/approve', { profile_id: reg.data.profile.id, role: 'volunteer' }, adminToken);
    const approvedLog = await call('GET', '/api/admin/mail/log?kind=approval', undefined, adminToken);
    ok(approve.status === 200 && approvedLog.data.entries.some(e => e.to === 'kavin.r@example.com' && /^TNV-/.test(e.meta.tnv_id || '')), 'Approval sends an email with the TNV ID');

    const ngo = await call('POST', '/api/collab/register', {
      organisation_name: 'Blue Shore Trust', category: 'NGO / Trust',
      logo: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      org_email: 'office@blueshore.org', org_phone: '9444011111', poc_name: 'S. Anand', poc_designation: 'Secretary', poc_phone: '9444022222',
      district_name: 'Salem', interests: ['Environment'], proposal: 'Monthly beach and lake clean-up drives with our volunteers.',
      email: 'login@blueshore.org', password: 'trust123'
    });
    ok(ngo.status === 201, 'An NGO applies');
    const decide = await call('POST', '/api/admin/collab/decision', { id: ngo.data.profile.id, decision: 'approved' }, adminToken);
    const ngoLog = await call('GET', '/api/admin/mail/log?kind=ngo', undefined, adminToken);
    ok(decide.status === 200 && ngoLog.data.entries.length === 2 && ngoLog.data.entries.every(e => e.to === 'login@blueshore.org'), 'NGOs get “received” and “decision” emails');

    const finalStatus = await call('GET', '/api/admin/mail/status', undefined, adminToken);
    ok(finalStatus.data.sent_today >= 8 && finalStatus.data.failed === 0, 'Everything shows up in today’s count');
  } finally {
    server.close();
  }
}

(async () => {
  try {
    await unitChecks();
    await httpChecks();
    console.log(`\nAll ${passed} mail checks passed.`);
    fs.rmSync(tmp, { recursive: true, force: true });
    process.exit(0);
  } catch (err) {
    console.error('\nFAILED:', err.message);
    process.exit(1);
  }
})();
