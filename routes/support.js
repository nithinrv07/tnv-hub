// Unified Support & Helpdesk Ticketing Routes
// Handles:
// - Visitor queries from the public Feedback page with sequential TNV-QRY-YYYY-XXXX
// - Member complaints from Dashboard Help & Support with sequential TNV-TKT-YYYY-XXXX
// - Status lookup for visitors via Mobile + Name or Reference Code
// - Admin Queries & Complaints operational hub with floating KPI counts & email replies

const crypto = require('crypto');
const mailTemplates = require('../mail/templates');

const SNAPSHOT_KEY = 'sync_support_tickets';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[6-9]\d{9}$/;

function createSupportRoutes({ supabaseBridge, getAuthUser, sendJson, mailer, isHosted = false }) {
  let inMemoryTickets = [];
  let loaded = false;
  let qryCounter = 1;
  let tktCounter = 1;

  async function ensureLoaded() {
    if (loaded) return;
    try {
      const snap = await supabaseBridge.getSupabaseSnapshot(SNAPSHOT_KEY);
      if (Array.isArray(snap)) {
        inMemoryTickets = snap;
      } else if (snap && Array.isArray(snap.items)) {
        inMemoryTickets = snap.items;
      }
    } catch (_e) {
      inMemoryTickets = [];
    }
    loaded = true;

    // Recalculate counters based on existing data
    const currentYear = new Date().getFullYear();
    inMemoryTickets.forEach(t => {
      if (typeof t.ticket_number === 'string') {
        const parts = t.ticket_number.split('-');
        if (parts.length === 4 && parts[2] === String(currentYear)) {
          const num = parseInt(parts[3], 10);
          if (!isNaN(num)) {
            if (parts[1] === 'QRY' && num >= qryCounter) qryCounter = num + 1;
            if (parts[1] === 'TKT' && num >= tktCounter) tktCounter = num + 1;
          }
        }
      }
    });
  }

  async function persistTickets() {
    try {
      await supabaseBridge.saveSupabaseSnapshot(SNAPSHOT_KEY, { items: inMemoryTickets });
    } catch (err) {
      console.error('[SUPPORT] Failed to save snapshot:', err);
    }
  }

  function generateTicketNumber(type) {
    const year = new Date().getFullYear();
    if (type === 'visitor_query') {
      const numStr = String(qryCounter++).padStart(4, '0');
      return `TNV-QRY-${year}-${numStr}`;
    } else {
      const numStr = String(tktCounter++).padStart(4, '0');
      return `TNV-TKT-${year}-${numStr}`;
    }
  }

  // Parse JSON request body helper
  function readBody(req) {
    if (req.body && typeof req.body === 'object') return Promise.resolve(req.body);
    return new Promise((resolve) => {
      let data = '';
      req.on('data', chunk => { data += chunk; });
      req.on('end', () => {
        try {
          resolve(JSON.parse(data || '{}'));
        } catch (_e) {
          resolve({});
        }
      });
    });
  }

  function respond(res, statusCode, payload) {
    if (sendJson) {
      return sendJson(res, statusCode, payload);
    }
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(payload));
  }

  async function handle(req, res, pathname, query = {}) {
    if (!pathname.startsWith('/api/support/')) return false;
    await ensureLoaded();

    // 1. POST /api/support/visitor-query
    if (req.method === 'POST' && pathname === '/api/support/visitor-query') {
      const body = await readBody(req);
      const name = String(body.name || '').trim();
      const mobile = String(body.mobile || '').replace(/\D/g, '').slice(-10);
      const email = String(body.email || '').trim().toLowerCase();
      const subject = String(body.subject || '').trim();
      const message = String(body.message || '').trim();

      if (!name || name.length < 2) {
        respond(res, 400, { ok: false, error: 'Please enter your name.' });
        return true;
      }
      if (!PHONE_RE.test(mobile)) {
        respond(res, 400, { ok: false, error: 'Please enter a valid 10-digit mobile number.' });
        return true;
      }
      if (!EMAIL_RE.test(email)) {
        respond(res, 400, { ok: false, error: 'Please enter a valid email address.' });
        return true;
      }
      if (!message || message.length < 5) {
        respond(res, 400, { ok: false, error: 'Please provide query details (at least 5 characters).' });
        return true;
      }

      const ticketNumber = generateTicketNumber('visitor_query');
      const now = new Date().toISOString();
      const newTicket = {
        id: crypto.randomUUID ? crypto.randomUUID() : 'qry-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
        ticket_number: ticketNumber,
        type: 'visitor_query',
        category: 'general',
        status: 'new',
        name,
        mobile,
        email,
        member_id: null,
        member_reg_id: null,
        member_district: null,
        member_wing: null,
        is_approved: false,
        subject: subject || 'General Visitor Enquiry',
        message,
        admin_reply: null,
        replied_at: null,
        replied_by: null,
        created_at: now,
        updated_at: now
      };

      inMemoryTickets.unshift(newTicket);
      await persistTickets();

      // Dispatch automated confirmation email to visitor
      if (mailer && mailer.send) {
        try {
          const tpl = mailTemplates.visitorQueryConfirmation({
            name,
            ticketNumber,
            subject: newTicket.subject,
            message
          });
          await mailer.send({
            to: email,
            toName: name,
            subject: tpl.subject,
            html: tpl.html,
            text: tpl.text,
            kind: 'visitor_query_confirmation',
            meta: { ticket_number: ticketNumber }
          });
        } catch (mailErr) {
          console.error('[SUPPORT] Failed to dispatch visitor confirmation email:', mailErr.message);
        }
      }

      respond(res, 201, {
        ok: true,
        ticket_number: ticketNumber,
        message: 'Your query has been submitted successfully.',
        item: newTicket
      });
      return true;
    }

    // 2. GET /api/support/visitor-lookup
    if (req.method === 'GET' && pathname === '/api/support/visitor-lookup') {
      const qMobile = String(query.mobile || '').replace(/\D/g, '').slice(-10);
      const qName = String(query.name || '').trim().toLowerCase();
      const qTicket = String(query.ticket || '').trim().toUpperCase();

      let matched = [];
      if (qTicket) {
        matched = inMemoryTickets.filter(t => t.type === 'visitor_query' && t.ticket_number.toUpperCase() === qTicket);
      } else if (qMobile && qName) {
        matched = inMemoryTickets.filter(t => {
          if (t.type !== 'visitor_query') return false;
          const matchPhone = t.mobile === qMobile;
          const matchName = t.name.toLowerCase().includes(qName) || qName.includes(t.name.toLowerCase());
          return matchPhone && matchName;
        });
      }

      respond(res, 200, { ok: true, items: matched });
      return true;
    }

    // 3. POST /api/support/member-complaint
    if (req.method === 'POST' && pathname === '/api/support/member-complaint') {
      const user = await getAuthUser(req);
      if (!user) {
        respond(res, 401, { ok: false, error: 'Please sign in to submit a complaint.' });
        return true;
      }

      const body = await readBody(req);
      const category = ['technical', 'work_related'].includes(body.category) ? body.category : 'technical';
      const subject = String(body.subject || '').trim();
      const message = String(body.message || '').trim();

      if (!subject || subject.length < 3) {
        respond(res, 400, { ok: false, error: 'Please enter a subject.' });
        return true;
      }
      if (!message || message.length < 5) {
        respond(res, 400, { ok: false, error: 'Please provide full issue details.' });
        return true;
      }

      const ticketNumber = generateTicketNumber('member_complaint');
      const now = new Date().toISOString();
      const newTicket = {
        id: crypto.randomUUID ? crypto.randomUUID() : 'tkt-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
        ticket_number: ticketNumber,
        type: 'member_complaint',
        category,
        status: 'new',
        name: user.full_name || 'Member',
        mobile: user.phone || '',
        email: user.email || '',
        member_id: user.id || null,
        member_reg_id: user.tnv_id || null,
        member_district: user.district || user.district_name || null,
        member_wing: user.wing || null,
        is_approved: Boolean(user.is_approved),
        subject,
        message,
        admin_reply: null,
        replied_at: null,
        replied_by: null,
        created_at: now,
        updated_at: now
      };

      inMemoryTickets.unshift(newTicket);
      await persistTickets();

      respond(res, 201, {
        ok: true,
        ticket_number: ticketNumber,
        message: 'Your complaint has been submitted. You can track status right here.',
        item: newTicket
      });
      return true;
    }

    // 4. GET /api/support/my-tickets
    if (req.method === 'GET' && pathname === '/api/support/my-tickets') {
      const user = await getAuthUser(req);
      if (!user) {
        respond(res, 401, { ok: false, error: 'Unauthorized.' });
        return true;
      }

      const myTickets = inMemoryTickets.filter(t => t.member_id && t.member_id === user.id);
      respond(res, 200, { ok: true, items: myTickets });
      return true;
    }

    // 5. GET /api/support/admin/tickets
    if (req.method === 'GET' && pathname === '/api/support/admin/tickets') {
      const user = await getAuthUser(req);
      const isAdmin = user && (user.role === 'master_admin' || user.role === 'dept_admin' || user.is_admin);
      if (!isAdmin) {
        respond(res, 403, { ok: false, error: 'Admin access required.' });
        return true;
      }

      const total = inMemoryTickets.length;
      const newCount = inMemoryTickets.filter(t => t.status === 'new').length;
      const inProgressCount = inMemoryTickets.filter(t => t.status === 'in_progress').length;
      const resolvedCount = inMemoryTickets.filter(t => t.status === 'resolved').length;

      respond(res, 200, {
        ok: true,
        metrics: {
          total,
          new: newCount,
          in_progress: inProgressCount,
          resolved: resolvedCount
        },
        items: inMemoryTickets
      });
      return true;
    }

    // 6. POST /api/support/admin/reply
    if (req.method === 'POST' && pathname === '/api/support/admin/reply') {
      const user = await getAuthUser(req);
      const isAdmin = user && (user.role === 'master_admin' || user.role === 'dept_admin' || user.is_admin);
      if (!isAdmin) {
        respond(res, 403, { ok: false, error: 'Admin access required.' });
        return true;
      }

      const body = await readBody(req);
      const targetId = body.id;
      const targetTicketNumber = body.ticket_number;

      const ticket = inMemoryTickets.find(t => (targetId && t.id === targetId) || (targetTicketNumber && t.ticket_number === targetTicketNumber));
      if (!ticket) {
        respond(res, 404, { ok: false, error: 'Ticket not found.' });
        return true;
      }

      const newStatus = ['new', 'in_progress', 'resolved'].includes(body.status) ? body.status : ticket.status;
      const adminReply = body.admin_reply != null ? String(body.admin_reply).trim() : ticket.admin_reply;
      const sendEmail = Boolean(body.send_email);

      ticket.status = newStatus;
      if (adminReply) {
        ticket.admin_reply = adminReply;
        ticket.replied_at = new Date().toISOString();
        ticket.replied_by = user.full_name || 'Admin';
      }
      ticket.updated_at = new Date().toISOString();

      await persistTickets();

      // If visitor query and email dispatch requested with reply text
      if (ticket.type === 'visitor_query' && sendEmail && adminReply && mailer && mailer.send) {
        try {
          const tpl = mailTemplates.visitorQueryReply({
            name: ticket.name,
            ticketNumber: ticket.ticket_number,
            subject: ticket.subject,
            originalMessage: ticket.message,
            replyMessage: adminReply
          });
          await mailer.send({
            to: ticket.email,
            toName: ticket.name,
            subject: tpl.subject,
            html: tpl.html,
            text: tpl.text,
            kind: 'visitor_query_reply',
            meta: { ticket_number: ticket.ticket_number }
          });
        } catch (mailErr) {
          console.error('[SUPPORT] Failed to dispatch visitor reply email:', mailErr.message);
        }
      }

      respond(res, 200, { ok: true, item: ticket, message: 'Ticket updated successfully.' });
      return true;
    }

    return false;
  }

  return { handle };
}

module.exports = { createSupportRoutes };
