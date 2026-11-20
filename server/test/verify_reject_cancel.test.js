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

async function runRejectCancelTests() {
  console.log('===============================================================');
  console.log('   TESTING REJECT & CANCEL WORKFLOW (MAIN TASK & SUBTASKS)     ');
  console.log('===============================================================');

  // 1. Admin login
  console.log('\n[TEST 1] Admin sign-in...');
  const adminLogin = await mockRequest('POST', '/api/login', {
    username: 'masteradmin',
    password: process.env.ADMIN_PASSWORD || 'AdminPassword2026!'
  });
  const adminToken = adminLogin.data.session?.access_token || adminLogin.data.token;
  assert(adminToken, 'Admin token required');
  console.log('✓ Admin signed in.');

  // 2. Register volunteer
  console.log('\n[TEST 2] Registering volunteer...');
  const volUsername = `canvol_${Date.now().toString().slice(-8)}`;
  const regRes = await mockRequest('POST', '/api/register', {
    full_name: 'Muthuvel Karunanidhi',
    username: volUsername,
    email: `${volUsername}@test.com`,
    phone: '9840777666',
    password: 'VolunteerPass2026!',
    aadhaar: '987654321077',
    district_id: 3,
    district_name: 'Chennai',
    wing_name: 'Operations Wing',
    wing_to_join: 'Operations Wing — Programs, Public Service & Social Impact',
    preferred_designation: 'Active Member',
    dob: '1995-06-10',
    blood_group: 'A+',
    gender: 'Male',
    marital_status: 'Single',
    occupation: 'Social Worker',
    address: '10 Anna Salai, Chennai',
    pincode: '600002',
    previous_experience: 'Community volunteer',
    past_field_work: ['Community Development Department'],
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
  console.log('✓ Volunteer approved and ready.');

  // 3. Create task & subtask
  console.log('\n[TEST 3] Creating task with subtask...');
  const taskRes = await mockRequest('POST', '/api/tasks', {
    title: 'Disaster Relief Kit Sorting',
    description: 'Sort and packet 200 first aid kits at Mylapore center.',
    department: '5. Emergency Crisis & Disaster Management Department',
    expected_output: 'Inventory report of sorted kits.',
    assignee_id: volId,
    priority: 'HIGH',
    deadline: new Date(Date.now() + 86400000).toISOString(),
    assigned_date: '2026-11-20',
    approval_status: 'assigned'
  }, adminToken);
  assert.strictEqual(taskRes.status, 201);
  const task = taskRes.data.task;

  const subRes = await mockRequest('POST', `/api/tasks/${task.id}/subtasks`, {
    title: 'Verify Expiry Dates on Antiseptics',
    assigned_date: '2026-11-20',
    due_date: '2026-11-21T18:00',
    priority: 'URGENT',
    points: 15,
    description: 'Check dates on 200 bottles.',
    expected_output: 'Log sheet of expired bottles.',
    approval_status: 'assigned'
  }, adminToken);
  assert.strictEqual(subRes.status, 201);
  const subtask = subRes.data.subtask;
  console.log(`✓ Task (${task.task_id}) and subtask created.`);

  // 4. Volunteer submits for review
  console.log('\n[TEST 4] Volunteer submits task and subtask for review...');
  await mockRequest('PATCH', `/api/tasks/${task.id}/status`, { status: 'IN_PROGRESS' }, volToken);
  await mockRequest('PATCH', `/api/tasks/${task.id}/status`, { status: 'SUBMITTED_FOR_REVIEW' }, volToken);

  await mockRequest('PATCH', `/api/tasks/${task.id}/subtasks/${subtask.id}`, { status: 'IN_PROGRESS' }, volToken);
  await mockRequest('PATCH', `/api/tasks/${task.id}/subtasks/${subtask.id}`, { status: 'SUBMITTED_FOR_REVIEW' }, volToken);
  console.log('✓ Both moved to SUBMITTED_FOR_REVIEW.');

  // 5. Admin clicks Reject -> Marks as CANCELLED
  console.log('\n[TEST 5] Admin rejects task -> status becomes CANCELLED...');
  const cancelTaskRes = await mockRequest('PATCH', `/api/tasks/${task.id}/status`, { status: 'CANCELLED' }, adminToken);
  assert.strictEqual(cancelTaskRes.status, 200);
  assert.strictEqual(cancelTaskRes.data.task.status, 'CANCELLED');
  console.log('✓ Main task rejected and marked as CANCELLED.');

  console.log('\n[TEST 6] Admin rejects subtask -> status becomes CANCELLED...');
  const cancelSubRes = await mockRequest('PATCH', `/api/tasks/${task.id}/subtasks/${subtask.id}`, { status: 'CANCELLED' }, adminToken);
  assert.strictEqual(cancelSubRes.status, 200);
  assert.strictEqual(cancelSubRes.data.subtask.status, 'CANCELLED');
  console.log('✓ Subtask rejected and marked as CANCELLED.');

  // 6. Cleanup
  await mockRequest('DELETE', `/api/tasks/${task.id}`, null, adminToken);
  console.log('✓ Cleaned up test task.');

  console.log('\n===============================================================');
  console.log('   ALL REJECT & CANCEL TESTS PASSED SUCCESSFULLY!              ');
  console.log('===============================================================');
}

runRejectCancelTests().catch(err => {
  console.error('\n❌ Test Failure:', err);
  process.exit(1);
});
