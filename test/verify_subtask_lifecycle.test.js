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

async function runSubtaskTests() {
  console.log('===============================================================');
  console.log('   TESTING SUBTASK CREATION & LIFECYCLE WORKFLOW               ');
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

  // 2. Register & approve volunteer
  console.log('\n[TEST 2] Registering & approving volunteer for subtasks...');
  const volUsername = `subvol_${Date.now().toString().slice(-8)}`;
  const regRes = await mockRequest('POST', '/api/register', {
    full_name: 'Kavitha Sundaram',
    username: volUsername,
    email: `${volUsername}@test.com`,
    phone: '9840888777',
    password: 'VolunteerPass2026!',
    aadhaar: '987654321088',
    district_id: 3,
    district_name: 'Chennai',
    wing_name: 'Operations Wing',
    wing_to_join: 'Operations Wing — Programs, Public Service & Social Impact',
    preferred_designation: 'Active Member',
    dob: '1998-05-15',
    blood_group: 'O+',
    gender: 'Female',
    marital_status: 'Single',
    occupation: 'Field Engineer',
    address: '12 Greenways Road, Chennai',
    pincode: '600028',
    previous_experience: 'Community volunteer',
    past_field_work: ['Environmental & Climate Department'],
    terms_accepted: true
  });
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
  console.log(`✓ Volunteer "${volUsername}" ready.`);

  // 3. Create parent task
  console.log('\n[TEST 3] Creating parent task...');
  const taskRes = await mockRequest('POST', '/api/tasks', {
    title: 'Adyar River Environmental Monitoring',
    description: 'Set up real-time monitoring and take samples.',
    department: 'Environmental & Climate Action Department',
    expected_output: 'Full field report with 3 station samples.',
    assignee_id: volId,
    priority: 'HIGH',
    deadline: new Date(Date.now() + 86400000 * 5).toISOString(),
    assigned_date: '2026-11-20',
    approval_status: 'assigned'
  }, adminToken);
  assert.strictEqual(taskRes.status, 201);
  const parentTask = taskRes.data.task;
  console.log(`✓ Parent task created: ${parentTask.task_id} (${parentTask.id})`);

  // 4. Create Subtask as DRAFT with all required fields
  console.log('\n[TEST 4] Creating subtask as DRAFT with all fields...');
  const draftSubRes = await mockRequest('POST', `/api/tasks/${parentTask.id}/subtasks`, {
    title: 'Deploy Water Quality Sensors at Adyar Riverbank',
    assigned_date: '2026-11-20',
    due_date: '2026-11-22T17:00',
    priority: 'HIGH',
    points: 25,
    description: 'Mount sensor boxes at points A, B, and C with solar panels facing south.',
    expected_output: 'Calibration log and 3 geo-tagged installation photos.',
    approval_status: 'draft'
  }, adminToken);

  assert.strictEqual(draftSubRes.status, 201, 'Subtask should be created with 201');
  const draftSubtask = draftSubRes.data.subtask;
  assert(draftSubtask.id, 'Subtask must have an id');
  assert.strictEqual(draftSubtask.title, 'Deploy Water Quality Sensors at Adyar Riverbank');
  assert.strictEqual(draftSubtask.assigned_date, '2026-11-20');
  assert.strictEqual(draftSubtask.due_date, '2026-11-22T17:00');
  assert.strictEqual(draftSubtask.priority, 'HIGH');
  assert.strictEqual(draftSubtask.points, 25);
  assert.strictEqual(draftSubtask.description, 'Mount sensor boxes at points A, B, and C with solar panels facing south.');
  assert.strictEqual(draftSubtask.expected_output, 'Calibration log and 3 geo-tagged installation photos.');
  assert.strictEqual(draftSubtask.approval_status, 'draft');
  assert.strictEqual(draftSubtask.status, 'NOT_STARTED');
  assert.strictEqual(draftSubtask.completed, false);
  console.log('✓ Subtask created as DRAFT with all required fields.');

  // 5. Volunteer checks subtasks - Draft MUST be hidden
  console.log('\n[TEST 5] Volunteer checks subtasks (Draft subtask MUST be hidden)...');
  const volSubRes1 = await mockRequest('GET', `/api/tasks/${parentTask.id}/subtasks`, null, volToken);
  assert.strictEqual(volSubRes1.status, 200);
  const foundDraftSub = (volSubRes1.data.subtasks || []).some(s => s.id === draftSubtask.id);
  assert.strictEqual(foundDraftSub, false, 'Draft subtask must not appear in volunteer subtasks list');

  const volTaskRes1 = await mockRequest('GET', '/api/tasks', null, volToken);
  const taskInList = (volTaskRes1.data.tasks || []).find(t => t.id === parentTask.id);
  assert(taskInList, 'Parent task found');
  const foundDraftInTask = (taskInList.subtasks || []).some(s => s.id === draftSubtask.id);
  assert.strictEqual(foundDraftInTask, false, 'Draft subtask must not appear in volunteer task subtasks array');
  console.log('✓ Verified: Draft subtask is strictly hidden from volunteer.');

  // 6. Admin publishes subtask: approval_status -> 'assigned'
  console.log('\n[TEST 6] Admin publishes subtask (approval_status -> assigned)...');
  const publishSubRes = await mockRequest('PATCH', `/api/tasks/${parentTask.id}/subtasks/${draftSubtask.id}`, {
    approval_status: 'assigned'
  }, adminToken);
  assert.strictEqual(publishSubRes.status, 200);
  assert.strictEqual(publishSubRes.data.subtask.approval_status, 'assigned');

  // Now volunteer checks - subtask MUST appear
  const volSubRes2 = await mockRequest('GET', `/api/tasks/${parentTask.id}/subtasks`, null, volToken);
  const assignedSub = (volSubRes2.data.subtasks || []).find(s => s.id === draftSubtask.id);
  assert(assignedSub, 'Published subtask must be visible to volunteer');
  assert.strictEqual(assignedSub.approval_status, 'assigned');
  assert.strictEqual(assignedSub.status, 'NOT_STARTED');
  console.log('✓ Verified: Published subtask is visible to volunteer with NOT_STARTED status.');

  // 7. Lifecycle: Volunteer starts working (status -> IN_PROGRESS)
  console.log('\n[TEST 7] Volunteer moves subtask to IN_PROGRESS...');
  const inProgRes = await mockRequest('PATCH', `/api/tasks/${parentTask.id}/subtasks/${draftSubtask.id}`, {
    status: 'IN_PROGRESS'
  }, volToken);
  assert.strictEqual(inProgRes.status, 200);
  assert.strictEqual(inProgRes.data.subtask.status, 'IN_PROGRESS');
  assert.strictEqual(inProgRes.data.subtask.completed, false);
  console.log('✓ Volunteer moved subtask to IN_PROGRESS.');

  // 8. Lifecycle: Volunteer submits for review (status -> SUBMITTED_FOR_REVIEW)
  console.log('\n[TEST 8] Volunteer submits subtask for review...');
  const submitReviewRes = await mockRequest('PATCH', `/api/tasks/${parentTask.id}/subtasks/${draftSubtask.id}`, {
    status: 'SUBMITTED_FOR_REVIEW'
  }, volToken);
  assert.strictEqual(submitReviewRes.status, 200);
  assert.strictEqual(submitReviewRes.data.subtask.status, 'SUBMITTED_FOR_REVIEW');
  console.log('✓ Volunteer submitted subtask for review.');

  // 9. Lifecycle: Admin rejects with rework (status -> REWORK_REQUIRED)
  console.log('\n[TEST 9] Admin rejects subtask with REWORK_REQUIRED...');
  const reworkRes = await mockRequest('PATCH', `/api/tasks/${parentTask.id}/subtasks/${draftSubtask.id}`, {
    status: 'REWORK_REQUIRED'
  }, adminToken);
  assert.strictEqual(reworkRes.status, 200);
  assert.strictEqual(reworkRes.data.subtask.status, 'REWORK_REQUIRED');
  console.log('✓ Admin set subtask to REWORK_REQUIRED.');

  // 10. Lifecycle: Volunteer re-submits for review
  console.log('\n[TEST 10] Volunteer re-submits subtask for review...');
  const resubmitRes = await mockRequest('PATCH', `/api/tasks/${parentTask.id}/subtasks/${draftSubtask.id}`, {
    status: 'SUBMITTED_FOR_REVIEW'
  }, volToken);
  assert.strictEqual(resubmitRes.status, 200);
  assert.strictEqual(resubmitRes.data.subtask.status, 'SUBMITTED_FOR_REVIEW');
  console.log('✓ Subtask re-submitted for review.');

  // 11. Lifecycle: Admin approves & completes subtask (status -> COMPLETED)
  console.log('\n[TEST 11] Admin approves & completes subtask...');
  const completeSubRes = await mockRequest('PATCH', `/api/tasks/${parentTask.id}/subtasks/${draftSubtask.id}`, {
    status: 'COMPLETED'
  }, adminToken);
  assert.strictEqual(completeSubRes.status, 200);
  assert.strictEqual(completeSubRes.data.subtask.status, 'COMPLETED');
  assert.strictEqual(completeSubRes.data.subtask.completed, true);
  assert(completeSubRes.data.subtask.completed_at, 'completed_at should be recorded');
  console.log('✓ Subtask approved and completed.');

  // 12. Delete subtask
  console.log('\n[TEST 12] Deleting subtask...');
  const delRes = await mockRequest('DELETE', `/api/tasks/${parentTask.id}/subtasks/${draftSubtask.id}`, null, adminToken);
  assert.strictEqual(delRes.status, 200);
  console.log('✓ Subtask deleted successfully.');

  // Clean up parent task
  await mockRequest('DELETE', `/api/tasks/${parentTask.id}`, null, adminToken);
  console.log('✓ Parent task cleaned up.');

  console.log('\n===============================================================');
  console.log('   ALL SUBTASK LIFECYCLE TESTS PASSED!                         ');
  console.log('===============================================================');
}

runSubtaskTests().catch(err => {
  console.error('\n❌ Test Failure:', err);
  process.exit(1);
});
