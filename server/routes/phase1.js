// Phase 1 feature routes, kept out of server.js so the main handler stays readable
// and merges with parallel work stay small.
//
//  - Institution / NGO / Organisation registration, NGO sign-in and the NGO portal
//  - Registered-NGO search for the individual volunteer form
//  - Member extras that have no profiles column: Chennai zone and ward, linked NGO,
//    and the programme a ₹365 member is assigned to (food distribution / tree planting)
//  - Admin access scopes that the Master Admin grants (districts and modules)
//  - Sent-message log for the admin "Send Message" tool
//  - Event attendance: volunteers mark themselves present or absent on the event day
//
// Everything is stored with the same snapshot mechanism the events and tasks use
// (supabase_bridge get/saveSupabaseSnapshot: Supabase audit_log when hosted, a /tmp
// file locally), so no new tables or columns are needed.

const crypto = require('crypto');
const mailTemplates = require('../mail/templates');
const { CHENNAI_DISTRICT_ID, CHENNAI_ZONES, validateZoneWard } = require('../data/chennaiZones');

const KEYS = {
  collab: 'sync_collab',
  extras: 'sync_member_extras',
  access: 'sync_admin_access',
  messages: 'sync_messages',
  attendance: 'sync_event_attendance'
};

const ADMIN_ROLES = ['master_admin', 'dept_admin'];
// Admin modules the Master Admin can hand out
const ADMIN_MODULES = ['members', 'collab', 'payments', 'birthdays', 'messages', 'calls', 'events', 'tasks', 'certificates', 'donations', 'questions'];
const PROGRAMMES = ['food', 'tree'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[6-9]\d{9}$/;
const NGO_TOKEN_PREFIX = 'tnvngo.';
const NGO_TOKEN_TTL_MS = 7 * 24 * 3600 * 1000;

function createPhase1({ supabaseBridge, getAuthUser, sendJson, inMemoryProfiles, secretKey, events, tasks, certificates, districts = [], notify = async () => {} }) {
  // ---------------------------------------------------------------------------
  // Storage helpers
  // ---------------------------------------------------------------------------
  async function loadList(key) {
    const snap = await supabaseBridge.getSupabaseSnapshot(key);
    if (Array.isArray(snap)) return snap;
    if (snap && Array.isArray(snap.items)) return snap.items;
    return [];
  }
  const saveList = (key, list) => supabaseBridge.saveSupabaseSnapshot(key, list);

  async function loadMap(key) {
    const snap = await supabaseBridge.getSupabaseSnapshot(key);
    if (snap && typeof snap === 'object' && !Array.isArray(snap) && snap.records && typeof snap.records === 'object') {
      return snap.records;
    }
    return {};
  }
  const saveMap = (key, map) => supabaseBridge.saveSupabaseSnapshot(key, { records: map });

  function readJson(req, limit = 3 * 1024 * 1024) {
    return new Promise((resolve, reject) => {
      let size = 0;
      let raw = '';
      req.on('data', chunk => {
        size += chunk.length;
        if (size > limit) {
          reject(Object.assign(new Error('Request is too large.'), { status: 413 }));
          req.destroy();
          return;
        }
        raw += chunk;
      });
      req.on('end', () => {
        try {
          resolve(raw ? JSON.parse(raw) : {});
        } catch (_e) {
          reject(Object.assign(new Error('Invalid request body.'), { status: 400 }));
        }
      });
      req.on('error', reject);
    });
  }

  const str = v => (typeof v === 'string' ? v.trim() : '');
  const isAdmin = user => Boolean(user) && ADMIN_ROLES.includes(user.role);

  // Today as YYYY-MM-DD in India, so an event turns live at local midnight
  function todayIST() {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  }

  // ---------------------------------------------------------------------------
  // Passwords and NGO session tokens (stateless, so they work across serverless instances)
  // ---------------------------------------------------------------------------
  function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return `scrypt$${salt}$${hash}`;
  }

  function verifyPassword(password, stored) {
    if (typeof stored !== 'string' || !stored.startsWith('scrypt$')) return false;
    const [, salt, hash] = stored.split('$');
    const candidate = crypto.scryptSync(String(password || ''), salt, 64);
    const expected = Buffer.from(hash, 'hex');
    return expected.length === candidate.length && crypto.timingSafeEqual(expected, candidate);
  }

  const sign = data => crypto.createHmac('sha256', `${secretKey}:ngo-session`).update(data).digest('base64url');

  function issueNgoToken(id) {
    const payload = Buffer.from(JSON.stringify({ id, exp: Date.now() + NGO_TOKEN_TTL_MS })).toString('base64url');
    return `${NGO_TOKEN_PREFIX}${payload}.${sign(payload)}`;
  }

  function readNgoToken(token) {
    if (typeof token !== 'string' || !token.startsWith(NGO_TOKEN_PREFIX)) return null;
    const [payload, sig] = token.slice(NGO_TOKEN_PREFIX.length).split('.');
    if (!payload || !sig) return null;
    const expected = sign(payload);
    if (expected.length !== sig.length || !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) return null;
    try {
      const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
      if (!data.id || !data.exp || data.exp < Date.now()) return null;
      return data;
    } catch (_e) {
      return null;
    }
  }

  const isNgoToken = token => typeof token === 'string' && token.startsWith(NGO_TOKEN_PREFIX);

  // What an NGO (or an admin) may see of an application: never the password hash
  function publicOrg(item) {
    if (!item) return null;
    const { password_hash: _, ...rest } = item;
    return rest;
  }

  function ngoProfile(item) {
    return {
      id: item.id,
      role: 'ngo',
      username: item.email,
      email: item.email,
      full_name: item.organisation_name,
      organisation_name: item.organisation_name,
      status: item.status || 'pending',
      district_name: item.district_name,
      logo: item.logo || null,
      created_at: item.created_at
    };
  }

  async function ngoUserFromToken(token) {
    const data = readNgoToken(token);
    if (!data) return null;
    const list = await loadList(KEYS.collab);
    const item = list.find(x => x.id === data.id);
    return item ? ngoProfile(item) : null;
  }

  async function emailTakenByMember(email) {
    if (supabaseBridge.isConfigured()) {
      try {
        return !(await supabaseBridge.checkEmailAvailable(email));
      } catch (_e) {
        // Fall through to the local list
      }
    }
    return inMemoryProfiles.some(p => (p.email || '').toLowerCase() === email);
  }

  // Sign-in for NGO accounts. Returns the login response body, or null when the
  // email is not an NGO account (the caller then tries volunteer/admin sign-in).
  async function tryNgoLogin(identifier, password) {
    const email = str(identifier).toLowerCase();
    if (!EMAIL_RE.test(email)) return null;
    const list = await loadList(KEYS.collab);
    const item = list.find(x => (x.email || '').toLowerCase() === email);
    if (!item) return null;
    if (!verifyPassword(password, item.password_hash)) return { error: 'Invalid email or password.', status: 401 };
    return {
      status: 200,
      body: {
        message: 'Sign in successful',
        session: { access_token: issueNgoToken(item.id), token_type: 'bearer', expires_in: NGO_TOKEN_TTL_MS / 1000 },
        profile: ngoProfile(item)
      }
    };
  }

  // ---------------------------------------------------------------------------
  // Member extras
  // ---------------------------------------------------------------------------

  // Checks the Chennai zone / ward and the linked NGO before a volunteer is created.
  // Returns { field, error } or null.
  async function validateRegistrationExtras(body, districtId) {
    // The form requires zone and ward for Chennai. Here they are checked when sent,
    // so older clients and scripts that don't know about them keep working.
    if (Number(districtId) === CHENNAI_DISTRICT_ID && (body.zone || body.ward)) {
      const problem = validateZoneWard(body.zone, body.ward);
      if (problem) return problem;
    }
    if (body.ngo_id) {
      const list = await loadList(KEYS.collab);
      const ngo = list.find(x => x.id === body.ngo_id && x.status !== 'rejected');
      if (!ngo) return { field: 'organization_name', error: 'That organisation is no longer registered. Type its name instead.' };
    }
    return null;
  }

  async function saveRegistrationExtras(profileId, body, districtId) {
    if (!profileId) return;
    const record = {};
    if (Number(districtId) === CHENNAI_DISTRICT_ID && body.zone) {
      const zone = CHENNAI_ZONES.find(z => z.no === Number(body.zone));
      record.zone = zone ? zone.no : null;
      record.zone_name = zone ? zone.name : null;
      record.ward = Number(body.ward) || null;
    }
    if (body.ngo_id) {
      const list = await loadList(KEYS.collab);
      const ngo = list.find(x => x.id === body.ngo_id);
      if (ngo) {
        record.ngo_id = ngo.id;
        record.ngo_name = ngo.organisation_name;
      }
    }
    if (!Object.keys(record).length) return;
    try {
      const map = await loadMap(KEYS.extras);
      map[profileId] = { ...(map[profileId] || {}), ...record, updated_at: new Date().toISOString() };
      await saveMap(KEYS.extras, map);
    } catch (err) {
      console.error('Saving member extras failed:', err.message);
    }
  }

  // Adds the extras to the admin queue, and narrows it to the districts a
  // district admin was given access to
  async function decorateQueue(queue, user) {
    if (!Array.isArray(queue)) return queue;
    let extras = {};
    let access = {};
    try {
      [extras, access] = await Promise.all([loadMap(KEYS.extras), loadMap(KEYS.access)]);
    } catch (_e) {}
    let list = queue.map(row => (row && extras[row.id] ? { ...row, ...extras[row.id], updated_at: row.updated_at } : row));
    const scope = user && user.role === 'dept_admin' ? access[user.id] : null;
    if (scope && Array.isArray(scope.districts) && scope.districts.length) {
      const allowed = new Set(scope.districts.map(d => String(d).toLowerCase()));
      list = list.filter(row => row && allowed.has(String(row.district_name || '').toLowerCase()));
    }
    return list;
  }

  // ---------------------------------------------------------------------------
  // Admin access
  // ---------------------------------------------------------------------------
  async function setRole(profileId, role) {
    if (supabaseBridge.isConfigured() && supabaseBridge.setProfileRole) {
      const ok = await supabaseBridge.setProfileRole(profileId, role);
      if (ok) return true;
    }
    const p = inMemoryProfiles.find(x => x.id === profileId);
    if (!p) return false;
    p.role = role;
    return true;
  }

  async function findMember(profileId) {
    if (supabaseBridge.isConfigured()) {
      const p = await supabaseBridge.getProfileById(profileId);
      if (p) return p;
    }
    return inMemoryProfiles.find(x => x.id === profileId) || null;
  }

  // ---------------------------------------------------------------------------
  // Event attendance
  // ---------------------------------------------------------------------------
  function registrationMatches(user, reg) {
    if (!user || !reg) return false;
    const uid = String(user.id || '');
    const tnv = String(user.tnv_id || '');
    const mail = String(user.email || '').toLowerCase();
    const rid = String(reg.user_id || '');
    return Boolean(
      (uid && rid && uid === rid) ||
      (tnv && rid && tnv === rid) ||
      (mail && String(reg.volunteer_email || '').toLowerCase() === mail)
    );
  }

  // Attendance can be marked from the event date until the day after it ends
  function attendanceWindow(evt) {
    const start = String(evt.start_date || '').slice(0, 10);
    const endBase = String(evt.end_date || evt.start_date || '').slice(0, 10);
    if (!start) return { open: false, reason: 'This event has no date yet.' };
    const end = new Date(`${endBase}T00:00:00Z`);
    end.setUTCDate(end.getUTCDate() + 1);
    const lastDay = end.toISOString().slice(0, 10);
    const today = todayIST();
    if (evt.status === 'Cancelled') return { open: false, reason: 'This event was cancelled.' };
    if (today < start) return { open: false, reason: 'You can mark attendance from the event day.' };
    if (today > lastDay) return { open: false, reason: 'Attendance for this event has closed.' };
    return { open: true };
  }

  // ---------------------------------------------------------------------------
  // Public volunteer portfolio
  // Every approved member has one at /volunteer/<name>-<tnv id>, unless they hide it.
  // Only public-safe fields leave the server: never phone, email, address, Aadhaar,
  // date of birth, blood group or ward.
  // ---------------------------------------------------------------------------
  const districtName = p => p.district_name || (districts.find(d => d.id === Number(p.district_id)) || {}).name || 'Tamil Nadu';
  const ROLE_NAMES = { master_admin: 'Master Admin', dept_admin: 'District Admin', district_coordinator: 'District Coordinator', wing_lead: 'Wing Lead', volunteer: 'Volunteer' };

  async function findApprovedByTnvId(tnvId) {
    const key = String(tnvId || '').trim().toLowerCase();
    if (!/^tnv-[a-z0-9]+-\d+$/.test(key)) return null;
    let p = null;
    if (supabaseBridge.isConfigured() && supabaseBridge.getProfileByTnvId) {
      try { p = await supabaseBridge.getProfileByTnvId(key); } catch (_e) {}
    }
    if (!p) p = inMemoryProfiles.find(x => String(x.tnv_id || '').toLowerCase() === key) || null;
    return p && p.status === 'approved' && !p.blocked ? p : null;
  }

  async function approvedInDistrict(p, limit) {
    if (supabaseBridge.isConfigured() && supabaseBridge.listApprovedProfiles) {
      try {
        const rows = await supabaseBridge.listApprovedProfiles({ districtId: p.district_id, limit });
        if (Array.isArray(rows) && rows.length) return rows;
      } catch (_e) {}
    }
    return inMemoryProfiles.filter(x => x.status === 'approved' && x.tnv_id && !x.blocked && Number(x.district_id) === Number(p.district_id));
  }

  async function buildPortfolio(p, extras) {
    const mine = extras[p.id] || {};
    await Promise.all([events.sync(), tasks ? tasks.sync() : null, certificates ? certificates.sync() : null]);
    const attendance = (await loadList(KEYS.attendance)).filter(a => a.user_id === p.id);
    const attendanceByEvent = Object.fromEntries(attendance.map(a => [a.event_id, a.status]));
    const templates = certificates ? certificates.list() : [];

    const evts = events.registrations()
      .filter(r => registrationMatches(p, r))
      .map(r => {
        const e = events.list().find(x => x.id === r.event_id);
        if (!e || e.status === 'Draft' || e.status === 'Cancelled') return null;
        const certified = templates.some(t => t.event_id === e.id && String(t.status || '').toUpperCase() === 'PUBLISHED');
        return {
          id: e.id,
          title: e.title,
          category: e.category || (Array.isArray(e.tags) && e.tags[0]) || '',
          district: e.district || '',
          start_date: e.start_date || '',
          end_date: e.end_date || e.start_date || '',
          status: e.status,
          attendance: attendanceByEvent[e.id] || null,
          certificate: certified
        };
      })
      .filter(Boolean)
      .sort((a, b) => String(b.start_date).localeCompare(String(a.start_date)));

    const myTasks = (tasks ? tasks.list() : []).filter(t => t.assignee_id === p.id);
    const doneTasks = myTasks.filter(t => t.status === 'COMPLETED');

    const others = (await approvedInDistrict(p, 13))
      .filter(x => x.id !== p.id && !(extras[x.id] && extras[x.id].portfolio_hidden))
      .slice(0, 6)
      .map(x => ({
        full_name: x.full_name,
        tnv_id: x.tnv_id,
        photo_path: x.photo_path || null,
        district_name: districtName(x),
        since: x.approved_at || x.created_at || null
      }));

    const orgName = mine.ngo_name || (p.affiliation && p.affiliation !== 'Individual' ? p.organization_name : null);

    return {
      full_name: p.full_name,
      tnv_id: p.tnv_id,
      photo_path: p.photo_path || p.photo_url || null,
      role: ROLE_NAMES[p.role] || p.role || p.preferred_designation || 'Volunteer',
      preferred_designation: p.preferred_designation || null,
      wing: p.wing_name || (p.wing_to_join ? String(p.wing_to_join).split('—')[0].trim() : null),
      department: p.department || null,
      mode_of_work: p.mode_of_work || null,
      district_name: districtName(p),
      assembly_constituency: p.assembly_constituency || null,
      zone: mine.zone_name ? `Zone ${mine.zone} – ${mine.zone_name}` : null,
      organisation: orgName || null,
      organisation_linked: Boolean(mine.ngo_id),
      past_field_work: Array.isArray(p.past_field_work) ? p.past_field_work.filter(x => x && x !== 'Fresher') : [],
      member_since: p.created_at || null,
      approved_at: p.approved_at || null,
      programme: mine.programme || null,
      events: evts,
      stats: {
        events: evts.length,
        present: evts.filter(e => e.attendance === 'present').length,
        certificates: evts.filter(e => e.certificate).length,
        tasks_completed: doneTasks.length,
        tasks_total: myTasks.length,
        points: doneTasks.reduce((sum, t) => sum + (Number(t.points) || 0), 0),
        districts_served: new Set(evts.map(e => e.district).filter(Boolean)).size
      },
      peers: others
    };
  }

  // ---------------------------------------------------------------------------
  // Route handler. Returns true when it answered the request.
  // ---------------------------------------------------------------------------
  async function handle(req, res, pathname, query) {
    const method = req.method;
    const fail = (status, error, extra = {}) => sendJson(res, status, { ok: false, error, ...extra });

    try {
      // ---- Public: Institution / NGO / Organisation registration ----
      if (method === 'POST' && pathname === '/api/collab/register') {
        const body = await readJson(req);
        const org = {
          organisation_name: str(body.organisation_name),
          category: str(body.category),
          reg_number: str(body.reg_number),
          website: str(body.website),
          org_email: str(body.org_email).toLowerCase(),
          org_phone: str(body.org_phone).replace(/[\s-]/g, ''),
          poc_name: str(body.poc_name),
          poc_designation: str(body.poc_designation),
          poc_phone: str(body.poc_phone).replace(/[\s-]/g, ''),
          poc_email: str(body.poc_email).toLowerCase(),
          district_name: str(body.district_name),
          address: str(body.address),
          volunteer_strength: str(body.volunteer_strength),
          interests: Array.isArray(body.interests) ? body.interests.map(str).filter(Boolean).slice(0, 20) : [],
          proposal: str(body.proposal),
          email: str(body.email).toLowerCase()
        };
        const logo = typeof body.logo === 'string' ? body.logo : '';

        const checks = [
          [!org.organisation_name, 'organisation_name', 'Enter the organisation name.'],
          [!/^data:image\/(png|jpe?g|webp);base64,/.test(logo), 'logo', 'Upload your organisation logo.'],
          [logo.length > 400 * 1024, 'logo', 'The logo is too large. Use an image under 300 KB.'],
          [!EMAIL_RE.test(org.org_email), 'org_email', 'Enter the organisation email address.'],
          [!PHONE_RE.test(org.org_phone), 'org_phone', 'Enter the organisation phone number (10 digits).'],
          [!org.poc_name, 'poc_name', 'Enter the point of contact’s name.'],
          [!org.poc_designation, 'poc_designation', 'Enter the point of contact’s designation.'],
          [!PHONE_RE.test(org.poc_phone), 'poc_phone', 'Enter the point of contact’s mobile number (10 digits).'],
          [org.poc_email && !EMAIL_RE.test(org.poc_email), 'poc_email', 'Enter a valid email for the point of contact.'],
          [!org.district_name, 'district_name', 'Choose a district.'],
          [org.interests.length === 0, 'interests', 'Choose at least one area of collaboration.'],
          [org.proposal.length < 20, 'proposal', 'Describe your proposed initiative in a few sentences.'],
          [!EMAIL_RE.test(org.email), 'email', 'Enter the email address you will sign in with.'],
          [typeof body.password !== 'string' || body.password.length < 6, 'password', 'Password must be at least 6 characters.']
        ];
        const bad = checks.find(([cond]) => cond);
        if (bad) return fail(400, bad[2], { field: bad[1] });

        if (org.district_name.toLowerCase() === 'chennai') {
          const problem = validateZoneWard(body.zone, body.ward);
          if (problem) return fail(400, problem.error, { field: problem.field });
          const zone = CHENNAI_ZONES.find(z => z.no === Number(body.zone));
          org.zone = zone.no;
          org.zone_name = zone.name;
          org.ward = Number(body.ward);
        }

        const list = await loadList(KEYS.collab);
        if (list.some(x => (x.email || '').toLowerCase() === org.email) || (await emailTakenByMember(org.email))) {
          return fail(409, 'An account already uses this email. Sign in instead, or use another email.', { field: 'email' });
        }

        const item = {
          id: `org_${crypto.randomUUID().slice(0, 12)}`,
          ...org,
          logo,
          password_hash: hashPassword(body.password),
          status: 'pending',
          remarks: '',
          created_at: new Date().toISOString()
        };
        list.unshift(item);
        await saveList(KEYS.collab, list);
        await notify({ to: org.email, toName: org.poc_name, ...mailTemplates.ngoReceived(org), kind: 'ngo', meta: { org_id: item.id } });

        return sendJson(res, 201, {
          ok: true,
          message: 'Application received. Our team reviews every application within 72 hours.',
          profile: ngoProfile(item),
          session: { access_token: issueNgoToken(item.id), token_type: 'bearer', expires_in: NGO_TOKEN_TTL_MS / 1000 }
        }), true;
      }

      // ---- Public: search registered organisations (individual registration dropdown) ----
      if (method === 'GET' && pathname === '/api/collab/search') {
        const q = str(query.q).toLowerCase();
        const list = await loadList(KEYS.collab);
        const results = list
          .filter(x => x.status !== 'rejected')
          .filter(x => !q || (x.organisation_name || '').toLowerCase().includes(q))
          .sort((a, b) => (a.organisation_name || '').localeCompare(b.organisation_name || ''))
          .slice(0, 15)
          .map(x => ({ id: x.id, organisation_name: x.organisation_name, district_name: x.district_name, category: x.category || '' }));
        return sendJson(res, 200, { ok: true, results }), true;
      }

      // ---- Public: a volunteer's portfolio ----
      if (method === 'GET' && pathname.startsWith('/api/portfolio/')) {
        const key = decodeURIComponent(pathname.slice('/api/portfolio/'.length));
        const p = await findApprovedByTnvId(key);
        if (!p) return fail(404, 'No public portfolio was found for this volunteer.'), true;
        const extras = await loadMap(KEYS.extras);
        if (extras[p.id] && extras[p.id].portfolio_hidden) {
          return fail(404, 'This volunteer has chosen to keep their portfolio private.', { private: true }), true;
        }
        return sendJson(res, 200, { ok: true, portfolio: await buildPortfolio(p, extras) }), true;
      }

      // ---- Signed-in member: their own portfolio link and whether it is public ----
      if (pathname === '/api/my-portfolio') {
        const user = await getAuthUser(req);
        if (!user || user.role === 'ngo') return fail(401, 'Please sign in.'), true;
        const extras = await loadMap(KEYS.extras);
        if (method === 'POST') {
          const body = await readJson(req);
          extras[user.id] = { ...(extras[user.id] || {}), portfolio_hidden: !body.public, updated_at: new Date().toISOString() };
          await saveMap(KEYS.extras, extras);
        }
        if (method === 'GET' || method === 'POST') {
          return sendJson(res, 200, {
            ok: true,
            available: user.status === 'approved' && Boolean(user.tnv_id),
            tnv_id: user.tnv_id || null,
            full_name: user.full_name,
            public: !(extras[user.id] && extras[user.id].portfolio_hidden)
          }), true;
        }
      }

      // ---- NGO portal: the organisation's own application and its linked members ----
      if (method === 'GET' && pathname === '/api/ngo/me') {
        const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
        const data = readNgoToken(token);
        if (!data) return fail(401, 'Please sign in again.'), true;
        const list = await loadList(KEYS.collab);
        const item = list.find(x => x.id === data.id);
        if (!item) return fail(404, 'Organisation not found.'), true;

        const extras = await loadMap(KEYS.extras);
        const memberIds = Object.keys(extras).filter(id => extras[id] && extras[id].ngo_id === item.id);
        let profiles = [];
        if (memberIds.length) {
          if (supabaseBridge.isConfigured()) {
            try {
              const queue = await supabaseBridge.getAdminQueue(null);
              profiles = (queue || []).filter(p => memberIds.includes(p.id));
            } catch (_e) {}
          }
          if (!profiles.length) profiles = inMemoryProfiles.filter(p => memberIds.includes(p.id));
        }
        const members = profiles.map(p => ({
          id: p.id,
          full_name: p.full_name,
          district_name: p.district_name,
          status: p.status || 'pending',
          tnv_id: p.tnv_id || null,
          photo_path: p.photo_path || null,
          created_at: p.created_at || null
        }));
        return sendJson(res, 200, { ok: true, organisation: publicOrg(item), members }), true;
      }

      // Everything below needs a signed-in admin
      const isAdminRoute = pathname.startsWith('/api/admin/collab') || pathname.startsWith('/api/admin/access') ||
        pathname === '/api/admin/my-access' || pathname.startsWith('/api/admin/messages') || pathname === '/api/admin/member-programme';
      if (isAdminRoute) {
        const user = await getAuthUser(req);
        if (!isAdmin(user)) return fail(403, 'Admin sign-in required.'), true;
        const isMaster = user.role === 'master_admin';

        // ---- Collaboration applications ----
        if (method === 'GET' && pathname === '/api/admin/collab') {
          const [list, extras] = await Promise.all([loadList(KEYS.collab), loadMap(KEYS.extras)]);
          const counts = {};
          Object.values(extras).forEach(e => { if (e && e.ngo_id) counts[e.ngo_id] = (counts[e.ngo_id] || 0) + 1; });
          return sendJson(res, 200, { ok: true, applications: list.map(x => ({ ...publicOrg(x), member_count: counts[x.id] || 0 })) }), true;
        }

        if (method === 'POST' && pathname === '/api/admin/collab/decision') {
          const body = await readJson(req);
          if (!['approved', 'rejected', 'pending'].includes(body.decision)) return fail(400, 'Choose approve or reject.'), true;
          const remarks = str(body.remarks);
          if (body.decision === 'rejected' && !remarks) return fail(400, 'Add a remark explaining why the application is rejected.'), true;
          const list = await loadList(KEYS.collab);
          const item = list.find(x => x.id === body.id);
          if (!item) return fail(404, 'Application not found.'), true;
          item.status = body.decision;
          item.remarks = remarks;
          item.decided_at = new Date().toISOString();
          item.decided_by = user.full_name || user.username || 'Admin';
          await saveList(KEYS.collab, list);
          if (body.decision !== 'pending') {
            await notify({ to: item.email || item.org_email, toName: item.poc_name, ...mailTemplates.ngoDecision({ organisation_name: item.organisation_name, decision: item.status, remarks }), kind: 'ngo', meta: { org_id: item.id, decision: item.status } });
          }
          return sendJson(res, 200, { ok: true, application: publicOrg(item) }), true;
        }

        // ---- What the signed-in admin may see ----
        if (method === 'GET' && pathname === '/api/admin/my-access') {
          if (isMaster) return sendJson(res, 200, { ok: true, master: true, districts: [], modules: ADMIN_MODULES }), true;
          const access = await loadMap(KEYS.access);
          const scope = access[user.id];
          return sendJson(res, 200, {
            ok: true,
            master: false,
            districts: scope && Array.isArray(scope.districts) ? scope.districts : [],
            // A district admin without a saved scope keeps the full menu, as before
            modules: scope && Array.isArray(scope.modules) && scope.modules.length ? scope.modules : ADMIN_MODULES
          }), true;
        }

        // ---- Admin access: Master Admin only ----
        if (pathname.startsWith('/api/admin/access')) {
          if (!isMaster) return fail(403, 'Only the Master Admin can manage admin access.'), true;
          const access = await loadMap(KEYS.access);

          if (method === 'GET') {
            return sendJson(res, 200, { ok: true, modules: ADMIN_MODULES, admins: Object.entries(access).map(([id, r]) => ({ profile_id: id, ...r })) }), true;
          }

          if (method === 'POST') {
            const body = await readJson(req);
            const districts = Array.isArray(body.districts) ? body.districts.map(str).filter(Boolean) : [];
            const modules = Array.isArray(body.modules) ? body.modules.filter(m => ADMIN_MODULES.includes(m)) : [];
            if (!body.profile_id) return fail(400, 'Choose a member.'), true;
            if (!modules.length) return fail(400, 'Give access to at least one section.'), true;
            if (body.profile_id === user.id) return fail(400, "You can't change your own access."), true;
            const member = await findMember(body.profile_id);
            if (!member) return fail(404, 'Member not found.'), true;
            if (member.role === 'master_admin') return fail(400, 'The Master Admin already has full access.'), true;
            if (member.status !== 'approved') return fail(400, 'Only approved members can be made admins.'), true;
            const existing = access[body.profile_id];
            const ok = await setRole(body.profile_id, 'dept_admin');
            if (!ok) return fail(500, 'Could not update this member’s role. Please try again.'), true;
            access[body.profile_id] = {
              full_name: member.full_name,
              email: member.email,
              district_name: member.district_name || null,
              previous_role: existing ? existing.previous_role : (member.role && member.role !== 'dept_admin' ? member.role : 'volunteer'),
              districts,
              modules,
              granted_by: user.full_name || user.username || 'Master Admin',
              granted_at: existing ? existing.granted_at : new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            await saveMap(KEYS.access, access);
            return sendJson(res, 200, { ok: true, admin: { profile_id: body.profile_id, ...access[body.profile_id] } }), true;
          }

          if (method === 'DELETE') {
            const profileId = str(query.profile_id);
            const record = access[profileId];
            if (!record) return fail(404, 'This member has no admin access.'), true;
            await setRole(profileId, record.previous_role || 'volunteer');
            delete access[profileId];
            await saveMap(KEYS.access, access);
            return sendJson(res, 200, { ok: true }), true;
          }
        }

        // ---- Sent-message log ----
        if (pathname === '/api/admin/messages') {
          if (method === 'GET') {
            const list = await loadList(KEYS.messages);
            return sendJson(res, 200, { ok: true, messages: list.slice(0, 200) }), true;
          }
          if (method === 'POST') {
            const body = await readJson(req);
            const text = str(body.body);
            const recipients = Array.isArray(body.recipients) ? body.recipients.slice(0, 5000) : [];
            if (!text) return fail(400, 'Write the message.'), true;
            if (!recipients.length) return fail(400, 'Choose who should receive it.'), true;
            const record = {
              id: `msg_${crypto.randomUUID().slice(0, 12)}`,
              channel: ['whatsapp', 'email', 'sms'].includes(body.channel) ? body.channel : 'whatsapp',
              audience: str(body.audience) || 'Selected members',
              subject: str(body.subject),
              body: text,
              recipient_count: recipients.length,
              recipients: recipients.map(r => ({ id: r.id, name: str(r.name) })).slice(0, 500),
              sent_by: user.full_name || user.username || 'Admin',
              created_at: new Date().toISOString()
            };
            const list = await loadList(KEYS.messages);
            list.unshift(record);
            await saveList(KEYS.messages, list.slice(0, 500));
            return sendJson(res, 201, { ok: true, message: record }), true;
          }
        }

        // ---- ₹365 members: food distribution or tree planting ----
        if (method === 'POST' && pathname === '/api/admin/member-programme') {
          const body = await readJson(req);
          const programme = body.programme ? String(body.programme) : '';
          if (!body.profile_id) return fail(400, 'Choose a member.'), true;
          if (programme && !PROGRAMMES.includes(programme)) return fail(400, 'Unknown programme.'), true;
          const map = await loadMap(KEYS.extras);
          map[body.profile_id] = { ...(map[body.profile_id] || {}), programme: programme || null, updated_at: new Date().toISOString() };
          await saveMap(KEYS.extras, map);
          return sendJson(res, 200, { ok: true, profile_id: body.profile_id, programme: programme || null }), true;
        }

        return false;
      }

      // ---- Event attendance ----
      if (pathname === '/api/event-attendance' || pathname === '/api/event-attendance/mine') {
        const user = await getAuthUser(req);
        if (!user || user.role === 'ngo') return fail(401, 'Please sign in to mark attendance.', { require_login: true }), true;
        const list = await loadList(KEYS.attendance);

        if (method === 'GET' && pathname === '/api/event-attendance/mine') {
          return sendJson(res, 200, { ok: true, attendance: list.filter(a => a.user_id === user.id) }), true;
        }

        if (method === 'GET') {
          if (!isAdmin(user)) return fail(403, 'Admin sign-in required.'), true;
          const eventId = str(query.event_id);
          return sendJson(res, 200, { ok: true, attendance: eventId ? list.filter(a => a.event_id === eventId) : list }), true;
        }

        if (method === 'POST') {
          const body = await readJson(req);
          const status = body.status === 'absent' ? 'absent' : body.status === 'present' ? 'present' : null;
          if (!status) return fail(400, 'Choose present or absent.'), true;
          await events.sync();
          const evt = events.list().find(e => e.id === body.event_id);
          if (!evt) return fail(404, 'Event not found.'), true;
          if (!events.registrations().some(r => r.event_id === evt.id && registrationMatches(user, r))) {
            return fail(403, 'Only volunteers registered for this event can mark attendance.'), true;
          }
          const win = attendanceWindow(evt);
          if (!win.open) return fail(400, win.reason), true;
          const existing = list.find(a => a.event_id === evt.id && a.user_id === user.id);
          const record = {
            id: existing ? existing.id : `att_${crypto.randomUUID().slice(0, 12)}`,
            event_id: evt.id,
            user_id: user.id,
            volunteer_name: user.full_name || user.username,
            status,
            marked_at: new Date().toISOString()
          };
          const next = [record, ...list.filter(a => a !== existing)];
          await saveList(KEYS.attendance, next);
          return sendJson(res, 200, { ok: true, attendance: record }), true;
        }
      }
    } catch (err) {
      if (!res.headersSent) fail(err.status || 500, err.status ? err.message : 'Something went wrong. Please try again.');
      if (!err.status) console.error('[phase1]', err);
      return true;
    }

    return false;
  }

  return {
    handle,
    isNgoToken,
    ngoUserFromToken,
    tryNgoLogin,
    validateRegistrationExtras,
    saveRegistrationExtras,
    decorateQueue,
    ADMIN_MODULES
  };
}

module.exports = { createPhase1, ADMIN_MODULES };
