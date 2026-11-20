// Integration test for support ticketing engine:
// - Visitor queries with TNV-QRY-YYYY-XXXX sequence
// - Visitor lookup matching Name & Mobile (or exact ticket)
// - Member complaints with TNV-TKT-YYYY-XXXX sequence
// - Admin triage, metrics calculation, and reply dispatching

const assert = require('assert');
const { createSupportRoutes } = require('../routes/support');

async function runTests() {
  console.log('[TEST] Starting Support Ticketing Engine Unit Tests...');

  let sentEmails = [];
  const mockMailer = {
    send: async (msg) => {
      sentEmails.push(msg);
      return { success: true, messageId: 'mock-msg-' + Date.now() };
    }
  };

  const mockSnapshot = {};
  const mockSupabaseBridge = {
    getSupabaseSnapshot: async (key) => mockSnapshot[key] || null,
    saveSupabaseSnapshot: async (key, val) => {
      mockSnapshot[key] = val;
      return true;
    }
  };

  let currentUser = null;
  const mockGetAuthUser = async (req) => currentUser;

  function mockRes() {
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

  // 1. Submit Visitor Query
  console.log('1. Testing Visitor Query Submission...');
  const req1 = {
    method: 'POST',
    body: {
      name: 'Priya Sharma',
      mobile: '9876543210',
      email: 'priya@example.com',
      subject: 'Inquiry about volunteering in Chennai',
      message: 'I want to know if college students can join weekend drives.'
    }
  };
  const res1 = mockRes();
  const handled1 = await support.handle(req1, res1, '/api/support/visitor-query', {});
  assert.strictEqual(handled1, true, 'Handler should handle visitor query');
  const json1 = res1._json();
  assert.strictEqual(json1.ok, true, 'Visitor query should be successful');
  assert.ok(json1.ticket_number.startsWith('TNV-QRY-'), 'Should return TNV-QRY reference');
  assert.strictEqual(sentEmails.length, 1, 'Should send confirmation email to visitor');
  assert.strictEqual(sentEmails[0].to, 'priya@example.com');
  console.log('   ✓ Visitor query assigned:', json1.ticket_number);

  // 2. Visitor Lookup by Name & Mobile
  console.log('2. Testing Visitor Query Lookup...');
  const req2 = { method: 'GET' };
  const res2 = mockRes();
  await support.handle(req2, res2, '/api/support/visitor-lookup', { name: 'Priya Sharma', mobile: '9876543210' });
  const json2 = res2._json();
  assert.strictEqual(json2.ok, true);
  assert.strictEqual(json2.items.length, 1);
  assert.strictEqual(json2.items[0].ticket_number, json1.ticket_number);
  console.log('   ✓ Query found via Name + Mobile lookup');

  // Lookup with wrong mobile should return empty
  const res2Wrong = mockRes();
  await support.handle({ method: 'GET' }, res2Wrong, '/api/support/visitor-lookup', { name: 'Priya Sharma', mobile: '9999999999' });
  assert.strictEqual(res2Wrong._json().items.length, 0, 'Wrong mobile must not return results');

  // 3. Member Complaint Submission
  console.log('3. Testing Member Complaint Submission...');
  currentUser = {
    id: 'user-uuid-1',
    full_name: 'Karthik Raja',
    phone: '9123456780',
    email: 'karthik@example.com',
    tnv_id: 'TNV-2026-0042',
    district: 'Madurai',
    wing: 'Youth Wing',
    is_approved: true
  };
  const req3 = {
    method: 'POST',
    body: {
      category: 'technical',
      subject: 'ID card download issue',
      message: 'My ID card shows blank photo on mobile view.'
    }
  };
  const res3 = mockRes();
  await support.handle(req3, res3, '/api/support/member-complaint', {});
  const json3 = res3._json();
  assert.strictEqual(json3.ok, true);
  assert.ok(json3.ticket_number.startsWith('TNV-TKT-'), 'Member complaints must get TNV-TKT sequence');
  console.log('   ✓ Member complaint assigned:', json3.ticket_number);

  // 4. Member's own tickets list
  console.log('4. Testing Member /api/support/my-tickets...');
  const res4 = mockRes();
  await support.handle({ method: 'GET' }, res4, '/api/support/my-tickets', {});
  const json4 = res4._json();
  assert.strictEqual(json4.ok, true);
  assert.strictEqual(json4.items.length, 1);
  assert.strictEqual(json4.items[0].subject, 'ID card download issue');
  console.log('   ✓ Member retrieved their own complaints');

  // 5. Admin Desk: Metrics & Ticket list
  console.log('5. Testing Admin /api/support/admin/tickets...');
  currentUser = {
    id: 'admin-1',
    role: 'master_admin',
    full_name: 'Master Admin'
  };
  const res5 = mockRes();
  await support.handle({ method: 'GET' }, res5, '/api/support/admin/tickets', {});
  const json5 = res5._json();
  assert.strictEqual(json5.ok, true);
  assert.strictEqual(json5.metrics.total, 2);
  assert.strictEqual(json5.metrics.new, 2);
  assert.strictEqual(json5.items.length, 2);
  console.log('   ✓ Admin KPIs computed:', json5.metrics);

  // 6. Admin Reply to Visitor Query with Email
  console.log('6. Testing Admin Reply & Email to Visitor...');
  const visitorTicketId = json1.ticket_number;
  const res6 = mockRes();
  await support.handle({
    method: 'POST',
    body: {
      ticket_number: visitorTicketId,
      status: 'resolved',
      admin_reply: 'Yes! College students are welcome to join weekend tree plantation drives.',
      send_email: true
    }
  }, res6, '/api/support/admin/reply', {});
  const json6 = res6._json();
  assert.strictEqual(json6.ok, true);
  assert.strictEqual(json6.item.status, 'resolved');
  assert.strictEqual(sentEmails.length, 2, 'Should send reply email to visitor');
  assert.strictEqual(sentEmails[1].to, 'priya@example.com');
  console.log('   ✓ Admin reply recorded and email sent to visitor');

  // Verify visitor can now see reply in lookup
  const res7 = mockRes();
  await support.handle({ method: 'GET' }, res7, '/api/support/visitor-lookup', { name: 'Priya Sharma', mobile: '9876543210' });
  const updatedTicket = res7._json().items[0];
  assert.strictEqual(updatedTicket.status, 'resolved');
  assert.ok(updatedTicket.admin_reply.includes('College students are welcome'));
  console.log('   ✓ Visitor lookup successfully reflects resolved answer');

  console.log('\n[PASS] All Support Ticketing Unit Tests Passed Successfully!\n');
}

runTests().catch(err => {
  console.error('[FAIL]', err);
  process.exit(1);
});
