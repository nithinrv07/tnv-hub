// In-process mock test suite for TNV Event Management & Volunteer Coordination
const EventEmitter = require('events');
const serverApp = require('../server.js');

function mockRequest(method, urlPath, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = new EventEmitter();
    req.method = method;
    req.url = urlPath;
    req.headers = {
      host: 'localhost:3000',
      ...(body ? { 'content-type': 'application/json' } : {}),
      ...headers
    };

    let statusCode = 200;
    let resHeaders = {};
    let responseData = '';

    const res = {
      writeHead(code, h) {
        statusCode = code;
        if (h) Object.assign(resHeaders, h);
      },
      setHeader(name, val) {
        resHeaders[name.toLowerCase()] = val;
      },
      end(chunk) {
        if (chunk) responseData += chunk;
        let parsed;
        try {
          parsed = JSON.parse(responseData);
        } catch (_e) {
          parsed = responseData;
        }
        resolve({ status: statusCode, data: parsed, headers: resHeaders });
      }
    };

    try {
      serverApp(req, res);
      setImmediate(() => {
        if (body) {
          req.emit('data', Buffer.from(JSON.stringify(body)));
        }
        req.emit('end');
      });
    } catch (err) {
      reject(err);
    }
  });
}

async function runTests() {
  console.log('===============================================================');
  console.log('   TESTING TNV EVENT MANAGEMENT & VOLUNTEER COORDINATION       ');
  console.log('===============================================================');

  // Ensure clean test isolation
  const os = require('os');
  const path = require('path');
  const fs = require('fs');
  const tmpEventsFile = path.join(os.tmpdir(), 'tnv_sync_events.json');
  if (fs.existsSync(tmpEventsFile)) {
    try { fs.unlinkSync(tmpEventsFile); } catch (_e) {}
  }

  // 1. Initial State: Zero dummy seed data
  console.log('\n[TEST 1] Verifying ZERO dummy seed data in events...');
  const initialRes = await mockRequest('GET', '/api/events');
  if (initialRes.status !== 200 || !initialRes.data.ok || initialRes.data.events.length !== 0) {
    throw new Error(`Expected exactly 0 initial events, found ${initialRes.data?.events?.length}`);
  }
  console.log('✓ inMemoryEvents is completely empty (zero dummy seed data).');

  // 2. Set up Master Admin & Volunteer sessions
  console.log('\n[TEST 2] Setting up Master Admin & Volunteer authentication sessions...');
  // Master Admin login
  const adminLogin = await mockRequest('POST', '/api/login', {
    username: 'masteradmin',
    password: process.env.ADMIN_PASSWORD || 'AdminPassword2026!'
  });
  const adminToken = adminLogin.data.session?.access_token || adminLogin.data.token;
  if (adminLogin.status !== 200 || !adminToken) {
    throw new Error(`Master admin login failed: ${JSON.stringify(adminLogin)}`);
  }
  const adminHeaders = { authorization: `Bearer ${adminToken}` };
  console.log('✓ Master Admin logged in successfully.');

  // Create & approve Volunteer 1
  const vol1Username = 'kavitha_' + Math.floor(1000 + Math.random() * 9000);
  const reg1 = await mockRequest('POST', '/api/register', {
    full_name: 'Kavitha S',
    username: vol1Username,
    email: `${vol1Username}@tnv.org`,
    phone: '9840111111',
    password: 'VolunteerPass2026!',
    aadhaar: '123412341234',
    district_id: 3,
    district_name: 'Chennai',
    wing_name: 'Youth Wing',
    wing_to_join: 'Youth Wing - Environmental & Tree Plantation',
    preferred_designation: 'Active Volunteer',
    dob: '1998-05-15',
    blood_group: 'O+',
    gender: 'Female',
    marital_status: 'Single',
    occupation: 'Teacher',
    address: '12 Anna Salai, Chennai',
    pincode: '600002',
    previous_experience: 'Fresher / First time volunteer',
    past_field_work: ['fresher'],
    terms_accepted: true
  });
  if ((reg1.status !== 200 && reg1.status !== 201) || !reg1.data?.user?.id) {
    throw new Error(`Volunteer 1 registration failed: ${JSON.stringify(reg1)}`);
  }
  await mockRequest('POST', '/api/admin/approve', {
    profile_id: reg1.data.user.id,
    role: 'volunteer',
    wing_id: 1
  }, adminHeaders);

  const vol1Login = await mockRequest('POST', '/api/login', {
    username: vol1Username,
    password: 'VolunteerPass2026!'
  });
  const vol1Token = vol1Login.data.session?.access_token || vol1Login.data.token;
  const vol1Headers = { authorization: `Bearer ${vol1Token}` };

  // Create & approve Volunteer 2
  const vol2Username = 'sarav_' + Math.floor(1000 + Math.random() * 9000);
  const reg2 = await mockRequest('POST', '/api/register', {
    full_name: 'Saravanan M',
    username: vol2Username,
    email: `${vol2Username}@tnv.org`,
    phone: '9840222222',
    password: 'VolunteerPass2026!',
    aadhaar: '567856785678',
    district_id: 3,
    district_name: 'Chennai',
    wing_name: 'Youth Wing',
    wing_to_join: 'Youth Wing - Environmental & Tree Plantation',
    preferred_designation: 'Active Volunteer',
    dob: '1995-08-20',
    blood_group: 'A+',
    gender: 'Male',
    marital_status: 'Single',
    occupation: 'Engineer',
    address: '44 T Nagar, Chennai',
    pincode: '600017',
    previous_experience: 'Fresher / First time volunteer',
    past_field_work: ['fresher'],
    terms_accepted: true
  });
  if ((reg2.status !== 200 && reg2.status !== 201) || !reg2.data?.user?.id) {
    throw new Error(`Volunteer 2 registration failed: ${JSON.stringify(reg2)}`);
  }
  await mockRequest('POST', '/api/admin/approve', {
    profile_id: reg2.data.user.id,
    role: 'volunteer',
    wing_id: 1
  }, adminHeaders);

  const vol2Login = await mockRequest('POST', '/api/login', {
    username: vol2Username,
    password: 'VolunteerPass2026!'
  });
  const vol2Token = vol2Login.data.session?.access_token || vol2Login.data.token;
  const vol2Headers = { authorization: `Bearer ${vol2Token}` };
  console.log('✓ Volunteer 1 and Volunteer 2 accounts created and authenticated.');

  // 3. Master Admin creates an event
  console.log('\n[TEST 3] Master Admin creates Event (Capacity: 2, Status: Published)...');
  const createEvt = await mockRequest('POST', '/api/events', {
    title: 'Marina Beach Eco Cleaning Drive',
    description: 'Cleanliness and plastic abatement rally at Marina Beach.',
    district: 'Chennai',
    venue: 'Marina Beach Service Road, Chennai',
    wing: 'Youth Wing',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
    start_time: '06:30',
    end_time: '23:59',
    capacity: 2,
    status: 'Published',
    organizer_name: 'Master Administrator',
    organizer_contact: '+91 98401 99999'
  }, adminHeaders);

  if (createEvt.status !== 201 || !createEvt.data.event?.id) {
    throw new Error(`Event creation failed: ${JSON.stringify(createEvt)}`);
  }
  const eventId = createEvt.data.event.id;
  console.log(`✓ Event created successfully with ID: ${eventId}`);

  // 4. Registered Member proposes an event -> Created with status 'Pending Approval'
  console.log('\n[TEST 4] Registered Volunteer creates event proposal -> Pending Approval...');
  const memberProposal = await mockRequest('POST', '/api/events', {
    title: 'Beach Cleanup & Turtle Protection Drive',
    category: 'Climate and environment',
    department: 'Environment, Sustainability & Ecological Restoration Department',
    description: 'Volunteer beach cleaning drive in Besant Nagar.',
    district: 'Chennai',
    venue: 'Besant Nagar Beach, Chennai',
    start_date: new Date(Date.now() + 86400000 * 7).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }),
    organisers: [
      { name: 'Kavitha S', designation: 'Lead Coordinator', phone: '9840111111', email: `${vol1Username}@tnv.org` },
      { name: 'Ravi Kumar', designation: 'Co-Lead', phone: '9840222222', email: 'ravi@tnv.org' }
    ],
    guests: [
      { name: 'Dr. S. Sundar', designation: 'District Forest Officer' }
    ]
  }, vol1Headers);

  if (memberProposal.status !== 201 || memberProposal.data.event?.status !== 'Pending Approval') {
    throw new Error(`Expected 201 Pending Approval for member proposal, got status=${memberProposal.status}, body=${JSON.stringify(memberProposal.data)}`);
  }
  const propEventId = memberProposal.data.event.id;
  console.log(`✓ Member event created with status Pending Approval (ID: ${propEventId}).`);

  // 4b. Master Admin reviews and approves the proposal
  console.log('\n[TEST 4b] Master Admin approves event proposal -> Generates scanner credentials & publishes...');
  const approveRes = await mockRequest('PATCH', `/api/events/${propEventId}/review`, {
    action: 'approve'
  }, adminHeaders);

  if (approveRes.status !== 200 || !approveRes.data.ok) {
    throw new Error(`Approval failed: ${JSON.stringify(approveRes)}`);
  }
  const approvedEvt = approveRes.data.event;
  if (!approvedEvt.scanner_username || !approvedEvt.scanner_password) {
    throw new Error(`Scanner credentials were not generated upon approval: ${JSON.stringify(approvedEvt)}`);
  }
  console.log(`✓ Proposal approved. Scanner Login: ${approvedEvt.scanner_username} / ${approvedEvt.scanner_password}`);

  // 4c. Master Admin tests rejection on another proposal
  console.log('\n[TEST 4c] Testing Master Admin rejection with reason on a secondary proposal...');
  const prop2 = await mockRequest('POST', '/api/events', {
    title: 'Duplicate Marathon Drive',
    organisers: [
      { name: 'Kavitha S', phone: '9840111111' },
      { name: 'Ravi Kumar', phone: '9840222222' }
    ]
  }, vol1Headers);
  const prop2Id = prop2.data.event?.id;
  const rejectRes = await mockRequest('PATCH', `/api/events/${prop2Id}/review`, {
    action: 'reject',
    reason: 'Schedule conflict with state youth convention'
  }, adminHeaders);
  if (rejectRes.status !== 200 || rejectRes.data.event?.status !== 'Rejected' || rejectRes.data.event?.rejection_reason !== 'Schedule conflict with state youth convention') {
    throw new Error(`Rejection test failed: ${JSON.stringify(rejectRes)}`);
  }
  console.log('✓ Rejection properly recorded reason and status "Rejected".');

  // 5. Volunteer 1 views events feed (checking is_registered: false on eventId)
  console.log('\n[TEST 5] Volunteer 1 views events feed (checking is_registered: false)...');
  const feedBefore = await mockRequest('GET', '/api/events', null, vol1Headers);
  if (feedBefore.status !== 200) {
    throw new Error(`Feed fetch failed: ${JSON.stringify(feedBefore)}`);
  }
  const evtBefore = feedBefore.data.events.find(e => e.id === eventId);
  if (!evtBefore || evtBefore.is_registered !== false || evtBefore.registered_count !== 0) {
    throw new Error(`Expected is_registered: false and registered_count: 0, got: ${JSON.stringify(evtBefore)}`);
  }
  console.log('✓ Event is listed with is_registered: false and registered_count: 0.');

  // 6. Volunteer 1 clicks "Volunteer Now" (POST /api/events/:id/register)
  console.log('\n[TEST 6] Volunteer 1 registers by clicking "Volunteer Now"...');
  const reg1Res = await mockRequest('POST', `/api/events/${eventId}/register`, {
    name: 'Kavitha S',
    email: `${vol1Username}@tnv.org`,
    phone: '9840111111'
  }, vol1Headers);
  if (reg1Res.status !== 200 || !reg1Res.data.ok || reg1Res.data.registered_count !== 1 || reg1Res.data.is_registered !== true) {
    throw new Error(`Volunteer 1 registration failed: ${JSON.stringify(reg1Res)}`);
  }
  console.log(`✓ Volunteer 1 registered: count=${reg1Res.data.registered_count}, is_registered=true`);

  // 7. Volunteer 1 queries events feed again -> is_registered should be true
  console.log('\n[TEST 7] Volunteer 1 queries feed after registering...');
  const feedAfter = await mockRequest('GET', '/api/events', null, vol1Headers);
  const evtAfter = feedAfter.data.events.find(e => e.id === eventId);
  if (!evtAfter || evtAfter.is_registered !== true || evtAfter.registered_count !== 1) {
    throw new Error(`Expected is_registered: true and count: 1, got: ${JSON.stringify(evtAfter)}`);
  }
  console.log('✓ Volunteer 1 feed now reflects is_registered: true and registered_count: 1.');

  // 8. Volunteer 2 queries feed -> is_registered should be false
  console.log('\n[TEST 8] Volunteer 2 queries feed (should be is_registered: false)...');
  const feedVol2 = await mockRequest('GET', '/api/events', null, vol2Headers);
  const evtVol2 = feedVol2.data.events.find(e => e.id === eventId);
  if (!evtVol2 || evtVol2.is_registered !== false || evtVol2.registered_count !== 1) {
    throw new Error(`Expected is_registered: false for Vol 2, got: ${JSON.stringify(evtVol2)}`);
  }
  console.log('✓ Volunteer 2 feed correctly shows is_registered: false, while count: 1.');

  // 9. Volunteer 1 attempts duplicate registration -> should be rejected with 409 Conflict
  console.log('\n[TEST 9] Volunteer 1 attempts duplicate registration...');
  const dupReg = await mockRequest('POST', `/api/events/${eventId}/register`, {
    name: 'Kavitha S',
    email: `${vol1Username}@tnv.org`,
    phone: '9840111111'
  }, vol1Headers);
  if (dupReg.status !== 409 || dupReg.data.ok !== false) {
    throw new Error(`Expected 409 Conflict for duplicate registration, got: ${JSON.stringify(dupReg)}`);
  }
  console.log('✓ Duplicate registration correctly rejected with 409 Conflict.');

  // 10. Volunteer 2 registers -> fills event to capacity (2 / 2)
  console.log('\n[TEST 10] Volunteer 2 registers (fills event to capacity 2/2)...');
  const reg2Res = await mockRequest('POST', `/api/events/${eventId}/register`, {
    name: 'Saravanan M',
    email: `${vol2Username}@tnv.org`,
    phone: '9840222222'
  }, vol2Headers);
  if (reg2Res.status !== 200 || reg2Res.data.registered_count !== 2) {
    throw new Error(`Volunteer 2 registration failed: ${JSON.stringify(reg2Res)}`);
  }
  console.log('✓ Volunteer 2 registered successfully. Event is now at capacity.');

  // 11a. Missing required registration fields returns 400
  console.log('\n[TEST 11a] Incomplete temporary registration returns 400 Bad Request...');
  const incompleteReg = await mockRequest('POST', `/api/events/${eventId}/register`, {});
  if (incompleteReg.status !== 400) {
    throw new Error(`Expected 400 Bad Request for incomplete registration, got: ${JSON.stringify(incompleteReg)}`);
  }
  console.log('✓ Missing fields rejected with 400.');

  // 11b. Third volunteer attempts registration on full event -> rejected
  console.log('\n[TEST 11b] Third registration attempts on full event...');
  const vol3Username = 'anand_' + Math.floor(1000 + Math.random() * 9000);
  const fullReg = await mockRequest('POST', `/api/events/${eventId}/register`, {
    name: 'Anand Kumar',
    email: `${vol3Username}@tnv.org`,
    phone: '9840333333'
  });
  if (fullReg.status !== 400 || !fullReg.data.error.includes('capacity')) {
    throw new Error(`Expected 400 Bad Request capacity reached, got: ${JSON.stringify(fullReg)}`);
  }
  console.log('✓ Capacity limit enforced correctly: rejected with 400 Bad Request.');

  // 11c. Multi-ticket visitor registration on the approved proposal event
  console.log('\n[TEST 11c] Registering temporary visitor with 2 extra members (3 total tickets)...');
  const multiReg = await mockRequest('POST', `/api/events/${propEventId}/register`, {
    name: 'Deepak Raj',
    email: 'deepak.raj@example.com',
    phone: '9840999888',
    extra_members: [
      { name: 'Karthik Raj', phone: '9840999777' },
      { name: 'Meena Raj', phone: '9840999666' }
    ]
  });
  if (multiReg.status !== 200 || multiReg.data.attendees?.length !== 3) {
    throw new Error(`Expected 3 tickets generated, got: ${JSON.stringify(multiReg)}`);
  }
  const primaryTicket = multiReg.data.attendees[0];
  console.log(`✓ Generated 3 tickets for visitor and 2 extra members. Primary Ticket: ${primaryTicket.ticket_id}`);

  // 12. Scanner Login & Check-in using generated credentials
  console.log('\n[TEST 12] Scanner login & QR ticket check-in...');
  const scannerLoginRes = await mockRequest('POST', `/api/events/${propEventId}/scanner-login`, {
    username: approvedEvt.scanner_username,
    password: approvedEvt.scanner_password
  });
  if (scannerLoginRes.status !== 200 || !scannerLoginRes.data.scanner_token) {
    throw new Error(`Scanner login failed: ${JSON.stringify(scannerLoginRes)}`);
  }
  const scannerHeaders = { authorization: `Bearer ${scannerLoginRes.data.scanner_token}` };
  console.log('✓ Scanner credentials authenticated successfully.');

  const checkinRes = await mockRequest('POST', `/api/events/${propEventId}/checkin`, {
    ticket_id: primaryTicket.ticket_id
  }, scannerHeaders);
  if (checkinRes.status !== 200 || !checkinRes.data.attendee?.checked_in) {
    throw new Error(`Check-in failed: ${JSON.stringify(checkinRes)}`);
  }
  console.log(`✓ Participant ${primaryTicket.name} checked in successfully!`);

  // 13. Checkout flow with Star Rating & Feedback
  console.log('\n[TEST 13] Participant Checkout with 5-star rating & feedback...');
  // Open checkout manually via scanner
  await mockRequest('POST', `/api/events/${propEventId}/checkout-toggle`, { open: true }, scannerHeaders);

  const checkoutRes = await mockRequest('POST', `/api/events/${propEventId}/checkout`, {
    phone: '9840999888',
    rating: 5,
    feedback: 'Incredible initiative! Well organised.'
  });
  if (checkoutRes.status !== 200 || !checkoutRes.data.ok) {
    throw new Error(`Checkout failed: ${JSON.stringify(checkoutRes)}`);
  }
  console.log('✓ Participant checkout and feedback recorded successfully.');

  // 14. Organiser uploads completion report
  console.log('\n[TEST 14] Organiser uploads event completion report with 4 photos...');
  const reportRes = await mockRequest('POST', `/api/events/${propEventId}/report`, {
    photos: ['data:image/png;base64,mock1', 'data:image/png;base64,mock2', 'data:image/png;base64,mock3', 'data:image/png;base64,mock4'],
    overview: 'The beach cleanup gathered over 300kg of marine debris with passionate volunteers.'
  }, vol1Headers);
  if (reportRes.status !== 200 || !reportRes.data.report) {
    throw new Error(`Report upload failed: ${JSON.stringify(reportRes)}`);
  }
  console.log('✓ Event completion report and metrics saved successfully.');

  // 14b. Master Admin configures and publishes certificate template, then verifies participant lookup
  console.log('\n[TEST 14b] Master Admin publishes certificate template & tests dual participant lookup...');
  const tRes = await mockRequest('POST', '/api/certificates/templates', {
    eventId: propEventId,
    imageBase64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    imageName: 'test-template.png',
    namePosition: { x: 50, y: 50, fontSize: 24, fontColor: '#000000' },
    qrPosition: { x: 200, y: 200, size: 80 }
  }, adminHeaders);
  if (tRes.status !== 200) {
    throw new Error(`Failed to save certificate template: ${JSON.stringify(tRes)}`);
  }
  const pRes = await mockRequest('POST', `/api/certificates/templates/${propEventId}/publish`, {}, adminHeaders);
  if (pRes.status !== 200) {
    throw new Error(`Failed to publish certificate template: ${JSON.stringify(pRes)}`);
  }

  // Checked-out Deepak Raj should be eligible
  const certEligible = await mockRequest('GET', `/api/events/${propEventId}/certificates/lookup?ticket_id=${primaryTicket.ticket_id}`);
  if (certEligible.status !== 200 || !certEligible.data.eligible) {
    throw new Error(`Expected eligible certificate for checked-out participant, got: ${JSON.stringify(certEligible)}`);
  }
  console.log('✓ Checked-out attendee is eligible for certificate download.');

  // Unchecked-out Karthik Raj should be rejected with 403
  const secondTicket = multiReg.data.attendees[1];
  const certBlocked = await mockRequest('GET', `/api/events/${propEventId}/certificates/lookup?ticket_id=${secondTicket.ticket_id}`);
  if (certBlocked.status !== 403) {
    throw new Error(`Expected 403 for unchecked-out participant, got: ${JSON.stringify(certBlocked)}`);
  }
  console.log('✓ Unchecked-out attendee correctly blocked from certificate download (403).');

  // 14c. Strict Checkout Window test (closing checkout blocks submissions)
  console.log('\n[TEST 14c] Strict Checkout Window: closing toggle blocks checkouts...');
  await mockRequest('POST', `/api/events/${propEventId}/checkout-toggle`, { open: false }, scannerHeaders);
  const checkoutClosed = await mockRequest('POST', `/api/events/${propEventId}/checkout`, {
    ticket_id: secondTicket.ticket_id,
    rating: 4,
    feedback: 'Good'
  });
  if (checkoutClosed.status !== 400) {
    throw new Error(`Expected 400 when checkout is closed, got: ${JSON.stringify(checkoutClosed)}`);
  }
  console.log('✓ Checkout strictly blocked when checkout window is closed (400).');

  // Re-open checkout and complete second ticket
  await mockRequest('POST', `/api/events/${propEventId}/checkout-toggle`, { open: true }, scannerHeaders);
  const checkoutReopened = await mockRequest('POST', `/api/events/${propEventId}/checkout`, {
    ticket_id: secondTicket.ticket_id,
    rating: 4,
    feedback: 'Great coordination!'
  });
  if (checkoutReopened.status !== 200 || !checkoutReopened.data.ok) {
    throw new Error(`Expected successful checkout on reopen, got: ${JSON.stringify(checkoutReopened)}`);
  }
  console.log(`✓ Reopened checkout succeeded. Event average rating: ${checkoutReopened.data.average_rating}`);

  // 14d. Minimum 2 organizers required for member proposal
  console.log('\n[TEST 14d] Rule 4: Event creation requires at least 2 organizers...');
  const singleOrgProposal = await mockRequest('POST', '/api/events', {
    title: 'Solo Organizer Event',
    organisers: [{ name: 'Solo Leader', phone: '9840111111' }]
  }, vol1Headers);
  if (singleOrgProposal.status !== 400 || !singleOrgProposal.data.error.includes('2 organisers')) {
    throw new Error(`Expected 400 requiring 2 organizers, got: ${JSON.stringify(singleOrgProposal)}`);
  }
  console.log('✓ Proposal with fewer than 2 organizers correctly rejected with 400.');

  // 15. Master Admin views volunteer roster
  console.log('\n[TEST 15] Master Admin inspects registered volunteers roster...');
  const rosterRes = await mockRequest('GET', `/api/events/${eventId}/participants`, null, adminHeaders);
  if (rosterRes.status !== 200 || !rosterRes.data.ok || rosterRes.data.total !== 2) {
    throw new Error(`Failed to get participants roster: ${JSON.stringify(rosterRes)}`);
  }
  console.log('✓ Master Admin retrieved roster with 2 registered volunteers.');

  // 16. Delete event and verify cascade deletion of registrations
  console.log('\n[TEST 16] Master Admin deletes event (cascading registrations)...');
  const delRes = await mockRequest('DELETE', `/api/events/${eventId}`, null, adminHeaders);
  if (delRes.status !== 200 || !delRes.data.ok) {
    throw new Error(`Event deletion failed: ${JSON.stringify(delRes)}`);
  }
  const check404 = await mockRequest('GET', `/api/events/${eventId}`);
  if (check404.status !== 404) {
    throw new Error(`Expected 404 after deletion, got ${check404.status}`);
  }
  console.log('✓ Event deleted and 404 verified.');

  console.log('\n===============================================================');
  console.log('   ALL 16 EVENT MANAGEMENT & COORDINATION TESTS PASSED!        ');
  console.log('===============================================================');
}

runTests().catch(err => {
  console.error('\n❌ Test Suite Failed:', err);
  process.exit(1);
});
