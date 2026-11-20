/**
 * In-process mock test suite for Event Certificate Management & Volunteer Distribution
 * Tests:
 * 1. Admin login & event creation
 * 2. Volunteer registration for the event
 * 3. Certificate template creation and layout configuration
 * 4. Certificate publishing
 * 5. Volunteer retrieval of published certificates
 * 6. Public QR verification endpoint
 */

const EventEmitter = require('events');
const assert = require('assert');
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
  console.log('--- Starting Certificate Management Automated Test Suite ---');

  // 1. Admin Login
  console.log('\n[1] Testing Admin Login...');
  const adminLoginRes = await mockRequest('POST', '/api/login', {
    username: 'masteradmin',
    password: process.env.ADMIN_PASSWORD || 'AdminPassword2026!'
  });
  assert.strictEqual(adminLoginRes.status, 200, `Admin login should succeed: ${JSON.stringify(adminLoginRes.data)}`);
  const adminToken = adminLoginRes.data.session?.access_token || adminLoginRes.data.token;
  assert.ok(adminToken, 'Admin token should be returned');
  const adminHeaders = { authorization: `Bearer ${adminToken}` };
  console.log('✓ Admin login successful.');

  // 2. Create an Event for testing certificates
  console.log('\n[2] Creating Test Event for Certificates...');
  const createEvtRes = await mockRequest('POST', '/api/events', {
    title: 'Marina Beach Mega Cleanup Drive 2026',
    description: 'Coastal conservation and plastic cleanup initiative.',
    district: 'Chennai',
    venue: 'Marina Beach Light House',
    wing: 'Environment Wing',
    start_date: '2026-11-15',
    end_date: '2026-11-15',
    start_time: '06:30',
    end_time: '11:30',
    capacity: 50,
    status: 'Published'
  }, adminHeaders);

  assert.strictEqual(createEvtRes.status, 201, `Event creation should succeed: ${JSON.stringify(createEvtRes.data)}`);
  const eventId = createEvtRes.data.event.id;
  assert.ok(eventId, 'Event ID should be returned');
  console.log(`✓ Event created with ID: ${eventId}`);

  // 3. Register volunteer for this event
  console.log('\n[3] Registering volunteer for test event...');
  const regRes = await mockRequest('POST', `/api/events/${eventId}/register`, {}, adminHeaders);
  assert.strictEqual(regRes.status, 200, `Volunteer registration should succeed: ${JSON.stringify(regRes.data)}`);
  assert.ok(regRes.data.registration, 'Registration details should be returned');
  const regId = regRes.data.registration.id;
  console.log(`✓ Volunteer registered with registration ID: ${regId}`);

  // 4. Save Certificate Template Configuration
  console.log('\n[4] Saving Certificate Template & Layout Coordinates...');
  const sampleImageBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const saveTmplRes = await mockRequest('POST', '/api/certificates/templates', {
    eventId,
    imageBase64: sampleImageBase64,
    imageName: 'coastal-cleanup-template.png',
    namePosition: { x: 50, y: 48, fontSize: 38, color: '#1E4620' },
    qrPosition: { x: 50, y: 78, size: 130 }
  }, adminHeaders);

  assert.strictEqual(saveTmplRes.status, 200, `Save template should succeed: ${JSON.stringify(saveTmplRes.data)}`);
  assert.ok(saveTmplRes.data.ok, 'Save template ok should be true');
  assert.strictEqual(saveTmplRes.data.template.event_id, eventId);
  assert.strictEqual(saveTmplRes.data.template.status, 'DRAFT');
  console.log('✓ Certificate template configuration saved (status: DRAFT).');

  // 5. Fetch single event template
  console.log('\n[5] Fetching template details for event...');
  const fetchTmplRes = await mockRequest('GET', `/api/certificates/templates/${eventId}`, null, adminHeaders);
  assert.strictEqual(fetchTmplRes.status, 200);
  assert.ok(fetchTmplRes.data.template);
  assert.strictEqual(fetchTmplRes.data.registered_count, 1);
  console.log(`✓ Fetched template successfully. Registered attendees: ${fetchTmplRes.data.registered_count}`);

  // 6. Publish Certificates
  console.log('\n[6] Publishing Certificates...');
  const publishRes = await mockRequest('POST', `/api/certificates/templates/${eventId}/publish`, {}, adminHeaders);
  assert.strictEqual(publishRes.status, 200, `Publish should succeed: ${JSON.stringify(publishRes.data)}`);
  assert.strictEqual(publishRes.data.template.status, 'PUBLISHED');
  assert.ok(publishRes.data.template.published_at);
  console.log('✓ Certificates PUBLISHED successfully!');

  // 7. Verify in Active Certificates Registry
  console.log('\n[7] Querying Active Certificates Registry...');
  const activeListRes = await mockRequest('GET', '/api/certificates/templates', null, adminHeaders);
  assert.strictEqual(activeListRes.status, 200);
  const publishedEntry = activeListRes.data.templates.find(t => t.event_id === eventId);
  assert.ok(publishedEntry, 'Published event must appear in active certificates list');
  assert.strictEqual(publishedEntry.status, 'PUBLISHED');
  console.log(`✓ Active templates registry verified (${activeListRes.data.templates.length} templates).`);

  // 8. Volunteer Dashboard: Query My Certificates
  console.log('\n[8] Querying volunteer certificates (/api/certificates/my-certificates)...');
  const myCertsRes = await mockRequest('GET', '/api/certificates/my-certificates', null, adminHeaders);
  assert.strictEqual(myCertsRes.status, 200);
  assert.ok(Array.isArray(myCertsRes.data.certificates));
  const volunteerCert = myCertsRes.data.certificates.find(c => c.event_id === eventId);
  assert.ok(volunteerCert, 'Volunteer must see published certificate for registered event');
  assert.strictEqual(volunteerCert.event_title, 'Marina Beach Mega Cleanup Drive 2026');
  console.log(`✓ Volunteer certificates verified: Found certificate for "${volunteerCert.event_title}"`);

  // 9. Public QR Verification Endpoint
  console.log('\n[9] Testing public certificate verification (/api/certificates/verify/:regId)...');
  const verifyRes = await mockRequest('GET', `/api/certificates/verify/${regId}`);
  assert.strictEqual(verifyRes.status, 200);
  assert.strictEqual(verifyRes.data.verified, true);
  assert.strictEqual(verifyRes.data.event_title, 'Marina Beach Mega Cleanup Drive 2026');
  assert.ok(verifyRes.data.certificate_id);
  console.log(`✓ Public QR verification verified: Recipient="${verifyRes.data.recipient_name}", Event="${verifyRes.data.event_title}"`);

  // Clean up test event
  await mockRequest('DELETE', `/api/events/${eventId}`, null, adminHeaders);

  console.log('\n======================================================');
  console.log('🎉 ALL CERTIFICATE MANAGEMENT TESTS PASSED WITH 100% SUCCESS!');
  console.log('======================================================\n');
}

runTests().catch(err => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
