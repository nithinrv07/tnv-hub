// Phase 1 changes: email-only registration and sign-in, Chennai zone/ward, NGO
// registration (logo, organisation contact, point of contact), NGO search and linking,
// NGO portal, admin access scopes, message log, ₹365 programme, event attendance.
//
// Runs the request handler in-process on a free port, in in-memory mode, with its
// snapshot files in a throwaway temp folder.  Run: node server/test/verify_phase1_changes.test.js
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const assert = require('assert');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tnv-phase1-'));
process.env.TMP = tmp;
process.env.TEMP = tmp;
process.env.TMPDIR = tmp;
delete process.env.SUPABASE_URL;
delete process.env.VERCEL;

const handler = require('../server.js');

const LOGO = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

let port;
function call(method, url, body, token) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, path: url, method, headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
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

const volunteer = (overrides = {}) => ({
  full_name: 'Priya Kumar',
  phone: '9876543210',
  email: 'priya.k@example.com',
  dob: '1998-05-20',
  gender: 'Female',
  blood_group: 'O+',
  affiliation: 'Individual',
  work_study_status: 'Working',
  company_area: 'Adyar',
  address: '12 Gandhi Street, Adyar',
  district_id: 3,
  assembly_constituency: 'Mylapore',
  pincode: '600020',
  wing_to_join: 'Management Wing',
  department: 'Dept',
  mode_of_work: 'Hybrid',
  past_field_work: ['Fresher'],
  aadhaarNumber: '234567890123',
  password: 'secret123',
  confirm_password: 'secret123',
  zone: 13,
  ward: 173,
  ...overrides
});

const ngoBody = (overrides = {}) => ({
  organisation_name: 'Green Hands Trust',
  category: 'NGO / Trust',
  logo: LOGO,
  org_email: 'office@greenhands.org',
  org_phone: '9444012345',
  poc_name: 'R. Lakshmi',
  poc_designation: 'President',
  poc_phone: '9444098765',
  district_name: 'Coimbatore',
  interests: ['Mega Tree Plantation (1 Crore Palm Mission)'],
  proposal: 'Monthly tree planting drives with our 200 volunteers across Coimbatore.',
  email: 'login@greenhands.org',
  password: 'trust123',
  ...overrides
});

async function run() {
  const server = http.createServer(handler);
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  port = server.address().port;
  let passed = 0;
  const ok = (cond, label) => { assert.ok(cond, label); passed++; console.log(`  ✓ ${label}`); };

  try {
    // --- Admin sign-in still works with the username ---
    const admin = await call('POST', '/api/login', { username: 'masteradmin', password: 'AdminPassword2026!' });
    ok(admin.status === 200 && admin.data.profile.role === 'master_admin', 'Master Admin signs in with username');
    const adminToken = admin.data.session.access_token;

    // --- Registration without a username; Chennai needs zone and ward ---
    const noWard = await call('POST', '/api/register', volunteer({ ward: '' }));
    ok(noWard.status === 400 && noWard.data.field === 'ward', 'Chennai zone without a ward is refused');
    const badWard = await call('POST', '/api/register', volunteer({ ward: 5 }));
    ok(badWard.status === 400 && badWard.data.field === 'ward', 'A ward outside the chosen zone is refused');
    const reg = await call('POST', '/api/register', volunteer());
    ok(reg.status === 201, 'Volunteer registers with email only (no username field)');
    ok(/^priyak_\d{4}$/.test(reg.data.profile.username), `Username is generated from the email (${reg.data.profile.username})`);

    // --- Sign in by email ---
    const byEmail = await call('POST', '/api/login', { username: 'PRIYA.K@example.com', password: 'secret123' });
    ok(byEmail.status === 200, 'Volunteer signs in with email (any case)');
    const priyaToken = byEmail.data.session.access_token;
    const wrong = await call('POST', '/api/login', { username: 'priya.k@example.com', password: 'nope' });
    ok(wrong.status === 401, 'Wrong password is refused');

    // --- NGO registration ---
    const noLogo = await call('POST', '/api/collab/register', ngoBody({ logo: '' }));
    ok(noLogo.status === 400 && noLogo.data.field === 'logo', 'NGO registration needs a logo');
    const noPoc = await call('POST', '/api/collab/register', ngoBody({ poc_name: '' }));
    ok(noPoc.status === 400 && noPoc.data.field === 'poc_name', 'NGO registration needs a point of contact');
    const noOrgPhone = await call('POST', '/api/collab/register', ngoBody({ org_phone: '123' }));
    ok(noOrgPhone.status === 400 && noOrgPhone.data.field === 'org_phone', 'NGO registration needs the organisation phone');
    const chennaiNgo = await call('POST', '/api/collab/register', ngoBody({ district_name: 'Chennai', email: 'x@y.org' }));
    ok(chennaiNgo.status === 400 && chennaiNgo.data.field === 'zone', 'Chennai NGO needs a zone');
    const ngo = await call('POST', '/api/collab/register', ngoBody());
    ok(ngo.status === 201 && ngo.data.session.access_token.startsWith('tnvngo.'), 'NGO registers and gets a session');
    const dup = await call('POST', '/api/collab/register', ngoBody({ email: 'priya.k@example.com' }));
    ok(dup.status === 409, "NGO can't reuse a volunteer's email");
    const ngoId = ngo.data.profile.id;

    // --- Search and link ---
    const search = await call('GET', '/api/collab/search?q=green');
    ok(search.data.results.length === 1 && search.data.results[0].id === ngoId, 'Registered NGO appears in search');
    ok(!('org_email' in search.data.results[0]) && !('password_hash' in search.data.results[0]), 'Search shows no contact details or password');

    const linked = await call('POST', '/api/register', volunteer({
      full_name: 'Arun Raj', email: 'arun@example.com', phone: '9876500000', district_id: 4, zone: '', ward: '',
      affiliation: 'NGO', organization_name: 'Green Hands Trust', ngo_id: ngoId
    }));
    ok(linked.status === 201, 'Volunteer registers linked to the NGO');

    // --- Admin queue carries the extras ---
    const queue = await call('GET', '/api/admin/queue', undefined, adminToken);
    const priya = queue.data.queue.find(p => p.email === 'priya.k@example.com');
    const arun = queue.data.queue.find(p => p.email === 'arun@example.com');
    ok(priya.zone === 13 && priya.ward === 173 && priya.zone_name === 'Adyar', 'Queue shows Chennai zone and ward');
    ok(arun.ngo_id === ngoId && arun.ngo_name === 'Green Hands Trust', 'Queue shows the linked NGO');

    // --- Admin collaboration list and decision ---
    const collab = await call('GET', '/api/admin/collab', undefined, adminToken);
    const app = collab.data.applications.find(a => a.id === ngoId);
    ok(app && app.member_count === 1 && !('password_hash' in app), 'Admin sees the NGO with its member count, without the password');
    const reject = await call('POST', '/api/admin/collab/decision', { id: ngoId, decision: 'rejected' }, adminToken);
    ok(reject.status === 400, 'Rejecting needs a remark');
    const approve = await call('POST', '/api/admin/collab/decision', { id: ngoId, decision: 'approved' }, adminToken);
    ok(approve.status === 200 && approve.data.application.status === 'approved', 'Admin approves the NGO');
    const notAdmin = await call('GET', '/api/admin/collab', undefined, priyaToken);
    ok(notAdmin.status === 403, 'Volunteers cannot list applications');

    // --- NGO sign-in and portal ---
    const ngoLogin = await call('POST', '/api/login', { username: 'login@greenhands.org', password: 'trust123' });
    ok(ngoLogin.status === 200 && ngoLogin.data.profile.role === 'ngo', 'NGO signs in with its email');
    const portal = await call('GET', '/api/ngo/me', undefined, ngoLogin.data.session.access_token);
    ok(portal.data.organisation.status === 'approved' && portal.data.members.length === 1 && portal.data.members[0].full_name === 'Arun Raj', 'NGO portal lists its members');
    ok(!('phone' in portal.data.members[0]) && !('email' in portal.data.members[0]), 'NGO portal hides member contact details');
    const ngoAsAdmin = await call('GET', '/api/admin/queue', undefined, ngoLogin.data.session.access_token);
    ok(ngoAsAdmin.status === 403, 'NGO token is not an admin token');
    const forged = await call('GET', '/api/ngo/me', undefined, ngoLogin.data.session.access_token.slice(0, -2) + 'xx');
    ok(forged.status === 401, 'A tampered NGO token is refused');

    // --- Admin access scopes ---
    const pending = await call('POST', '/api/admin/access', { profile_id: priya.id, districts: ['Chennai'], modules: ['members'] }, adminToken);
    ok(pending.status === 400, 'Only approved members can become admins');
    await call('POST', '/api/test/toggle-approval', { status: 'approved' }, priyaToken);
    const grant = await call('POST', '/api/admin/access', { profile_id: priya.id, districts: ['Chennai'], modules: ['members', 'events'] }, adminToken);
    ok(grant.status === 200, 'Master Admin makes Priya a Chennai admin');
    const priyaAgain = await call('POST', '/api/login', { username: 'priya.k@example.com', password: 'secret123' });
    ok(priyaAgain.data.profile.role === 'dept_admin', 'Priya now has the admin role');
    const scoped = await call('GET', '/api/admin/queue', undefined, priyaAgain.data.session.access_token);
    ok(scoped.status === 200 && scoped.data.queue.every(p => p.district_name === 'Chennai') && !scoped.data.queue.some(p => p.email === 'arun@example.com'), 'District admin only sees Chennai members');
    const myAccess = await call('GET', '/api/admin/my-access', undefined, priyaAgain.data.session.access_token);
    ok(myAccess.data.modules.join(',') === 'members,events', 'District admin gets only the granted sections');
    const priyaGrants = await call('POST', '/api/admin/access', { profile_id: arun.id, modules: ['members'] }, priyaAgain.data.session.access_token);
    ok(priyaGrants.status === 403, 'Only the Master Admin can grant access');
    const revoke = await call('DELETE', `/api/admin/access?profile_id=${priya.id}`, undefined, adminToken);
    ok(revoke.status === 200, 'Master Admin removes the access');
    const priyaAfter = await call('POST', '/api/login', { username: 'priya.k@example.com', password: 'secret123' });
    ok(priyaAfter.data.profile.role !== 'dept_admin', 'Priya is no longer an admin');

    // --- Message log and ₹365 programme ---
    const msg = await call('POST', '/api/admin/messages', { channel: 'whatsapp', audience: 'District: Chennai', body: 'Meeting at 5pm', recipients: [{ id: priya.id, name: 'Priya Kumar' }] }, adminToken);
    ok(msg.status === 201 && msg.data.message.recipient_count === 1, 'Message is logged');
    const msgs = await call('GET', '/api/admin/messages', undefined, adminToken);
    ok(msgs.data.messages[0].body === 'Meeting at 5pm', 'Previous notices list the message');
    const prog = await call('POST', '/api/admin/member-programme', { profile_id: arun.id, programme: 'tree' }, adminToken);
    ok(prog.status === 200, 'Member is assigned to tree planting');
    const queue2 = await call('GET', '/api/admin/queue', undefined, adminToken);
    ok(queue2.data.queue.find(p => p.id === arun.id).programme === 'tree', 'Queue shows the programme');

    // --- Event attendance ---
    const evt = await call('POST', '/api/events', { title: 'Beach Clean-up', status: 'Published', start_date: today, end_date: today }, adminToken);
    const later = await call('POST', '/api/events', { title: 'Future Drive', status: 'Published', start_date: '2099-01-01', end_date: '2099-01-01' }, adminToken);
    const priyaTok = priyaAfter.data.session.access_token;
    const notRegistered = await call('POST', '/api/event-attendance', { event_id: evt.data.event.id, status: 'present' }, priyaTok);
    ok(notRegistered.status === 403, 'Only registered volunteers mark attendance');
    await call('POST', `/api/events/${evt.data.event.id}/register`, {}, priyaTok);
    await call('POST', `/api/events/${later.data.event.id}/register`, {}, priyaTok);
    const early = await call('POST', '/api/event-attendance', { event_id: later.data.event.id, status: 'present' }, priyaTok);
    ok(early.status === 400, 'Attendance opens on the event day');
    const present = await call('POST', '/api/event-attendance', { event_id: evt.data.event.id, status: 'present' }, priyaTok);
    ok(present.status === 200 && present.data.attendance.status === 'present', 'Volunteer marks themself present');
    const absent = await call('POST', '/api/event-attendance', { event_id: evt.data.event.id, status: 'absent' }, priyaTok);
    ok(absent.status === 200, 'Volunteer can change it to absent');
    const roster = await call('GET', `/api/event-attendance?event_id=${evt.data.event.id}`, undefined, adminToken);
    ok(roster.data.attendance.length === 1 && roster.data.attendance[0].status === 'absent', 'Admin sees one attendance record per volunteer');
    const mine = await call('GET', '/api/event-attendance/mine', undefined, priyaTok);
    ok(mine.data.attendance.length === 1, 'Volunteer sees their own attendance');

    // --- Public portfolio ---
    const pendingPortfolio = await call('GET', `/api/portfolio/TNV-XYZ-9999`);
    ok(pendingPortfolio.status === 404, 'Unknown TNV ID has no portfolio');
    const priyaProfile = await call('GET', '/api/my-portfolio', undefined, priyaTok);
    ok(priyaProfile.data.available && priyaProfile.data.public && /^TNV-/.test(priyaProfile.data.tnv_id), 'Approved member has a public portfolio by default');
    const tnvId = priyaProfile.data.tnv_id;
    const portfolio = await call('GET', `/api/portfolio/${tnvId.toLowerCase()}`);
    ok(portfolio.status === 200 && portfolio.data.portfolio.full_name === 'Priya Kumar', 'Portfolio is public (no sign-in) and case-insensitive');
    const pf = portfolio.data.portfolio;
    ok(pf.stats.events === 2 && pf.stats.present === 0 && pf.events.some(e => e.attendance === 'absent'), 'Portfolio counts events and attendance');
    ok(pf.zone === 'Zone 13 – Adyar' && pf.district_name === 'Chennai', 'Portfolio shows district and zone');
    const leaked = ['phone', 'email', 'address', 'dob', 'aadhaar_enc', 'aadhaar_last4', 'blood_group', 'ward', 'password', 'gender'].filter(k => k in pf);
    ok(leaked.length === 0 && !JSON.stringify(pf).includes('9876543210') && !JSON.stringify(pf).includes('priya.k@example.com'), 'Portfolio leaks no private details');
    const arunPortfolio = await call('GET', '/api/portfolio/TNV-COI-0001');
    ok(arunPortfolio.status === 404, 'Pending members have no portfolio');
    await call('POST', '/api/my-portfolio', { public: false }, priyaTok);
    const hidden = await call('GET', `/api/portfolio/${tnvId}`);
    ok(hidden.status === 404 && hidden.data.private === true, 'Member can make their portfolio private');
    await call('POST', '/api/my-portfolio', { public: true }, priyaTok);
    const shownAgain = await call('GET', `/api/portfolio/${tnvId}`);
    ok(shownAgain.status === 200, 'And public again');

    console.log(`\nAll ${passed} Phase 1 checks passed.`);
  } finally {
    server.close();
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

run().catch(err => {
  console.error('\nFAILED:', err.message);
  process.exit(1);
});
