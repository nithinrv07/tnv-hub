// In-process mock test suite for TNV Event Management & Lifecycle Coordination
const EventEmitter = require('events');
const serverApp = require('../server.js');

function mockRequest(method, urlPath, body = null) {
  return new Promise((resolve, reject) => {
    const req = new EventEmitter();
    req.method = method;
    req.url = urlPath;
    req.headers = {
      host: 'localhost:3000',
      ...(body ? { 'content-type': 'application/json' } : {})
    };

    let statusCode = 200;
    let headers = {};
    let responseData = '';

    const res = {
      writeHead(code, h) {
        statusCode = code;
        if (h) Object.assign(headers, h);
      },
      setHeader(name, val) {
        headers[name.toLowerCase()] = val;
      },
      end(chunk) {
        if (chunk) responseData += chunk;
        let parsed;
        try {
          parsed = JSON.parse(responseData);
        } catch (_e) {
          parsed = responseData;
        }
        resolve({ status: statusCode, data: parsed, headers });
      }
    };

    // Execute handleRequest
    try {
      serverApp(req, res);
      // Wait next tick for listeners to be attached
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
  console.log('   TESTING TNV EVENT MANAGEMENT & LIFECYCLE COORDINATION       ');
  console.log('===============================================================');

  // 1. GET /api/events - List seeded events
  console.log('\n[TEST 1] Listing all events...');
  const listRes = await mockRequest('GET', '/api/events');
  if (listRes.status !== 200 || !listRes.data.ok || !Array.isArray(listRes.data.events)) {
    throw new Error(`Failed to list events: ${JSON.stringify(listRes)}`);
  }
  console.log(`✓ Retrieved ${listRes.data.events.length} events (statuses: ${[...new Set(listRes.data.events.map(e => e.status))].join(', ')})`);

  // 2. Filter by status: Published
  console.log('\n[TEST 2] Filtering by status=Published...');
  const pubRes = await mockRequest('GET', '/api/events?status=Published');
  if (pubRes.status !== 200 || pubRes.data.events.some(e => e.status !== 'Published')) {
    throw new Error(`Status filter failed: ${JSON.stringify(pubRes)}`);
  }
  console.log(`✓ Filtered to ${pubRes.data.events.length} Published events.`);

  // 3. Filter by public view (only Published & Ongoing)
  console.log('\n[TEST 3] Public events filter (public=true)...');
  const publicRes = await mockRequest('GET', '/api/events?public=true');
  const nonPublicFound = publicRes.data.events.some(e => e.status !== 'Published' && e.status !== 'Ongoing');
  if (nonPublicFound) {
    throw new Error(`Public view returned non-public status: ${JSON.stringify(publicRes)}`);
  }
  console.log(`✓ Public view successfully restricted to Published and Ongoing drives (${publicRes.data.events.length} items).`);

  // 4. POST /api/events - Create new event (starts in Draft)
  console.log('\n[TEST 4] Creating new Event in Draft status...');
  const newEventPayload = {
    title: 'TNV Youth Coastal Mangrove Restoration Drive',
    description: 'Planting 5,000 mangrove saplings in the Pichavaram buffer to guard against coastal surges.',
    district: 'Cuddalore',
    venue: 'Pichavaram Mangrove Wetlands, Cuddalore',
    wing: 'Youth Wing',
    start_date: '2026-12-10',
    end_date: '2026-12-11',
    start_time: '08:00',
    end_time: '15:00',
    capacity: 120,
    status: 'Draft',
    organizer_name: 'Dr. S. Sundaram',
    organizer_contact: '+91 94440 99887',
    tags: ['Mangroves', 'Coastal Defense', 'Youth Wing']
  };

  const createRes = await mockRequest('POST', '/api/events', newEventPayload);
  if (createRes.status !== 201 || !createRes.data.ok || !createRes.data.event?.id) {
    throw new Error(`Failed to create event: ${JSON.stringify(createRes)}`);
  }
  const createdId = createRes.data.event.id;
  console.log(`✓ Created event with ID: ${createdId}, status: ${createRes.data.event.status}`);

  // 5. GET /api/events/:id - Retrieve created event
  console.log('\n[TEST 5] Getting single event by ID...');
  const getSingleRes = await mockRequest('GET', `/api/events/${createdId}`);
  if (getSingleRes.status !== 200 || getSingleRes.data.event?.id !== createdId) {
    throw new Error(`Failed to get event by ID: ${JSON.stringify(getSingleRes)}`);
  }
  console.log(`✓ Successfully fetched: "${getSingleRes.data.event.title}"`);

  // 6. PATCH /api/events/:id/status - Transition Lifecycle (Draft -> Published -> Ongoing -> Completed)
  console.log('\n[TEST 6] Testing Lifecycle status transitions...');

  // 6a. Draft -> Published
  const toPublished = await mockRequest('PATCH', `/api/events/${createdId}/status`, { status: 'Published' });
  if (toPublished.status !== 200 || toPublished.data.event.status !== 'Published') {
    throw new Error(`Transition to Published failed: ${JSON.stringify(toPublished)}`);
  }
  console.log('✓ Transitioned: Draft -> Published');

  // 6b. Published -> Ongoing
  const toOngoing = await mockRequest('PATCH', `/api/events/${createdId}/status`, { status: 'Ongoing' });
  if (toOngoing.status !== 200 || toOngoing.data.event.status !== 'Ongoing') {
    throw new Error(`Transition to Ongoing failed: ${JSON.stringify(toOngoing)}`);
  }
  console.log('✓ Transitioned: Published -> Ongoing');

  // 6c. Ongoing -> Completed
  const toCompleted = await mockRequest('PATCH', `/api/events/${createdId}/status`, { status: 'Completed' });
  if (toCompleted.status !== 200 || toCompleted.data.event.status !== 'Completed') {
    throw new Error(`Transition to Completed failed: ${JSON.stringify(toCompleted)}`);
  }
  console.log('✓ Transitioned: Ongoing -> Completed');

  // 6d. Invalid status rejection
  const invalidStatus = await mockRequest('PATCH', `/api/events/${createdId}/status`, { status: 'NonExistentStatus' });
  if (invalidStatus.status !== 400 || invalidStatus.data.ok !== false) {
    throw new Error(`Invalid status was not rejected: ${JSON.stringify(invalidStatus)}`);
  }
  console.log('✓ Invalid status correctly rejected with 400 Bad Request.');

  // 7. PUT /api/events/:id - Update Event details
  console.log('\n[TEST 7] Updating Event details...');
  const updateRes = await mockRequest('PUT', `/api/events/${createdId}`, {
    venue: 'Pichavaram Eco Tourism Center & Jetty 2, Cuddalore',
    capacity: 150
  });
  if (updateRes.status !== 200 || updateRes.data.event.capacity !== 150) {
    throw new Error(`Failed to update event: ${JSON.stringify(updateRes)}`);
  }
  console.log(`✓ Updated venue to: "${updateRes.data.event.venue}", capacity: ${updateRes.data.event.capacity}`);

  // 8. POST /api/events/:id/register - Volunteer registration
  console.log('\n[TEST 8] Testing Volunteer registration / sign up...');
  const regRes = await mockRequest('POST', `/api/events/${createdId}/register`);
  if (regRes.status !== 200 || regRes.data.registered_count !== 1) {
    throw new Error(`Registration failed: ${JSON.stringify(regRes)}`);
  }
  console.log(`✓ Successfully registered volunteer (count: ${regRes.data.registered_count})`);

  // 9. DELETE /api/events/:id - Delete Event
  console.log('\n[TEST 9] Deleting Event...');
  const delRes = await mockRequest('DELETE', `/api/events/${createdId}`);
  if (delRes.status !== 200 || !delRes.data.ok) {
    throw new Error(`Delete failed: ${JSON.stringify(delRes)}`);
  }
  console.log('✓ Event deleted successfully.');

  // 10. Verify 404 after deletion
  const verifyDel = await mockRequest('GET', `/api/events/${createdId}`);
  if (verifyDel.status !== 404) {
    throw new Error(`Deleted event still returned 200: ${JSON.stringify(verifyDel)}`);
  }
  console.log('✓ Verified deleted event returns 404 Not Found.');

  console.log('\n===============================================================');
  console.log('   ALL EVENT MANAGEMENT LIFECYCLE TESTS PASSED PERFECTLY!     ');
  console.log('===============================================================');
}

runTests().catch(err => {
  console.error('\n❌ Test Suite Failed:', err);
  process.exit(1);
});
