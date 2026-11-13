// Mail and birthday routes
//
//   GET  /api/my-birthday               Signed-in member: today's birthday card, if it's their birthday
//   GET  /api/admin/mail/status         Provider, daily limit, sent today, queued, failed
//   GET  /api/admin/mail/log            Email log (?status=&kind=)
//   POST /api/admin/mail/test           Send a test email { to }
//   POST /api/admin/mail/birthday       Send one member's birthday card now { profile_id }
//   POST /api/admin/mail/birthdays/run  Send today's birthday cards now
//   POST /api/admin/mail/flush          Send queued emails now
//   POST /api/admin/mail/broadcast      Email a message to members { subject, body, recipient_ids }
//   GET  /api/cron/daily                Daily job (Vercel Cron, 7:00 AM IST): birthday cards + queue

const templates = require('../mail/templates');
const { pickBirthdayCard, fillCard } = require('../mail/birthdayCards');

const todayIST = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

// Date of birth is stored as YYYY-MM-DD (DD-MM-YYYY and DD/MM/YYYY accepted too)
function parseDob(dob) {
  if (!dob || typeof dob !== 'string') return null;
  let m = dob.trim().match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (m) return { year: +m[1], month: +m[2], day: +m[3] };
  m = dob.trim().match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (m) return { year: +m[3], month: +m[2], day: +m[1] };
  return null;
}

// Is today (in India) this date of birth's birthday? 29 Feb is celebrated on 28 Feb in other years.
function birthdayToday(dob, today = todayIST()) {
  const d = parseDob(dob);
  if (!d) return null;
  const [y, mo, da] = today.split('-').map(Number);
  const leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  const day = d.month === 2 && d.day === 29 && !leap ? 28 : d.day;
  return d.month === mo && day === da ? { year: y, turning: y - d.year } : null;
}

function createMailRoutes({ mailer, supabaseBridge, getAuthUser, sendJson, inMemoryProfiles, districts = [], isHosted }) {
  const districtName = p => p.district_name || (districts.find(d => d.id === Number(p.district_id)) || {}).name || 'Tamil Nadu';
  const isAdmin = u => Boolean(u) && (u.role === 'master_admin' || u.role === 'dept_admin');

  function readJson(req) {
    return new Promise(resolve => {
      let raw = '';
      req.on('data', c => { raw += c; if (raw.length > 512 * 1024) req.destroy(); });
      req.on('end', () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch (_e) { resolve({}); } });
      req.on('error', () => resolve({}));
    });
  }

  // Everyone who can get email from TNV: members (not staff, not blocked) with an address
  async function listMembers() {
    let rows = [];
    if (supabaseBridge.isConfigured()) {
      try { rows = await supabaseBridge.getAdminQueue(null); } catch (_e) { rows = []; }
    }
    if (!Array.isArray(rows) || !rows.length) rows = inMemoryProfiles;
    return rows
      .filter(p => p && !p.blocked && p.role !== 'master_admin' && p.email)
      .map(p => ({ ...p, district_name: districtName(p) }));
  }

  async function fullProfile(user) {
    if (user.dob && user.district_name) return user;
    if (supabaseBridge.isConfigured()) {
      try {
        const p = await supabaseBridge.getProfileById(user.id);
        if (p) return { ...p, ...user, dob: user.dob || p.dob, district_name: districtName({ ...p, ...user }) };
      } catch (_e) {}
    }
    return { ...user, district_name: districtName(user) };
  }

  function birthdayMessage(member, year, turning) {
    const card = pickBirthdayCard(member.id, year);
    const t = templates.birthday({ member, card, turning });
    return {
      to: member.email,
      toName: member.full_name,
      ...t,
      kind: 'birthday',
      meta: { profile_id: member.id, card: card.id, year },
      // One birthday card per member per year, however often the job runs
      idempotencyKey: `birthday-${member.id}-${year}`
    };
  }

  async function runBirthdays() {
    const today = todayIST();
    const members = await listMembers();
    const due = members
      .map(m => ({ m, b: birthdayToday(m.dob, today) }))
      .filter(x => x.b);
    const records = await mailer.sendMany(due.map(({ m, b }) => birthdayMessage(m, b.year, b.turning)));
    return {
      date: today,
      birthdays: due.length,
      sent: records.filter(r => r.status === 'sent' || r.status === 'logged').length,
      queued: records.filter(r => r.status === 'queued').length,
      failed: records.filter(r => r.status === 'failed').length,
      already_sent: due.length - records.length
    };
  }

  async function runDaily() {
    const birthdays = await runBirthdays();
    const queue = await mailer.flushQueue();
    return { birthdays, queue };
  }

  function cronAllowed(req) {
    const secret = process.env.CRON_SECRET;
    const header = String(req.headers.authorization || '');
    if (secret) return header === `Bearer ${secret}`;
    // Without a secret the job can only be started locally
    return !isHosted;
  }

  async function handle(req, res, pathname, query) {
    const method = req.method;
    const fail = (status, error, extra = {}) => (sendJson(res, status, { ok: false, error, ...extra }), true);

    try {
      // ---- Daily job (Vercel Cron calls this with Authorization: Bearer CRON_SECRET) ----
      if (pathname === '/api/cron/daily' && (method === 'GET' || method === 'POST')) {
        if (!cronAllowed(req)) return fail(401, 'Not allowed.');
        return (sendJson(res, 200, { ok: true, ...(await runDaily()) }), true);
      }

      // ---- The signed-in member's birthday card ----
      if (method === 'GET' && pathname === '/api/my-birthday') {
        const user = await getAuthUser(req);
        if (!user || user.role === 'ngo') return fail(401, 'Please sign in.');
        const member = await fullProfile(user);
        const b = birthdayToday(member.dob);
        if (!b) return (sendJson(res, 200, { ok: true, is_birthday: false }), true);
        const card = fillCard(pickBirthdayCard(member.id, b.year), member);
        const log = await mailer.listLog({ kind: 'birthday', limit: 1500 });
        const mailed = log.find(e => e.idempotency_key === `birthday-${member.id}-${b.year}` && ['sent', 'logged', 'queued'].includes(e.status));
        return (sendJson(res, 200, {
          ok: true,
          is_birthday: true,
          year: b.year,
          turning: b.turning,
          card: { id: card.id, emoji: card.emoji, title: card.title, subtitle: card.subtitle, message: card.message },
          district_name: member.district_name,
          emailed: Boolean(mailed && mailed.status === 'sent')
        }), true);
      }

      if (!pathname.startsWith('/api/admin/mail/')) return false;

      const user = await getAuthUser(req);
      if (!isAdmin(user)) return fail(403, 'Admin sign-in required.');

      if (method === 'GET' && pathname === '/api/admin/mail/status') {
        return (sendJson(res, 200, { ok: true, ...(await mailer.status()) }), true);
      }

      if (method === 'GET' && pathname === '/api/admin/mail/log') {
        const entries = await mailer.listLog({ status: query.status || undefined, kind: query.kind || undefined, limit: 300 });
        return (sendJson(res, 200, { ok: true, entries }), true);
      }

      if (method !== 'POST') return false;
      const body = await readJson(req);

      if (pathname === '/api/admin/mail/test') {
        const to = String(body.to || user.email || '').trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return fail(400, 'Enter an email address to send the test to.');
        const t = templates.broadcast({
          full_name: user.full_name,
          subject: 'Test email from the TNV portal',
          body: 'Hello {name},\n\nThis is a test email from the Tamil Nadu Volunteers portal. If you can read this, email is working.'
        });
        const rec = await mailer.send({ to, toName: user.full_name, ...t, kind: 'test' }, { queueOverLimit: false });
        return (sendJson(res, rec.status === 'failed' ? 502 : 200, { ok: rec.status !== 'failed', entry: rec, error: rec.error || undefined }), true);
      }

      if (pathname === '/api/admin/mail/birthday') {
        const members = await listMembers();
        const m = members.find(x => x.id === body.profile_id);
        if (!m) return fail(404, 'Member not found, or they have no email address.');
        const d = parseDob(m.dob);
        const year = Number(todayIST().slice(0, 4));
        const rec = await mailer.send(birthdayMessage(m, year, d ? year - d.year : null));
        if (rec.status === 'skipped' && rec.error === 'Already sent.') return fail(409, `${m.full_name}'s birthday card for ${year} was already sent.`);
        return (sendJson(res, 200, { ok: rec.status !== 'failed', entry: rec, error: rec.error || undefined }), true);
      }

      if (pathname === '/api/admin/mail/birthdays/run') {
        return (sendJson(res, 200, { ok: true, ...(await runBirthdays()) }), true);
      }

      if (pathname === '/api/admin/mail/flush') {
        return (sendJson(res, 200, { ok: true, ...(await mailer.flushQueue()) }), true);
      }

      if (pathname === '/api/admin/mail/broadcast') {
        const subject = String(body.subject || '').trim();
        const text = String(body.body || '').trim();
        const ids = Array.isArray(body.recipient_ids) ? body.recipient_ids : [];
        if (!subject) return fail(400, 'Add a subject.');
        if (!text) return fail(400, 'Write the message.');
        if (!ids.length) return fail(400, 'Choose who should receive it.');
        const members = (await listMembers()).filter(m => ids.includes(m.id));
        const records = await mailer.sendMany(members.map(m => ({
          to: m.email,
          toName: m.full_name,
          ...templates.broadcast({ full_name: m.full_name, subject, body: text }),
          kind: 'message',
          meta: { profile_id: m.id }
        })));
        const count = s => records.filter(r => r.status === s).length;
        return (sendJson(res, 200, {
          ok: true,
          sent: count('sent') + count('logged'),
          queued: count('queued'),
          failed: count('failed'),
          no_email: ids.length - members.length + count('skipped')
        }), true);
      }

      return false;
    } catch (err) {
      console.error('[mail routes]', err);
      if (!res.headersSent) sendJson(res, 500, { ok: false, error: 'Something went wrong. Please try again.' });
      return true;
    }
  }

  return { handle, runDaily, birthdayToday };
}

module.exports = { createMailRoutes, birthdayToday, parseDob };
