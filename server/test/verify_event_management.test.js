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
    start_date: '2026-11-20',
    end_date: '2026-11-20',
    start_time: '06:30',
    end_time: '11:00',
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

  // 4. Non-admin attempting to create an event should fail
  console.log('\n[TEST 4] Verifying role check: Volunteer cannot create event...');
  const volCreate = await mockRequest('POST', '/api/events', {
    title: 'Unauthorized Event'
  }, vol1Headers);
  if (volCreate.status !== 403) {
    throw new Error(`Expected 403 Forbidden for volunteer creating event, got ${volCreate.status}`);
  }
  console.log('✓ Volunteer creation correctly rejected with 403 Forbidden.');

  // 5. Volunteer 1 views events feed
  console.log('\n[TEST 5] Volunteer 1 views events feed (checking is_registered: false)...');
  const feedBefore = await mockRequest('GET', '/api/events', null, vol1Headers);
  if (feedBefore.status !== 200 || feedBefore.data.events.length !== 1) {
    throw new Error(`Feed fetch failed: ${JSON.stringify(feedBefore)}`);
  }
  const evtBefore = feedBefore.data.events[0];
  if (evtBefore.is_registered !== false || evtBefore.registered_count !== 0) {
    throw new Error(`Expected is_registered: false and registered_count: 0, got: ${JSON.stringify(evtBefore)}`);
  }
  console.log('✓ Event is listed with is_registered: false and registered_count: 0.');

  // 6. Volunteer 1 clicks "Volunteer Now" (POST /api/events/:id/register)
  console.log('\n[TEST 6] Volunteer 1 registers by clicking "Volunteer Now"...');
  const reg1Res = await mockRequest('POST', `/api/events/${eventId}/register`, null, vol1Headers);
  if (reg1Res.status !== 200 || !reg1Res.data.ok || reg1Res.data.registered_count !== 1 || reg1Res.data.is_registered !== true) {
    throw new Error(`Volunteer 1 registration failed: ${JSON.stringify(reg1Res)}`);
  }
  console.log(`✓ Volunteer 1 registered: count=${reg1Res.data.registered_count}, is_registered=true`);

  // 7. Volunteer 1 queries events feed again -> is_registered should be true
  console.log('\n[TEST 7] Volunteer 1 queries feed after registering...');
  const feedAfter = await mockRequest('GET', '/api/events', null, vol1Headers);
  const evtAfter = feedAfter.data.events[0];
  if (evtAfter.is_registered !== true || evtAfter.registered_count !== 1) {
    throw new Error(`Expected is_registered: true and count: 1, got: ${JSON.stringify(evtAfter)}`);
  }
  console.log('✓ Volunteer 1 feed now reflects is_registered: true and registered_count: 1.');

  // 8. Volunteer 2 queries feed -> is_registered should be false
  console.log('\n[TEST 8] Volunteer 2 queries feed (should be is_registered: false)...');
  const feedVol2 = await mockRequest('GET', '/api/events', null, vol2Headers);
  const evtVol2 = feedVol2.data.events[0];
  if (evtVol2.is_registered !== false || evtVol2.registered_count !== 1) {
    throw new Error(`Expected is_registered: false for Vol 2, got: ${JSON.stringify(evtVol2)}`);
  }
  console.log('✓ Volunteer 2 feed correctly shows is_registered: false, while count: 1.');

  // 9. Volunteer 1 attempts duplicate registration -> should be rejected with 409 Conflict
  console.log('\n[TEST 9] Volunteer 1 attempts duplicate registration...');
  const dupReg = await mockRequest('POST', `/api/events/${eventId}/register`, null, vol1Headers);
  if (dupReg.status !== 409 || dupReg.data.ok !== false) {
    throw new Error(`Expected 409 Conflict for duplicate registration, got: ${JSON.stringify(dupReg)}`);
  }
  console.log('✓ Duplicate registration correctly rejected with 409 Conflict.');

  // 10. Volunteer 2 registers -> fills event to capacity (2 / 2)
  console.log('\n[TEST 10] Volunteer 2 registers (fills event to capacity 2/2)...');
  const reg2Res = await mockRequest('POST', `/api/events/${eventId}/register`, null, vol2Headers);
  if (reg2Res.status !== 200 || reg2Res.data.registered_count !== 2) {
    throw new Error(`Volunteer 2 registration failed: ${JSON.stringify(reg2Res)}`);
  }
  console.log('✓ Volunteer 2 registered successfully. Event is now at capacity.');

  // 11a. Unauthenticated user attempts registration -> must be rejected with 401 Unauthorized
  console.log('\n[TEST 11a] Unauthenticated user attempts registration...');
  const unauthReg = await mockRequest('POST', `/api/events/${eventId}/register`);
  if (unauthReg.status !== 401 || !unauthReg.data.require_login) {
    throw new Error(`Expected 401 Unauthorized with require_login: true, got: ${JSON.stringify(unauthReg)}`);
  }
  console.log('✓ Unauthenticated registration strictly rejected with 401 Unauthorized (require_login: true).');

  // 11b. Third volunteer attempts registration -> should fail with capacity full
  console.log('\n[TEST 11b] Third authenticated volunteer attempts registration on full event...');
  const vol3Username = 'anand_' + Math.floor(1000 + Math.random() * 9000);
  const reg3 = await mockRequest('POST', '/api/register', {
    full_name: 'Anand Kumar',
    username: vol3Username,
    email: `${vol3Username}@tnv.org`,
    phone: '9840333333',
    password: 'VolunteerPass2026!',
    aadhaar: '901290129012',
    district_id: 3,
    district_name: 'Chennai',
    wing_name: 'Youth Wing',
    wing_to_join: 'Youth Wing - Environmental & Tree Plantation',
    preferred_designation: 'Active Volunteer',
    dob: '1992-03-10',
    blood_group: 'B+',
    gender: 'Male',
    marital_status: 'Single',
    occupation: 'Analyst',
    address: '88 Mount Road, Chennai',
    pincode: '600002',
    previous_experience: 'Fresher / First time volunteer',
    past_field_work: ['fresher'],
    terms_accepted: true
  });
  await mockRequest('POST', '/api/admin/approve', {
    profile_id: reg3.data.user.id,
    role: 'volunteer',
    wing_id: 1
  }, adminHeaders);

  const vol3Login = await mockRequest('POST', '/api/login', {
    username: vol3Username,
    password: 'VolunteerPass2026!'
  });
  const vol3Token = vol3Login.data.session?.access_token || vol3Login.data.token;
  const vol3Headers = { authorization: `Bearer ${vol3Token}` };

  const fullReg = await mockRequest('POST', `/api/events/${eventId}/register`, null, vol3Headers);
  if (fullReg.status !== 400 || !fullReg.data.error.includes('capacity')) {
    throw new Error(`Expected 400 Bad Request capacity reached, got: ${JSON.stringify(fullReg)}`);
  }
  console.log('✓ Capacity limit enforced correctly: rejected with 400 Bad Request.');

  // 12. Master Admin views volunteer roster (GET /api/events/:id/participants)
  console.log('\n[TEST 12] Master Admin inspects registered volunteers roster...');
  const rosterRes = await mockRequest('GET', `/api/events/${eventId}/participants`, null, adminHeaders);
  if (rosterRes.status !== 200 || !rosterRes.data.ok || rosterRes.data.total !== 2) {
    throw new Error(`Failed to get participants roster: ${JSON.stringify(rosterRes)}`);
  }
  const pNames = rosterRes.data.participants.map(p => p.volunteer_name);
  if (!pNames.includes('Kavitha S') || !pNames.includes('Saravanan M')) {
    throw new Error(`Expected Kavitha S and Saravanan M in roster, found: ${pNames.join(', ')}`);
  }
  console.log(`✓ Master Admin retrieved roster with 2 registered volunteers: ${pNames.join(', ')}`);

  // 13. Volunteer attempts to view roster -> rejected with 403
  console.log('\n[TEST 13] Verifying Volunteer cannot access admin participants roster...');
  const volRoster = await mockRequest('GET', `/api/events/${eventId}/participants`, null, vol1Headers);
  if (volRoster.status !== 403) {
    throw new Error(`Expected 403 Forbidden for volunteer accessing roster, got ${volRoster.status}`);
  }
  console.log('✓ Volunteer roster access correctly rejected with 403 Forbidden.');

  // 14. Master Admin lifecycle transitions: Published -> Ongoing -> Completed
  console.log('\n[TEST 14] Master Admin transitions event to Completed...');
  const completeRes = await mockRequest('PATCH', `/api/events/${eventId}/status`, { status: 'Completed' }, adminHeaders);
  if (completeRes.status !== 200 || completeRes.data.event?.status !== 'Completed') {
    throw new Error(`Status transition failed: ${JSON.stringify(completeRes)}`);
  }
  console.log('✓ Event transitioned to Completed.');

  // 14b. Completed event remains visible in public=true feed
  console.log('\n[TEST 14b] Verifying Completed event remains visible in public feed...');
  const publicFeedAfterComplete = await mockRequest('GET', '/api/events?public=true', null, vol1Headers);
  const foundCompletedEvt = publicFeedAfterComplete.data.events.find(e => e.id === eventId);
  if (!foundCompletedEvt || foundCompletedEvt.status !== 'Completed') {
    throw new Error(`Completed event disappeared from public feed! Got: ${JSON.stringify(publicFeedAfterComplete.data)}`);
  }
  console.log('✓ Verified: Completed event stays visible with status "Completed"!');

  // 15. Attempting registration on a Completed event is rejected
  console.log('\n[TEST 15] Verifying registration on Completed event is rejected...');
  const completedReg = await mockRequest('POST', `/api/events/${eventId}/register`, null, vol3Headers);
  if (completedReg.status !== 400 || !completedReg.data.error.includes('closed')) {
    throw new Error(`Expected registration to be closed on completed event, got: ${JSON.stringify(completedReg)}`);
  }
  console.log('✓ Registration rejected for non-open event.');

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
