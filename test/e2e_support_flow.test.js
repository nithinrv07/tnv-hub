// End-to-End Test Suite for TNV Support Ticketing & Helpdesk Engine
const assert = require('assert');
const { createSupportRoutes } = require('../routes/support');

async function runE2eSupportTests() {
  console.log('[E2E TEST] Starting End-to-End Support Flow Verification...');

  let sentEmails = [];
  const mockMailer = {
    send: async (msg) => {
      sentEmails.push(msg);
      return { success: true, messageId: 'msg-' + Math.random().toString(36).slice(2) };
    }
  };

  const store = {};
  const mockSupabaseBridge = {
    getSupabaseSnapshot: async (k) => store[k] || null,
    saveSupabaseSnapshot: async (k, v) => { store[k] = v; return true; }
  };

  let currentUser = null;
  const mockGetAuthUser = async () => currentUser;

  function createMockRes() {
    let statusCode = 200;
    let headers = {};
    let body = '';
    return {
      writeHead: (code, h) => {
        statusCode = code;
        headers = { ...headers, ...h };
      },
      end: (data) => {
        body = data;
      },
      _json: () => JSON.parse(body || '{}'),
      _status: () => statusCode
    };
  }

  const support = createSupportRoutes({
    supabaseBridge: mockSupabaseBridge,
    getAuthUser: mockGetAuthUser,
    mailer: mockMailer,
    isHosted: false
  });

  // Flow Step 1: Public visitor submits query
  console.log('Step 1: Public visitor submits enquiry on /feedback...');
  const res1 = createMockRes();
  await support.handle({
    method: 'POST',
    body: {
      name: 'Ananya Raman',
      mobile: '9840123456',
      email: 'ananya@example.com',
      subject: 'CSR Collaboration in Coimbatore',
      message: 'Our corporate team wants to sponsor 500 saplings for the greening drive.'
    }
  }, res1, '/api/support/visitor-query', {});

  assert.strictEqual(res1._status(), 201);
  const qryData = res1._json();
  assert.strictEqual(qryData.ok, true);
  assert.ok(qryData.ticket_number.startsWith('TNV-QRY-'));
  const visitorTicketNum = qryData.ticket_number;
  console.log('   ✓ Query registered:', visitorTicketNum);
  assert.strictEqual(sentEmails.length, 1, 'Visitor must receive instant confirmation email');
  assert.strictEqual(sentEmails[0].to, 'ananya@example.com');
  console.log('   ✓ Confirmation email sent with subject:', sentEmails[0].subject);

  // Flow Step 2: Visitor checks status on feedback page
  console.log('Step 2: Visitor checks query status on /feedback...');
  const res2 = createMockRes();
  await support.handle({ method: 'GET' }, res2, '/api/support/visitor-lookup', {
    name: 'Ananya Raman',
    mobile: '9840123456'
  });
  assert.strictEqual(res2._status(), 200);
  const lookup1 = res2._json();
  assert.strictEqual(lookup1.ok, true);
  assert.strictEqual(lookup1.items.length, 1);
  assert.strictEqual(lookup1.items[0].status, 'new');
  assert.strictEqual(lookup1.items[0].admin_reply, null);
  console.log('   ✓ Visitor sees status: Pending Review');

  // Flow Step 3: Member submits complaint from dashboard
  console.log('Step 3: Authenticated member submits complaint from dashboard...');
  currentUser = {
    id: 'vol-member-101',
    full_name: 'Dinesh Kumar',
    phone: '9789012345',
    email: 'dinesh@tnv.org',
    tnv_id: 'TNV-2026-0899',
    district: 'Salem',
    wing: 'Social Wing',
    is_approved: true
  };

  const res3 = createMockRes();
  await support.handle({
    method: 'POST',
    body: {
      category: 'work_related',
      subject: 'Event venue coordination for Salem drive',
      message: 'Need coordinator contact for the local municipal school drive this Sunday.'
    }
  }, res3, '/api/support/member-complaint', {});

  assert.strictEqual(res3._status(), 201);
  const tktData = res3._json();
  assert.strictEqual(tktData.ok, true);
  assert.ok(tktData.ticket_number.startsWith('TNV-TKT-'));
  const memberTicketNum = tktData.ticket_number;
  console.log('   ✓ Member complaint registered:', memberTicketNum);
  assert.strictEqual(sentEmails.length, 1, 'Member complaints must NOT trigger emails (in-portal only)');

  // Flow Step 4: Member views their complaints feed
  console.log('Step 4: Member views their complaints feed in /dashboard?tab=support...');
  const res4 = createMockRes();
  await support.handle({ method: 'GET' }, res4, '/api/support/my-tickets', {});
  const memberFeed = res4._json();
  assert.strictEqual(memberFeed.ok, true);
  assert.strictEqual(memberFeed.items.length, 1);
  assert.strictEqual(memberFeed.items[0].ticket_number, memberTicketNum);
  assert.strictEqual(memberFeed.items[0].status, 'new');
  console.log('   ✓ Member sees their active ticket');

  // Flow Step 5: Admin accesses Queries & Complaints Hub
  console.log('Step 5: Admin views Queries & Complaints workbench...');
  currentUser = {
    id: 'admin-master',
    role: 'master_admin',
    full_name: 'State Coordinator'
  };

  const res5 = createMockRes();
  await support.handle({ method: 'GET' }, res5, '/api/support/admin/tickets', {});
  const adminDesk = res5._json();
  assert.strictEqual(adminDesk.ok, true);
  assert.strictEqual(adminDesk.metrics.total, 2);
  assert.strictEqual(adminDesk.metrics.new, 2);
  assert.strictEqual(adminDesk.metrics.resolved, 0);
  console.log('   ✓ Admin KPIs verified: Total = 2, New = 2, Resolved = 0');

  // Flow Step 6: Admin replies to Visitor Query & dispatches email
  console.log('Step 6: Admin replies to Visitor Query and dispatches email...');
  const res6 = createMockRes();
  await support.handle({
    method: 'POST',
    body: {
      ticket_number: visitorTicketNum,
      status: 'resolved',
      admin_reply: 'Vanakkam Ananya! Our Coimbatore District Coordinator Mr. Senthil will call you today to coordinate the 500 sapling drive.',
      send_email: true
    }
  }, res6, '/api/support/admin/reply', {});

  assert.strictEqual(res6._status(), 200);
  assert.strictEqual(sentEmails.length, 2, 'Visitor reply email must be sent');
  assert.strictEqual(sentEmails[1].to, 'ananya@example.com');
  assert.ok(sentEmails[1].subject.includes(visitorTicketNum));
  console.log('   ✓ Reply email dispatched to visitor');

  // Flow Step 7: Admin resolves Member Complaint (Portal resolution only)
  console.log('Step 7: Admin publishes resolution to Member Complaint...');
  const res7 = createMockRes();
  await support.handle({
    method: 'POST',
    body: {
      ticket_number: memberTicketNum,
      status: 'resolved',
      admin_reply: 'Contact Mr. Vignesh (Salem Coordinator) at 9444123456. Venue permissions are confirmed.',
      send_email: false
    }
  }, res7, '/api/support/admin/reply', {});

  assert.strictEqual(res7._status(), 200);
  assert.strictEqual(sentEmails.length, 2, 'No email must be sent for member resolution');
  console.log('   ✓ In-dashboard resolution saved for member');

  // Flow Step 8: Visitor returns to feedback page to see response
  console.log('Step 8: Visitor returns to /feedback to read answer...');
  const res8 = createMockRes();
  await support.handle({ method: 'GET' }, res8, '/api/support/visitor-lookup', {
    name: 'Ananya Raman',
    mobile: '9840123456'
  });
  const lookup2 = res8._json();
  assert.strictEqual(lookup2.items[0].status, 'resolved');
  assert.ok(lookup2.items[0].admin_reply.includes('Coimbatore District Coordinator'));
  console.log('   ✓ Visitor can read the official answer on the website');

  // Flow Step 9: Member checks dashboard support tab to see answer
  console.log('Step 9: Member checks /dashboard?tab=support to read answer...');
  currentUser = { id: 'vol-member-101' };
  const res9 = createMockRes();
  await support.handle({ method: 'GET' }, res9, '/api/support/my-tickets', {});
  const memberFeed2 = res9._json();
  assert.strictEqual(memberFeed2.items[0].status, 'resolved');
  assert.ok(memberFeed2.items[0].admin_reply.includes('Salem Coordinator'));
  console.log('   ✓ Member reads official resolution directly in their portal');

  console.log('\n[SUCCESS] Full End-to-End Support & Helpdesk Flow Verified!\n');
}

runE2eSupportTests().catch(err => {
  console.error('[E2E FAIL]', err);
  process.exit(1);
});
