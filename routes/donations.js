// Donations: public giving, 80G receipts, crowdfunding campaigns, beneficiaries,
// coordinator field collections, in-kind gifts and recurring pledges.
//
// Rules this module enforces:
//  - Only admins (Master Admin, District Admin) can read the registers or change
//    anything. Campaign listings are public, with donor details reduced to name,
//    amount and date (anonymous donors stay anonymous).
//  - A donation is recorded as "pending verification" until an admin confirms the
//    money reached the bank. Only then does it get an 80G receipt number, count
//    towards its campaign, and get emailed to the donor.
//  - Receipt PDFs and the public receipt check only work for real, verified
//    donations. A receipt PDF needs an admin sign-in or the signed link that is
//    emailed to the donor.
//  - Everything is saved with the same snapshot store the rest of the portal uses,
//    so it survives restarts and serverless cold starts.

const crypto = require('crypto');
const ORG = require('../data/org');

const KEYS = {
  donations: 'donations', // existing key: keeps donations recorded before this change
  campaigns: 'sync_campaigns',
  beneficiaries: 'sync_beneficiaries',
  collections: 'sync_field_collections',
  inKind: 'sync_inkind_donations',
  pledges: 'sync_recurring_pledges'
};
const proofKey = id => `donation_proof_${id}`;

const PHONE_RE = /^[6-9]\d{9}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PAN_RE = /^[A-Z]{5}\d{4}[A-Z]$/;
const UTR_RE = /^\d{12}$/;
const MAX_DONATION = 1000000; // ₹10 lakh per online entry; larger gifts are recorded by an admin

const CAMPAIGN_STATUSES = ['DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED'];
const CAMPAIGN_CATEGORIES = ['Education', 'Environment', 'Disaster Relief', 'Healthcare', 'Civic Action', 'Nutrition'];
const BENEFICIARY_STATUSES = ['APPLIED', 'VERIFIED', 'AID_DISBURSED', 'REJECTED'];
const INKIND_STATUSES = ['RECEIVED', 'IN_TRANSIT', 'DISTRIBUTED'];
const PLEDGE_STATUSES = ['ACTIVE', 'PAUSED', 'CANCELLED'];
const PLEDGE_FREQUENCIES = { MONTHLY: 1, QUARTERLY: 3, YEARLY: 12 };

const str = v => (typeof v === 'string' ? v.trim() : v == null ? '' : String(v).trim());
const money = v => Math.round(Number(v) * 100) / 100;
const todayIST = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
const yearIST = (d = new Date()) => Number(new Date(d).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }).slice(0, 4));
const newId = prefix => `${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;

function addMonths(isoDate, months, day) {
  const [y, m] = isoDate.split('-').map(Number);
  const total = (y * 12 + (m - 1)) + months;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  const last = new Date(Date.UTC(ny, nm, 0)).getUTCDate();
  return `${ny}-${String(nm).padStart(2, '0')}-${String(Math.min(day, last)).padStart(2, '0')}`;
}

function readBody(req, limit = 3 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', c => {
      raw += c;
      if (raw.length > limit) { reject(new Error('too large')); req.destroy(); }
    });
    req.on('end', () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch (_e) { resolve({}); } });
    req.on('error', reject);
  });
}

function createDonations({ supabaseBridge, getAuthUser, sendJson, secretKey, notify, mailTemplates, publicBaseUrl, generateDonationReceiptPdfBinary }) {
  // ---- storage ----
  async function loadList(key) {
    try {
      const snap = await supabaseBridge.getSupabaseSnapshot(key);
      if (Array.isArray(snap)) return snap;
      if (snap && Array.isArray(snap.items)) return snap.items;
    } catch (_e) {}
    return [];
  }
  const saveList = (key, list) => supabaseBridge.saveSupabaseSnapshot(key, list);

  // ---- access ----
  const isAdmin = u => Boolean(u) && (u.role === 'master_admin' || u.role === 'dept_admin' || u.role === 'admin');
  // getAuthUser also accepts ?t=<token>, used by links opened in a new tab (receipt PDFs)
  async function adminFrom(req) {
    let user = null;
    try { user = await getAuthUser(req); } catch (_e) {}
    return isAdmin(user) ? user : null;
  }

  // Signed receipt links for donors (emailed and shown on the public check)
  const receiptSig = receiptNo => crypto.createHmac('sha256', `${secretKey}:donation-receipt`).update(String(receiptNo).toUpperCase()).digest('hex').slice(0, 16);
  const receiptPath = receiptNo => `/api/receipts/${encodeURIComponent(receiptNo)}.pdf?k=${receiptSig(receiptNo)}`;
  const sigOk = (receiptNo, k) => {
    const want = Buffer.from(receiptSig(receiptNo));
    const got = Buffer.from(String(k || ''));
    return want.length === got.length && crypto.timingSafeEqual(want, got);
  };

  // ---- receipts ----
  async function nextReceiptNo(list) {
    const year = yearIST();
    const prefix = `TNV-DON-${year}-`;
    const max = list
      .map(d => String(d.receipt_no || ''))
      .filter(no => no.startsWith(prefix))
      .map(no => Number(no.slice(prefix.length)) || 0)
      .reduce((a, b) => Math.max(a, b), 0);
    return `${prefix}${String(max + 1).padStart(4, '0')}`;
  }

  async function findDonationByReceipt(receiptNo) {
    const key = String(receiptNo || '').toUpperCase();
    const list = await loadList(KEYS.donations);
    return list.find(d => String(d.receipt_no || '').toUpperCase() === key) || null;
  }

  function receiptPdf(d) {
    return generateDonationReceiptPdfBinary({
      receiptNo: d.receipt_no,
      paidAt: d.verified_at || d.created_at,
      donorName: d.donor_name,
      phone: d.donor_phone,
      email: d.donor_email,
      pan: d.pan_number,
      gatewayRef: d.utr || d.payment_channel,
      amount: d.amount,
      tierLabel: d.tier_label,
      isAnonymous: d.is_anonymous
    });
  }

  const maskPhone = p => (p ? `${String(p).slice(0, 2)}******${String(p).slice(-2)}` : null);
  const maskPan = p => (p ? `${String(p).slice(0, 2)}XXXXX${String(p).slice(-3)}` : null);

  // What admins see in lists (proof images are fetched one at a time)
  const adminDonation = d => {
    const { screenshot, ...rest } = d;
    return { ...rest, has_proof: Boolean(d.has_proof || screenshot) };
  };

  // What the public sees about a campaign
  function publicCampaign(c, donations) {
    const verified = donations.filter(d => d.campaign_id === c.id && d.status === 'verified');
    return {
      id: c.id,
      title: c.title,
      category: c.category,
      target_amount: c.target_amount,
      raised_amount: money(verified.reduce((s, d) => s + Number(d.amount || 0), 0) + Number(c.offline_raised || 0)),
      donor_count: verified.length + Number(c.offline_donor_count || 0),
      end_date: c.end_date,
      story: c.story,
      cover_image: c.cover_image || null,
      status: c.status,
      featured: Boolean(c.featured),
      created_at: c.created_at,
      donors: verified.slice(0, 50).map(d => ({
        donor_name: d.is_anonymous ? 'Anonymous supporter' : d.donor_name,
        amount: d.amount,
        created_at: d.verified_at || d.created_at
      }))
    };
  }

  // ---- validation ----
  function validateDonation(body, { admin }) {
    const amount = money(body.amount);
    const isAnonymous = Boolean(body.is_anonymous);
    const donorName = str(body.donor_name).slice(0, 120);
    const phone = str(body.donor_phone).replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '');
    const email = str(body.donor_email).toLowerCase();
    const pan = str(body.pan_number || body.pan).toUpperCase();
    const utr = str(body.utr).replace(/\s/g, '');
    const screenshot = typeof body.screenshot === 'string' ? body.screenshot : '';
    const channel = str(body.payment_channel) || (admin ? 'Bank transfer' : 'UPI');

    if (!Number.isFinite(amount) || amount < 1) return { error: 'Enter an amount of at least ₹1.', field: 'amount' };
    if (!admin && amount > MAX_DONATION) return { error: 'For gifts above ₹10,00,000 please contact us so we can issue the receipt correctly.', field: 'amount' };
    if (!isAnonymous && donorName.length < 2) return { error: 'Enter the donor’s full name, or choose to give anonymously.', field: 'donor_name' };
    if (!PHONE_RE.test(phone)) return { error: 'Enter a valid 10-digit mobile number.', field: 'donor_phone' };
    if (email && !EMAIL_RE.test(email)) return { error: 'Enter a valid email address.', field: 'donor_email' };
    if (pan && !PAN_RE.test(pan)) return { error: 'PAN should look like ABCDE1234F.', field: 'pan_number' };
    if (screenshot && !/^data:image\/(png|jpe?g|webp);base64,/.test(screenshot)) return { error: 'Upload the payment screenshot as a PNG or JPG image.', field: 'screenshot' };
    if (screenshot.length > 1.5 * 1024 * 1024) return { error: 'The screenshot is too large. Please upload a smaller image.', field: 'screenshot' };
    const cashOrCheque = admin && /cash|cheque|dd/i.test(channel);
    if (!cashOrCheque) {
      if (utr && !UTR_RE.test(utr)) return { error: 'The UPI/bank reference (UTR) is the 12-digit number in your payment app.', field: 'utr' };
      if (!utr && !screenshot) return { error: 'Enter the 12-digit UTR number or upload the payment screenshot.', field: 'utr' };
    }
    return {
      value: {
        amount,
        is_anonymous: isAnonymous,
        donor_name: isAnonymous ? 'Anonymous supporter' : donorName,
        donor_phone: phone,
        donor_email: email || null,
        pan_number: pan || null,
        utr: utr || null,
        payment_channel: channel,
        screenshot
      }
    };
  }

  // ---- donation verification (shared by the button and the walk-in desk) ----
  async function issueReceipt(list, d, adminUser) {
    d.status = 'verified';
    d.receipt_no = d.receipt_no || await nextReceiptNo(list);
    d.verified_at = new Date().toISOString();
    d.verified_by = adminUser.full_name || adminUser.username || adminUser.id;
    d.rejection_reason = null;
  }

  async function emailReceipt(d, req) {
    if (!d.donor_email || !notify || !mailTemplates || !mailTemplates.donationReceipt) return;
    await notify({
      to: d.donor_email,
      toName: d.is_anonymous ? null : d.donor_name,
      ...mailTemplates.donationReceipt({
        donor_name: d.is_anonymous ? 'friend' : d.donor_name,
        amount: d.amount,
        receipt_no: d.receipt_no,
        campaign_title: d.campaign_title,
        receipt_url: `${publicBaseUrl(req)}${receiptPath(d.receipt_no)}`,
        verify_url: `${publicBaseUrl(req)}/verify/donation/${encodeURIComponent(d.receipt_no)}`
      }),
      kind: 'donation',
      meta: { donation_id: d.id, receipt_no: d.receipt_no },
      idempotencyKey: `donation-receipt-${d.receipt_no}`
    });
  }

  // ---- generic register helpers ----
  function requireFields(body, fields) {
    for (const [key, label] of fields) if (!str(body[key])) return `${label} is required.`;
    return null;
  }

  async function handle(req, res, pathname, query = {}) {
    const method = req.method;
    const fail = (status, error, extra = {}) => (sendJson(res, status, { ok: false, success: false, error, ...extra }), true);
    const ok = (data, status = 200) => (sendJson(res, status, { ok: true, success: true, ...data }), true);
    const body = async () => {
      try { return await readBody(req); } catch (_e) { return {}; }
    };

    try {
      // =================================================================
      // Donations
      // =================================================================
      if (pathname === '/api/donations' && method === 'POST') {
        const admin = await adminFrom(req);
        const input = await body();
        const v = validateDonation(input, { admin: Boolean(admin) });
        if (v.error) return fail(400, v.error, { field: v.field });

        const list = await loadList(KEYS.donations);
        if (v.value.utr && list.some(d => d.utr === v.value.utr && d.status !== 'rejected')) {
          return fail(409, 'A donation with this UTR number is already recorded. If you paid twice, contact us with both references.', { field: 'utr' });
        }

        const campaigns = await loadList(KEYS.campaigns);
        const campaignId = str(input.campaign_id);
        const camp = campaignId ? campaigns.find(c => c.id === campaignId) : null;
        if (campaignId && (!camp || camp.status !== 'ACTIVE')) return fail(400, 'This campaign is not open for donations right now.', { field: 'campaign_id' });

        let viewer = null;
        try { viewer = await getAuthUser(req); } catch (_e) {}
        const { screenshot, ...value } = v.value;
        const d = {
          id: newId('don'),
          ...value,
          has_proof: Boolean(screenshot),
          tier_label: str(input.tier_label).slice(0, 120) || (camp ? `Campaign: ${camp.title}` : 'General donation'),
          campaign_id: camp ? camp.id : null,
          campaign_title: camp ? camp.title : null,
          volunteer_id: viewer && !admin ? viewer.id : null,
          source: admin ? 'admin_desk' : 'online',
          recorded_by: admin ? (admin.full_name || admin.username) : null,
          status: 'pending_verification',
          receipt_no: null,
          created_at: new Date().toISOString()
        };
        if (screenshot) await saveList(proofKey(d.id), [screenshot]);

        // The admin desk can confirm money already received (cash counted, bank credit seen)
        const confirmNow = Boolean(admin && input.confirm_received);
        if (confirmNow) await issueReceipt(list, d, admin);

        list.unshift(d);
        await saveList(KEYS.donations, list);
        if (confirmNow) await emailReceipt(d, req);

        return ok({
          status: d.status,
          reference: d.id,
          receipt_no: d.receipt_no,
          amount: d.amount,
          pdf_url: d.receipt_no ? receiptPath(d.receipt_no) : null,
          message: confirmNow
            ? 'Donation recorded and receipt issued.'
            : 'Thank you! We will confirm the payment with our bank and send your 80G receipt' + (d.donor_email ? ' to your email.' : '.')
        }, 201);
      }

      if (pathname === '/api/donations' && method === 'GET') {
        if (!(await adminFrom(req))) return fail(403, 'Admin sign-in required.');
        const list = await loadList(KEYS.donations);
        return ok({ donations: list.map(adminDonation) });
      }

      const proofMatch = pathname.match(/^\/api\/admin\/donations\/([^/]+)\/proof$/);
      if (proofMatch && method === 'GET') {
        if (!(await adminFrom(req))) return fail(403, 'Admin sign-in required.');
        const id = decodeURIComponent(proofMatch[1]);
        let img = (await loadList(proofKey(id)))[0] || null;
        if (!img) {
          // Donations recorded before proofs were stored separately
          const d = (await loadList(KEYS.donations)).find(x => x.id === id);
          img = d && d.screenshot ? d.screenshot : null;
        }
        if (!img) return fail(404, 'No payment screenshot was uploaded for this donation.');
        return ok({ screenshot: img });
      }

      if (pathname === '/api/admin/verify-donation' && method === 'POST') {
        const admin = await adminFrom(req);
        if (!admin) return fail(403, 'Admin sign-in required.');
        const input = await body();
        const list = await loadList(KEYS.donations);
        const d = list.find(x => (input.donation_id && x.id === input.donation_id) || (input.receipt_no && x.receipt_no === input.receipt_no));
        if (!d) return fail(404, 'Donation not found.');
        const action = input.action === 'reject' || input.action === 'flag' ? 'reject' : 'verify';
        if (action === 'verify') {
          if (d.status === 'verified') return fail(409, `Already verified (receipt ${d.receipt_no}).`);
          await issueReceipt(list, d, admin);
        } else {
          if (d.status === 'verified') return fail(409, 'A verified donation with an issued receipt cannot be rejected. Cancel the receipt with your auditor instead.');
          const reason = str(input.reason);
          if (reason.length < 4) return fail(400, 'Say why the donation is being rejected (for example: no matching bank credit).', { field: 'reason' });
          d.status = 'rejected';
          d.rejection_reason = reason.slice(0, 300);
          d.rejected_at = new Date().toISOString();
          d.rejected_by = admin.full_name || admin.username || admin.id;
        }
        await saveList(KEYS.donations, list);
        if (action === 'verify') await emailReceipt(d, req);
        return ok({ donation: adminDonation(d), status: d.status, receipt_no: d.receipt_no });
      }

      // Receipt PDF: admin, or the signed link sent to the donor
      if (pathname.startsWith('/api/receipts/TNV-DON-') && method === 'GET') {
        const receiptNo = decodeURIComponent(pathname.slice('/api/receipts/'.length)).replace(/\.pdf$/i, '');
        const allowed = sigOk(receiptNo, query.k) || Boolean(await adminFrom(req));
        if (!allowed) return fail(403, 'This receipt link is not valid. Use the link in your receipt email, or ask us to resend it.');
        const d = await findDonationByReceipt(receiptNo);
        if (!d || d.status !== 'verified') return fail(404, 'Receipt not found.');
        const pdf = receiptPdf(d);
        res.writeHead(200, {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `inline; filename="${d.receipt_no}.pdf"`,
          'Content-Length': pdf.length,
          'Cache-Control': 'private, no-store'
        });
        res.end(pdf);
        return true;
      }

      // Public receipt check (QR / link on the receipt)
      if (method === 'GET' && (pathname.startsWith('/api/verify-receipt/') || pathname.startsWith('/api/verify-donation/'))) {
        const receiptNo = decodeURIComponent(pathname.replace(/^\/api\/verify-(receipt|donation)\//, '')).trim();
        const d = await findDonationByReceipt(receiptNo);
        if (!d || d.status !== 'verified') {
          return fail(404, 'This receipt number is not in Tamil Nadu Volunteers’ records.', { verified: false });
        }
        return ok({
          verified: true,
          receipt: {
            receipt_no: d.receipt_no,
            donor_name: d.is_anonymous ? 'Anonymous supporter' : d.donor_name,
            donor_phone: maskPhone(d.donor_phone),
            amount: d.amount,
            created_at: d.verified_at || d.created_at,
            status: 'verified',
            pan_number: maskPan(d.pan_number),
            tier_label: d.tier_label,
            campaign_title: d.campaign_title,
            is_anonymous: d.is_anonymous,
            reg_80g: ORG.REG_80G,
            trust_name: ORG.TRUST_NAME,
            pan_trust: ORG.TRUST_PAN,
            tax_benefit: ORG.TAX_BENEFIT
          }
        });
      }

      // A signed-in member's own donations
      if (pathname === '/api/my-donations' && method === 'GET') {
        let user = null;
        try { user = await getAuthUser(req); } catch (_e) {}
        if (!user) return fail(401, 'Please sign in.');
        const phone = String(user.phone || '').replace(/\D/g, '').slice(-10);
        const email = String(user.email || '').toLowerCase();
        const mine = (await loadList(KEYS.donations)).filter(d => d.status !== 'rejected' && (
          d.volunteer_id === user.id ||
          (email && d.donor_email && d.donor_email.toLowerCase() === email) ||
          (phone && d.donor_phone && String(d.donor_phone).slice(-10) === phone)
        ));
        const verified = mine.filter(d => d.status === 'verified');
        const total = money(verified.reduce((s, d) => s + Number(d.amount || 0), 0));
        return ok({
          donations: mine.map(d => ({
            id: d.id,
            receipt_no: d.receipt_no,
            amount: d.amount,
            campaign_title: d.campaign_title,
            tier_label: d.tier_label,
            status: d.status,
            created_at: d.created_at,
            verified_at: d.verified_at || null,
            pdf_url: d.status === 'verified' ? receiptPath(d.receipt_no) : null
          })),
          reg_80g: ORG.REG_80G,
          patron_status: {
            is_patron: verified.length > 0,
            tier: total >= 10000 ? 'Leadership patron' : total >= 1000 ? 'Patron' : total > 0 ? 'Supporter' : null,
            total_contributed: total,
            tax_exempt_amount: Math.round(total * 0.5),
            reg_80g: ORG.REG_80G
          }
        });
      }

      // =================================================================
      // Campaigns
      // =================================================================
      if ((pathname === '/api/campaigns' || pathname === '/api/campaigns/') && method === 'GET') {
        const admin = await adminFrom(req);
        const [campaigns, donations] = await Promise.all([loadList(KEYS.campaigns), loadList(KEYS.donations)]);
        const cat = str(query.category);
        const visible = campaigns
          .filter(c => admin || c.status === 'ACTIVE' || c.status === 'COMPLETED')
          .filter(c => !cat || cat === 'All' || cat === 'all' || String(c.category).toLowerCase() === cat.toLowerCase());
        return ok({
          campaigns: visible.map(c => ({
            ...publicCampaign(c, donations),
            ...(admin ? {
              offline_raised: Number(c.offline_raised || 0),
              offline_donor_count: Number(c.offline_donor_count || 0),
              pending_count: donations.filter(d => d.campaign_id === c.id && d.status === 'pending_verification').length
            } : {})
          }))
        });
      }

      const campMatch = pathname.match(/^\/api\/campaigns\/([^/]+)$/);
      if (campMatch && method === 'GET') {
        const admin = await adminFrom(req);
        const [campaigns, donations] = await Promise.all([loadList(KEYS.campaigns), loadList(KEYS.donations)]);
        const c = campaigns.find(x => x.id === decodeURIComponent(campMatch[1]));
        if (!c || (!admin && c.status === 'DRAFT')) return fail(404, 'Campaign not found.');
        return ok({ campaign: publicCampaign(c, donations) });
      }

      if ((pathname === '/api/campaigns' || campMatch) && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
        const admin = await adminFrom(req);
        if (!admin) return fail(403, 'Admin sign-in required.');
        const campaigns = await loadList(KEYS.campaigns);

        if (method === 'DELETE') {
          const id = decodeURIComponent(campMatch[1]);
          const donations = await loadList(KEYS.donations);
          if (donations.some(d => d.campaign_id === id && d.status !== 'rejected')) {
            return fail(409, 'This campaign has donations, so it cannot be deleted. Mark it completed instead.');
          }
          const next = campaigns.filter(c => c.id !== id);
          if (next.length === campaigns.length) return fail(404, 'Campaign not found.');
          await saveList(KEYS.campaigns, next);
          return ok({ deleted: id });
        }

        const input = await body();
        const isNew = method === 'POST';
        const c = isNew ? { id: newId('camp'), created_at: new Date().toISOString(), created_by: admin.full_name || admin.username } : campaigns.find(x => x.id === decodeURIComponent(campMatch[1]));
        if (!c) return fail(404, 'Campaign not found.');

        const next = { ...c };
        if (isNew || input.title !== undefined) next.title = str(input.title).slice(0, 140);
        if (isNew || input.category !== undefined) next.category = CAMPAIGN_CATEGORIES.includes(input.category) ? input.category : 'Civic Action';
        if (isNew || input.target_amount !== undefined) next.target_amount = money(input.target_amount);
        if (isNew || input.end_date !== undefined) next.end_date = str(input.end_date) || null;
        if (isNew || input.story !== undefined) next.story = str(input.story).slice(0, 4000);
        if (isNew || input.cover_image !== undefined) next.cover_image = str(input.cover_image) || null;
        if (isNew || input.status !== undefined) next.status = CAMPAIGN_STATUSES.includes(input.status) ? input.status : (isNew ? 'DRAFT' : c.status);
        if (isNew || input.featured !== undefined) next.featured = Boolean(input.featured);
        if (input.offline_raised !== undefined) next.offline_raised = Math.max(0, money(input.offline_raised) || 0);
        if (input.offline_donor_count !== undefined) next.offline_donor_count = Math.max(0, Math.floor(Number(input.offline_donor_count) || 0));

        if (!next.title || next.title.length < 5) return fail(400, 'Give the campaign a title of at least 5 characters.', { field: 'title' });
        if (!Number.isFinite(next.target_amount) || next.target_amount < 1000) return fail(400, 'Set a target of at least ₹1,000.', { field: 'target_amount' });
        if (next.end_date && (!/^\d{4}-\d{2}-\d{2}$/.test(next.end_date) || (isNew && next.end_date < todayIST()))) return fail(400, 'Choose an end date that is today or later.', { field: 'end_date' });
        if (next.cover_image && !/^(https:\/\/|\/)/.test(next.cover_image)) return fail(400, 'The cover image must be an https:// link or a path on this site.', { field: 'cover_image' });
        if (next.status === 'ACTIVE' && next.story.length < 30) return fail(400, 'Write at least a few sentences about the campaign before publishing it.', { field: 'story' });
        next.updated_at = new Date().toISOString();

        const list = isNew ? [next, ...campaigns] : campaigns.map(x => (x.id === next.id ? next : x));
        await saveList(KEYS.campaigns, list);
        const donations = await loadList(KEYS.donations);
        return ok({ campaign: { ...publicCampaign(next, donations), offline_raised: next.offline_raised || 0, offline_donor_count: next.offline_donor_count || 0 } }, isNew ? 201 : 200);
      }

      // Everything below is admin-only
      const registers = ['/api/beneficiaries', '/api/coordinator-donations', '/api/in-kind-donations', '/api/recurring-pledges'];
      if (!registers.some(p => pathname === p || pathname.startsWith(`${p}/`))) return false;
      const admin = await adminFrom(req);
      if (!admin) return fail(403, 'Admin sign-in required.');
      const by = admin.full_name || admin.username || admin.id;

      // =================================================================
      // Beneficiaries
      // =================================================================
      if (pathname.startsWith('/api/beneficiaries')) {
        const id = decodeURIComponent(pathname.slice('/api/beneficiaries'.length).replace(/^\//, ''));
        const list = await loadList(KEYS.beneficiaries);
        if (method === 'GET' && !id) return ok({ beneficiaries: list });
        if (method === 'DELETE' && id) {
          const b = list.find(x => x.id === id);
          if (!b) return fail(404, 'Record not found.');
          if (b.status === 'AID_DISBURSED') return fail(409, 'Aid has been given to this beneficiary, so the record must be kept for the audit.');
          await saveList(KEYS.beneficiaries, list.filter(x => x.id !== id));
          return ok({ deleted: id });
        }
        if (method === 'POST' || ((method === 'PUT' || method === 'PATCH') && id)) {
          const input = await body();
          const isNew = method === 'POST';
          const b = isNew ? { id: newId('ben'), created_at: new Date().toISOString(), created_by: by } : list.find(x => x.id === id);
          if (!b) return fail(404, 'Record not found.');
          const next = { ...b };
          for (const k of ['name', 'type', 'district', 'category', 'support_type', 'linked_campaign_id', 'notes', 'contact_phone']) {
            if (isNew || input[k] !== undefined) next[k] = str(input[k]).slice(0, k === 'notes' ? 2000 : 160);
          }
          if (isNew || input.amount_valuation !== undefined) next.amount_valuation = Math.max(0, money(input.amount_valuation) || 0);
          if (input.status !== undefined || isNew) {
            const status = BENEFICIARY_STATUSES.includes(input.status) ? input.status : (isNew ? 'APPLIED' : b.status);
            if (status !== b.status || isNew) {
              next.status = status;
              if (status === 'VERIFIED') { next.verified_at = new Date().toISOString(); next.verified_by = by; }
              if (status === 'AID_DISBURSED') { next.disbursed_at = new Date().toISOString(); next.disbursed_by = by; }
            }
          }
          const missing = requireFields(next, [['name', 'Beneficiary name'], ['district', 'District']]);
          if (missing) return fail(400, missing);
          if (next.contact_phone && !PHONE_RE.test(next.contact_phone.replace(/\D/g, ''))) return fail(400, 'Enter a valid 10-digit contact number.', { field: 'contact_phone' });
          if (next.status === 'AID_DISBURSED' && !(next.amount_valuation > 0)) return fail(400, 'Enter the amount or value of the aid before marking it given.', { field: 'amount_valuation' });
          next.updated_at = new Date().toISOString();
          await saveList(KEYS.beneficiaries, isNew ? [next, ...list] : list.map(x => (x.id === next.id ? next : x)));
          return ok({ beneficiary: next }, isNew ? 201 : 200);
        }
      }

      // =================================================================
      // Coordinator field collections: each coordinator has a target; each
      // collection they report is pending until the money is received at HQ.
      // =================================================================
      if (pathname.startsWith('/api/coordinator-donations')) {
        const list = await loadList(KEYS.collections);
        const totals = () => {
          const coordinators = list.map(c => {
            const entries = c.entries || [];
            const collected = money(entries.reduce((s, e) => s + Number(e.amount || 0), 0));
            const pending = money(entries.filter(e => e.status === 'PENDING').reduce((s, e) => s + Number(e.amount || 0), 0));
            return { ...c, collected_amount: collected, pending_amount: pending, remittance_status: pending > 0 ? 'PENDING_REMITTANCE' : 'RECONCILED' };
          });
          return {
            coordinators,
            total_collected: money(coordinators.reduce((s, c) => s + c.collected_amount, 0)),
            total_target: money(coordinators.reduce((s, c) => s + Number(c.target_quota || 0), 0)),
            pending_reconciliation: money(coordinators.reduce((s, c) => s + c.pending_amount, 0))
          };
        };
        if (method === 'GET' && (pathname === '/api/coordinator-donations' || pathname === '/api/coordinator-donations/')) return ok(totals());

        // New coordinator
        if (method === 'POST' && pathname === '/api/coordinator-donations') {
          const input = await body();
          const c = {
            id: newId('coord'),
            coordinator_name: str(input.coordinator_name).slice(0, 120),
            phone: str(input.phone).replace(/\D/g, ''),
            district: str(input.district).slice(0, 80),
            wing: str(input.wing).slice(0, 80),
            target_quota: Math.max(0, money(input.target_quota) || 0),
            entries: [],
            created_at: new Date().toISOString(),
            created_by: by
          };
          const missing = requireFields(c, [['coordinator_name', 'Coordinator name'], ['district', 'District']]);
          if (missing) return fail(400, missing);
          if (c.phone && !PHONE_RE.test(c.phone)) return fail(400, 'Enter a valid 10-digit mobile number.', { field: 'phone' });
          list.unshift(c);
          await saveList(KEYS.collections, list);
          return ok(totals(), 201);
        }

        // Record a collection the coordinator reports
        const collectMatch = pathname.match(/^\/api\/coordinator-donations\/([^/]+)\/collections$/);
        if (collectMatch && method === 'POST') {
          const c = list.find(x => x.id === decodeURIComponent(collectMatch[1]));
          if (!c) return fail(404, 'Coordinator not found.');
          const input = await body();
          const amount = money(input.amount);
          if (!Number.isFinite(amount) || amount < 1) return fail(400, 'Enter the amount collected.', { field: 'amount' });
          const donors = Math.max(1, Math.floor(Number(input.donor_count) || 1));
          const date = /^\d{4}-\d{2}-\d{2}$/.test(str(input.collected_on)) ? str(input.collected_on) : todayIST();
          if (date > todayIST()) return fail(400, 'The collection date cannot be in the future.', { field: 'collected_on' });
          c.entries = [{ id: newId('col'), amount, donor_count: donors, collected_on: date, notes: str(input.notes).slice(0, 300), status: 'PENDING', recorded_by: by, recorded_at: new Date().toISOString() }, ...(c.entries || [])];
          await saveList(KEYS.collections, list);
          return ok(totals(), 201);
        }

        // Money received at HQ: settle all pending entries for the coordinator
        if (pathname === '/api/coordinator-donations/remit' && method === 'POST') {
          const input = await body();
          const c = list.find(x => x.id === input.id);
          if (!c) return fail(404, 'Coordinator not found.');
          const pending = (c.entries || []).filter(e => e.status === 'PENDING');
          if (!pending.length) return fail(409, 'Nothing is waiting to be settled for this coordinator.');
          const due = money(pending.reduce((s, e) => s + Number(e.amount || 0), 0));
          const received = money(input.amount);
          if (received !== due) return fail(400, `The amount received must match what is pending (₹${due.toLocaleString('en-IN')}). Correct the collection entries first if they are wrong.`, { field: 'amount' });
          const mode = str(input.remittance_mode);
          if (!['UPI', 'Bank transfer', 'Cash deposit'].includes(mode)) return fail(400, 'Choose how the money was sent.', { field: 'remittance_mode' });
          const ref = str(input.reference).slice(0, 60);
          if (mode !== 'Cash deposit' && !ref) return fail(400, 'Enter the UTR or bank reference.', { field: 'reference' });
          const settlement = { id: newId('set'), amount: due, mode, reference: ref, notes: str(input.notes).slice(0, 300), settled_at: new Date().toISOString(), settled_by: by };
          pending.forEach(e => { e.status = 'SETTLED'; e.settlement_id = settlement.id; });
          c.settlements = [settlement, ...(c.settlements || [])];
          c.last_remittance_date = settlement.settled_at;
          c.remittance_mode = mode;
          await saveList(KEYS.collections, list);
          return ok(totals());
        }

        const coordMatch = pathname.match(/^\/api\/coordinator-donations\/([^/]+)$/);
        if (coordMatch && (method === 'PUT' || method === 'PATCH')) {
          const c = list.find(x => x.id === decodeURIComponent(coordMatch[1]));
          if (!c) return fail(404, 'Coordinator not found.');
          const input = await body();
          if (input.target_quota !== undefined) c.target_quota = Math.max(0, money(input.target_quota) || 0);
          for (const k of ['coordinator_name', 'district', 'wing']) if (input[k] !== undefined && str(input[k])) c[k] = str(input[k]).slice(0, 120);
          if (input.phone !== undefined) {
            const p = str(input.phone).replace(/\D/g, '');
            if (p && !PHONE_RE.test(p)) return fail(400, 'Enter a valid 10-digit mobile number.', { field: 'phone' });
            c.phone = p;
          }
          await saveList(KEYS.collections, list);
          return ok(totals());
        }
      }

      // =================================================================
      // In-kind gifts
      // =================================================================
      if (pathname.startsWith('/api/in-kind-donations')) {
        const id = decodeURIComponent(pathname.slice('/api/in-kind-donations'.length).replace(/^\//, ''));
        const list = await loadList(KEYS.inKind);
        if (method === 'GET' && !id) {
          return ok({
            in_kind_donations: list,
            total_valuation: money(list.reduce((s, d) => s + Number(d.estimated_valuation || 0), 0)),
            total_items: list.length
          });
        }
        if (method === 'POST' && !id) {
          const input = await body();
          const year = yearIST();
          const prefix = `TNV-IKC-${year}-`;
          const seq = list.map(d => String(d.certificate_no || '')).filter(n => n.startsWith(prefix)).map(n => Number(n.slice(prefix.length)) || 0).reduce((a, b) => Math.max(a, b), 0) + 1;
          const d = {
            id: newId('ink'),
            item_name: str(input.item_name).slice(0, 160),
            category: str(input.category).slice(0, 60) || 'Other',
            quantity: Number(input.quantity),
            unit: str(input.unit).slice(0, 30) || 'units',
            estimated_valuation: Math.max(0, money(input.estimated_valuation) || 0),
            donor_name: str(input.donor_name).slice(0, 120),
            donor_phone: str(input.donor_phone).replace(/\D/g, ''),
            recipient_unit: str(input.recipient_unit).slice(0, 120) || 'State office store',
            status: 'RECEIVED',
            received_on: /^\d{4}-\d{2}-\d{2}$/.test(str(input.received_on)) ? str(input.received_on) : todayIST(),
            certificate_no: `${prefix}${String(seq).padStart(4, '0')}`,
            recorded_by: by,
            acknowledged_at: new Date().toISOString(),
            history: [{ status: 'RECEIVED', at: new Date().toISOString(), by }]
          };
          const missing = requireFields(d, [['item_name', 'Item description'], ['donor_name', 'Donor name']]);
          if (missing) return fail(400, missing);
          if (!(d.quantity > 0)) return fail(400, 'Enter the quantity received.', { field: 'quantity' });
          if (d.donor_phone && !PHONE_RE.test(d.donor_phone)) return fail(400, 'Enter a valid 10-digit mobile number.', { field: 'donor_phone' });
          await saveList(KEYS.inKind, [d, ...list]);
          return ok({ donation: d }, 201);
        }
        if ((method === 'PUT' || method === 'PATCH') && id) {
          const d = list.find(x => x.id === id);
          if (!d) return fail(404, 'Record not found.');
          const input = await body();
          if (input.status !== undefined) {
            if (!INKIND_STATUSES.includes(input.status)) return fail(400, 'Unknown status.');
            const order = { RECEIVED: 0, IN_TRANSIT: 1, DISTRIBUTED: 2 };
            if (order[input.status] < order[d.status]) return fail(409, 'Status can only move forward: received → in transit → distributed.');
            if (input.status !== d.status) {
              d.status = input.status;
              d.history = [...(d.history || []), { status: input.status, at: new Date().toISOString(), by, note: str(input.note).slice(0, 200) }];
              if (input.status === 'DISTRIBUTED') d.distributed_to = str(input.distributed_to).slice(0, 160) || d.distributed_to || null;
            }
          }
          for (const k of ['item_name', 'category', 'unit', 'recipient_unit']) if (input[k] !== undefined && str(input[k])) d[k] = str(input[k]).slice(0, 160);
          if (input.quantity !== undefined && Number(input.quantity) > 0) d.quantity = Number(input.quantity);
          if (input.estimated_valuation !== undefined) d.estimated_valuation = Math.max(0, money(input.estimated_valuation) || 0);
          await saveList(KEYS.inKind, list);
          return ok({ donation: d });
        }
      }

      // =================================================================
      // Recurring pledges: a donor's promise to give regularly. Payments are
      // recorded when they arrive; nothing is charged automatically.
      // =================================================================
      if (pathname.startsWith('/api/recurring-pledges')) {
        const list = await loadList(KEYS.pledges);
        const stats = () => {
          const active = list.filter(p => p.status === 'ACTIVE');
          return {
            mrr: money(active.reduce((s, p) => s + Number(p.amount || 0) / (PLEDGE_FREQUENCIES[p.frequency] || 1), 0)),
            active_count: active.length,
            total_pledges: list.length,
            total_raised: money(list.reduce((s, p) => s + Number(p.total_contributed || 0), 0)),
            overdue_count: active.filter(p => p.next_due_date && p.next_due_date < todayIST()).length
          };
        };
        if (method === 'GET' && (pathname === '/api/recurring-pledges' || pathname === '/api/recurring-pledges/')) return ok({ pledges: list, stats: stats() });

        if (method === 'POST' && pathname === '/api/recurring-pledges') {
          const input = await body();
          const frequency = PLEDGE_FREQUENCIES[input.frequency] ? input.frequency : 'MONTHLY';
          const day = Math.min(28, Math.max(1, Math.floor(Number(input.cycle_day) || 1)));
          const start = /^\d{4}-\d{2}-\d{2}$/.test(str(input.start_date)) ? str(input.start_date) : todayIST();
          const p = {
            id: newId('pledge'),
            donor_name: str(input.donor_name).slice(0, 120),
            donor_phone: str(input.donor_phone).replace(/\D/g, ''),
            donor_email: str(input.donor_email).toLowerCase(),
            amount: money(input.amount),
            frequency,
            cycle_day: day,
            payment_method: str(input.payment_method).slice(0, 40) || 'UPI',
            status: 'ACTIVE',
            started_at: new Date().toISOString(),
            next_due_date: (() => { const [y, m] = start.split('-').map(Number); const candidate = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`; return candidate >= start ? candidate : addMonths(candidate, 1, day); })(),
            total_contributed: 0,
            successful_cycles: 0,
            payments: [],
            created_by: by
          };
          const missing = requireFields(p, [['donor_name', 'Donor name']]);
          if (missing) return fail(400, missing);
          if (!(p.amount >= 1)) return fail(400, 'Enter the pledged amount.', { field: 'amount' });
          if (!PHONE_RE.test(p.donor_phone)) return fail(400, 'Enter a valid 10-digit mobile number.', { field: 'donor_phone' });
          if (p.donor_email && !EMAIL_RE.test(p.donor_email)) return fail(400, 'Enter a valid email address.', { field: 'donor_email' });
          list.unshift(p);
          await saveList(KEYS.pledges, list);
          return ok({ pledge: p, stats: stats() }, 201);
        }

        const payMatch = pathname.match(/^\/api\/recurring-pledges\/([^/]+)\/payments$/);
        if (payMatch && method === 'POST') {
          const p = list.find(x => x.id === decodeURIComponent(payMatch[1]));
          if (!p) return fail(404, 'Pledge not found.');
          if (p.status === 'CANCELLED') return fail(409, 'This pledge is cancelled.');
          const input = await body();
          const amount = money(input.amount || p.amount);
          if (!(amount >= 1)) return fail(400, 'Enter the amount received.', { field: 'amount' });
          const ref = str(input.reference).replace(/\s/g, '');
          if (!ref) return fail(400, 'Enter the UTR or bank reference for this payment.', { field: 'reference' });
          if (list.some(x => (x.payments || []).some(pay => pay.reference === ref))) return fail(409, 'This reference is already recorded against a pledge.', { field: 'reference' });
          p.payments = [{ id: newId('pp'), amount, reference: ref, received_on: todayIST(), recorded_by: by, for_due_date: p.next_due_date }, ...(p.payments || [])];
          p.total_contributed = money(Number(p.total_contributed || 0) + amount);
          p.successful_cycles = (p.successful_cycles || 0) + 1;
          p.last_paid_on = todayIST();
          p.next_due_date = addMonths(p.next_due_date || todayIST(), PLEDGE_FREQUENCIES[p.frequency] || 1, p.cycle_day || 1);
          await saveList(KEYS.pledges, list);
          return ok({ pledge: p, stats: stats() });
        }

        const statusMatch = pathname.match(/^\/api\/recurring-pledges\/([^/]+)\/(toggle|status)$/);
        if (statusMatch && (method === 'POST' || method === 'PATCH')) {
          const p = list.find(x => x.id === decodeURIComponent(statusMatch[1]));
          if (!p) return fail(404, 'Pledge not found.');
          const input = statusMatch[2] === 'status' ? await body() : {};
          const next = statusMatch[2] === 'toggle' ? (p.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE') : input.status;
          if (!PLEDGE_STATUSES.includes(next)) return fail(400, 'Unknown status.');
          if (p.status === 'CANCELLED') return fail(409, 'A cancelled pledge cannot be restarted. Add a new pledge instead.');
          p.status = next;
          p.status_changed_at = new Date().toISOString();
          await saveList(KEYS.pledges, list);
          return ok({ pledge: p, stats: stats() });
        }
      }

      return fail(404, 'Not found.');
    } catch (err) {
      console.error('[donations]', err);
      if (!res.headersSent) sendJson(res, 500, { ok: false, success: false, error: 'Something went wrong. Please try again.' });
      return true;
    }
  }

  return { handle, receiptPath, findDonationByReceipt };
}

module.exports = { createDonations, KEYS };
