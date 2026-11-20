const EventEmitter = require('events');
const assert = require('assert');
const serverApp = require('../server.js');

function mockRequest(method, urlPath, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const req = new EventEmitter();
    req.method = method;
    req.url = urlPath;
    req.headers = {
      host: 'localhost:3000',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
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
  console.log('   TESTING ENHANCED TNV TASK MANAGEMENT LIFECYCLE              ');
  console.log('===============================================================');

  // 1. Admin login
  console.log('\n[TEST 1] Master Admin sign-in...');
  const adminLogin = await mockRequest('POST', '/api/login', {
    username: 'masteradmin',
    password: process.env.ADMIN_PASSWORD || 'AdminPassword2026!'
  });
  const adminToken = adminLogin.data.session?.access_token || adminLogin.data.token;
  assert.strictEqual(adminLogin.status, 200);
  assert(adminToken, 'Admin token required');
  console.log('✓ Master Admin signed in successfully.');

  // 2. Register volunteer
  console.log('\n[TEST 2] Registering & approving volunteer...');
  const volUsername = `v_${Date.now().toString().slice(-8)}`;
  const regRes = await mockRequest('POST', '/api/register', {
    full_name: 'Priya Ramanathan',
    username: volUsername,
    email: `${volUsername}@test.com`,
    phone: '9840999888',
    password: 'VolunteerPass2026!',
    aadhaar: '987654321099',
    district_id: 3,
    district_name: 'Chennai',
    wing_name: 'Operations Wing',
    wing_to_join: 'Operations Wing — Programs, Public Service & Social Impact',
    preferred_designation: 'Active Member',
    dob: '1997-04-12',
    blood_group: 'B+',
    gender: 'Female',
    marital_status: 'Single',
    occupation: 'Teacher',
    address: '45 Adyar Main Road, Chennai',
    pincode: '600020',
    previous_experience: 'Community volunteer',
    past_field_work: ['Health & Wellness Department'],
    terms_accepted: true
  });
  if (!regRes.data?.user) {
    console.log('REG ERROR:', regRes.data);
    throw new Error('Registration failed');
  }
  const volId = regRes.data.user.id;
  await mockRequest('POST', '/api/admin/approve', {
    profile_id: volId,
    role: 'volunteer',
    wing_id: 2
  }, adminToken);

  const volLogin = await mockRequest('POST', '/api/login', {
    username: volUsername,
    password: 'VolunteerPass2026!'
  });
  const volToken = volLogin.data.session?.access_token || volLogin.data.token;
  assert(volToken, 'Volunteer token required');
  console.log(`✓ Volunteer "${volUsername}" registered and approved.`);

  // 3. Create Draft Task -> hidden from volunteer
  console.log('\n[TEST 3] Creating task as DRAFT (must be hidden from volunteer)...');
  const draftTaskRes = await mockRequest('POST', '/api/tasks', {
    title: 'Inspect Emergency Flood Equipment',
    description: 'Verify life jackets, inflatable rafts, and solar batteries at Chennai buffer store.',
    department: 'Emergency Crisis & Disaster Management Department',
    expected_output: 'Equipment inspection log sheet and 4 warehouse condition photos.',
    assignee_id: volId,
    priority: 'HIGH',
    deadline: new Date(Date.now() + 86400000 * 3).toISOString(),
    assigned_date: new Date().toISOString(),
    approval_status: 'draft'
  }, adminToken);

  assert.strictEqual(draftTaskRes.status, 201);
  const draftTask = draftTaskRes.data.task;
  assert(draftTask.task_id.startsWith('TNV-TSK-'), 'Task ID must start with TNV-TSK-');
  assert.strictEqual(draftTask.approval_status, 'draft');
  assert.strictEqual(draftTask.department, 'Emergency Crisis & Disaster Management Department');
  assert.strictEqual(draftTask.expected_output, 'Equipment inspection log sheet and 4 warehouse condition photos.');
  assert.strictEqual(draftTask.seen_status, 'not_seen');
  console.log(`✓ Draft task created with Task ID: ${draftTask.task_id}`);

  // Volunteer checks tasks - must NOT see draft
  const volTasksBefore = await mockRequest('GET', '/api/tasks', null, volToken);
  assert.strictEqual(volTasksBefore.status, 200);
  const foundDraft = (volTasksBefore.data.tasks || []).some(t => t.id === draftTask.id);
  assert.strictEqual(foundDraft, false, 'Draft task must NOT be visible to volunteer');
  console.log('✓ Verified: Draft task is hidden from volunteer.');

  // 4. Update Approval Status to 'assigned'
  console.log('\n[TEST 4] Updating approval status to "assigned"...');
  const publishRes = await mockRequest('PATCH', `/api/tasks/${draftTask.id}/approval`, {
    approval_status: 'assigned'
  }, adminToken);
  assert.strictEqual(publishRes.status, 200);
  assert.strictEqual(publishRes.data.task.approval_status, 'assigned');

  // Now volunteer checks tasks - MUST see it
  const volTasksAfter = await mockRequest('GET', '/api/tasks', null, volToken);
  const foundAssigned = (volTasksAfter.data.tasks || []).find(t => t.id === draftTask.id);
  assert(foundAssigned, 'Assigned task MUST be visible to volunteer');
  assert.strictEqual(foundAssigned.seen_status, 'not_seen');
  console.log('✓ Verified: Task is now delivered to volunteer with seen_status "not_seen" (single tick).');

  // 5. Volunteer marks task as seen
  console.log('\n[TEST 5] Volunteer marks task as seen (WhatsApp-style double blue ticks)...');
  const seenRes = await mockRequest('POST', `/api/tasks/${draftTask.id}/seen`, null, volToken);
  assert.strictEqual(seenRes.status, 200);
  assert.strictEqual(seenRes.data.task.seen_status, 'seen');
  assert(seenRes.data.task.seen_at, 'seen_at timestamp must be recorded');

  // Admin checks tasks - must reflect seen
  const adminTaskCheck = await mockRequest('GET', '/api/tasks', null, adminToken);
  const adminViewTask = adminTaskCheck.data.tasks.find(t => t.id === draftTask.id);
  assert.strictEqual(adminViewTask.seen_status, 'seen');
  console.log(`✓ Verified: Admin sees task as SEEN at ${adminViewTask.seen_at}`);

  // 6. Interactive Status Transitions: IN_PROGRESS -> SUBMITTED_FOR_REVIEW -> REWORK_REQUIRED -> COMPLETED
  console.log('\n[TEST 6] Testing interactive lifecycle statuses...');
  // Volunteer moves to IN_PROGRESS
  const s1 = await mockRequest('PATCH', `/api/tasks/${draftTask.id}/status`, { status: 'IN_PROGRESS' }, volToken);
  assert.strictEqual(s1.status, 200);
  assert.strictEqual(s1.data.task.status, 'IN_PROGRESS');

  // Volunteer moves to SUBMITTED_FOR_REVIEW
  const s2 = await mockRequest('PATCH', `/api/tasks/${draftTask.id}/status`, { status: 'SUBMITTED_FOR_REVIEW' }, volToken);
  assert.strictEqual(s2.status, 200);
  assert.strictEqual(s2.data.task.status, 'SUBMITTED_FOR_REVIEW');

  // Admin sets REWORK_REQUIRED
  const s3 = await mockRequest('PATCH', `/api/tasks/${draftTask.id}/status`, { status: 'REWORK_REQUIRED' }, adminToken);
  assert.strictEqual(s3.status, 200);
  assert.strictEqual(s3.data.task.status, 'REWORK_REQUIRED');

  // Verify: Completion remarks rejected when task is NOT completed
  const earlyRemarks = await mockRequest('POST', `/api/tasks/${draftTask.id}/remarks`, {
    remarks: 'Trying to add remarks before completion'
  }, adminToken);
  assert.strictEqual(earlyRemarks.status, 400, 'Remarks must only be allowed when task is completed');
  console.log('✓ Verified: Completion remarks rejected when task is not completed.');

  // 7. Supporting documents bidirectional sharing & WhatsApp-style seen receipt
  console.log('\n[TEST 7] Bidirectional supporting documents upload & open receipts...');
  // Volunteer uploads a field report
  const docUploadRes = await mockRequest('POST', `/api/tasks/${draftTask.id}/documents`, {
    name: 'Flood_Inspection_Report.pdf',
    size: 245000,
    type: 'application/pdf',
    data: 'data:application/pdf;base64,JVBERi0xLjQK...'
  }, volToken);
  assert.strictEqual(docUploadRes.status, 200);
  const volDoc = docUploadRes.data.document;
  assert.strictEqual(volDoc.name, 'Flood_Inspection_Report.pdf');
  assert.strictEqual(volDoc.uploaded_role, 'volunteer');
  assert.strictEqual(volDoc.seen_by_recipient, false, 'Unopened document has seen_by_recipient false');

  // Admin opens the volunteer's document -> marks seen
  const adminOpenDoc = await mockRequest('POST', `/api/tasks/${draftTask.id}/documents/${volDoc.id}/open`, null, adminToken);
  assert.strictEqual(adminOpenDoc.status, 200);
  assert.strictEqual(adminOpenDoc.data.document.seen_by_recipient, true, 'Document marked seen when recipient opens it');
  assert(adminOpenDoc.data.document.seen_at, 'Document has seen_at timestamp');
  console.log('✓ Verified: Document delivery receipt switches to double blue ticks upon recipient opening.');

  // Admin uploads an instruction checklist document
  const adminDocRes = await mockRequest('POST', `/api/tasks/${draftTask.id}/documents`, {
    name: 'Standard_Inspection_Checklist.pdf',
    size: 120000,
    type: 'application/pdf',
    data: 'data:application/pdf;base64,JVBERi0xLjQK...'
  }, adminToken);
  assert.strictEqual(adminDocRes.status, 200);
  const adminDoc = adminDocRes.data.document;
  assert.strictEqual(adminDoc.seen_by_recipient, false);

  // Volunteer opens admin's document -> marks seen
  const volOpenDoc = await mockRequest('POST', `/api/tasks/${draftTask.id}/documents/${adminDoc.id}/open`, null, volToken);
  assert.strictEqual(volOpenDoc.status, 200);
  assert.strictEqual(volOpenDoc.data.document.seen_by_recipient, true);
  console.log('✓ Supporting documents bidirectional WhatsApp seen receipts verified.');

  // 8. Final completion & Completion Remarks
  console.log('\n[TEST 8] Final completion by Admin & Completion Remarks...');
  const completeRes = await mockRequest('PATCH', `/api/tasks/${draftTask.id}/status`, { status: 'COMPLETED' }, adminToken);
  assert.strictEqual(completeRes.status, 200);
  assert.strictEqual(completeRes.data.task.status, 'COMPLETED');

  // Now task is completed, Admin records completion remarks
  const remarksRes = await mockRequest('POST', `/api/tasks/${draftTask.id}/remarks`, {
    remarks: 'Excellent flood mitigation field work. All packs accounted for and geo-tagged.'
  }, adminToken);
  assert.strictEqual(remarksRes.status, 200);
  assert.strictEqual(remarksRes.data.task.completion_remarks, 'Excellent flood mitigation field work. All packs accounted for and geo-tagged.');
  console.log('✓ Task marked as COMPLETED and Completion Remarks recorded.');

  // Cleanup
  await mockRequest('DELETE', `/api/tasks/${draftTask.id}`, null, adminToken);
  console.log('✓ Cleaned up test task.');

  console.log('\n===============================================================');
  console.log('   ALL ENHANCED TASK MANAGEMENT TESTS PASSED WITH 100%!        ');
  console.log('===============================================================');
}

runTests().catch(err => {
  console.error('\n❌ Test Failure:', err);
  process.exit(1);
});
