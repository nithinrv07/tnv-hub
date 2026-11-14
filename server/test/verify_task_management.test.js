// In-process mock test suite for TNV Task Management & Coordination
// Verifies Master Admin -> Volunteer task assignment, status updates, and live reflection
const EventEmitter = require('events');
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
  console.log('   TESTING TNV TASK MANAGEMENT (MASTER ADMIN & VOLUNTEER)      ');
  console.log('===============================================================');

  // 1. Sign in as Master Admin
  console.log('\n[TEST 1] Logging in as Master Admin...');
  const adminLogin = await mockRequest('POST', '/api/login', {
    username: 'masteradmin',
    password: process.env.ADMIN_PASSWORD || 'AdminPassword2026!'
  });
  const adminToken = adminLogin.data.session?.access_token || adminLogin.data.token;
  if (adminLogin.status !== 200 || !adminToken) {
    throw new Error(`Master admin login failed: ${JSON.stringify(adminLogin)}`);
  }
  console.log('✓ Master Admin signed in successfully.');

  // 2. Register a new volunteer
  console.log('\n[TEST 2] Registering and approving volunteer...');
  const volUsername = `vol_${Date.now()}`;
  const volEmail = `${volUsername}@test.com`;
  const regRes = await mockRequest('POST', '/api/register', {
    full_name: 'K. Meenakshi Sundaram',
    username: volUsername,
    email: volEmail,
    phone: '9840123456',
    password: 'VolunteerPass2026!',
    aadhaar: '987654321012',
    district_id: 3,
    district_name: 'Chennai',
    wing_name: 'Youth Wing',
    wing_to_join: 'Youth Wing - Environmental & Tree Plantation',
    preferred_designation: 'Active Volunteer',
    dob: '1998-05-15',
    blood_group: 'O+',
    gender: 'Male',
    marital_status: 'Single',
    occupation: 'Software Engineer',
    address: '12 Anna Salai, Chennai',
    pincode: '600002',
    previous_experience: 'Fresher / First time volunteer',
    past_field_work: ['fresher'],
    terms_accepted: true
  });

  if ((regRes.status !== 200 && regRes.status !== 201) || !regRes.data?.user?.id) {
    throw new Error(`Volunteer registration failed: ${JSON.stringify(regRes)}`);
  }
  const volunteerId = regRes.data.user.id;

  // Approve volunteer as active member
  const approveRes = await mockRequest('POST', '/api/admin/approve', {
    profile_id: volunteerId,
    role: 'volunteer',
    wing_id: 1
  }, adminToken);
  console.log(`✓ Volunteer "${volUsername}" registered and approved.`);

  // Log in as Volunteer
  const volLogin = await mockRequest('POST', '/api/login', {
    username: volUsername,
    password: 'VolunteerPass2026!'
  });
  const volToken = volLogin.data.session?.access_token || volLogin.data.token;
  if (volLogin.status !== 200 || !volToken) {
    throw new Error(`Volunteer login failed: ${JSON.stringify(volLogin)}`);
  }
  console.log('✓ Volunteer signed in successfully.');

  // 3. Admin fetches volunteers list for task assignment
  console.log('\n[TEST 3] Master Admin fetches volunteers list (/api/tasks/volunteers)...');
  const volListRes = await mockRequest('GET', '/api/tasks/volunteers', null, adminToken);
  if (volListRes.status !== 200 || !Array.isArray(volListRes.data?.volunteers)) {
    throw new Error(`Failed to fetch volunteers: ${JSON.stringify(volListRes)}`);
  }
  const foundInList = volListRes.data.volunteers.find(v => v.id === volunteerId);
  if (!foundInList) {
    throw new Error(`Registered volunteer not found in /api/tasks/volunteers`);
  }
  console.log(`✓ Retrieved ${volListRes.data.volunteers.length} volunteer(s). Target volunteer found in roster.`);

  // 4. Admin creates and assigns a task to the volunteer
  console.log('\n[TEST 4] Master Admin assigns task to volunteer...');
  const taskPayload = {
    title: 'Assemble 100 Emergency First Aid Packs',
    description: 'Procure dry bandages, antiseptic solutions, and water purification tablets at Chennai hub.',
    assignee_id: volunteerId,
    priority: 'HIGH',
    deadline: '2026-11-15T18:00:00.000Z'
  };
  const createTaskRes = await mockRequest('POST', '/api/tasks', taskPayload, adminToken);
  if (createTaskRes.status !== 201 || !createTaskRes.data?.task?.id) {
    throw new Error(`Task creation failed: ${JSON.stringify(createTaskRes)}`);
  }
  const taskId = createTaskRes.data.task.id;
  const createdTask = createTaskRes.data.task;
  if (createdTask.status !== 'TODO' || createdTask.assignee_id !== volunteerId) {
    throw new Error(`Task state mismatch: ${JSON.stringify(createdTask)}`);
  }
  console.log(`✓ Created task "${createdTask.title}" (ID: ${taskId}) with status: ${createdTask.status}`);

  // 5. Volunteer views tasks assigned to them
  console.log('\n[TEST 5] Volunteer views "My Tasks" (/api/tasks)...');
  const volTasksRes = await mockRequest('GET', '/api/tasks', null, volToken);
  if (volTasksRes.status !== 200 || !Array.isArray(volTasksRes.data?.tasks)) {
    throw new Error(`Volunteer failed to fetch tasks: ${JSON.stringify(volTasksRes)}`);
  }
  const assignedToMe = volTasksRes.data.tasks.find(t => t.id === taskId);
  if (!assignedToMe) {
    throw new Error(`Assigned task not found in volunteer task list!`);
  }
  console.log(`✓ Volunteer successfully received task: "${assignedToMe.title}" with status "${assignedToMe.status}".`);

  // 6. Volunteer updates status to IN_PROGRESS
  console.log('\n[TEST 6] Volunteer changes task status to IN_PROGRESS...');
  const progressRes = await mockRequest('PATCH', `/api/tasks/${taskId}/status`, { status: 'IN_PROGRESS' }, volToken);
  if (progressRes.status !== 200 || progressRes.data?.task?.status !== 'IN_PROGRESS') {
    throw new Error(`Failed to update status to IN_PROGRESS: ${JSON.stringify(progressRes)}`);
  }
  console.log('✓ Volunteer updated task status to IN_PROGRESS.');

  // 7. Verify Master Admin sees the live reflected status as IN_PROGRESS
  console.log('\n[TEST 7] Verifying live status reflection for Master Admin...');
  const adminCheckRes1 = await mockRequest('GET', '/api/tasks', null, adminToken);
  const adminTaskView1 = adminCheckRes1.data.tasks.find(t => t.id === taskId);
  if (adminTaskView1.status !== 'IN_PROGRESS') {
    throw new Error(`Live reflection failed! Admin saw: ${adminTaskView1.status}, expected: IN_PROGRESS`);
  }
  console.log(`✓ Verified: Master Admin sees live status as "${adminTaskView1.status}"!`);

  // 8. Volunteer marks task as COMPLETED
  console.log('\n[TEST 8] Volunteer marks task as COMPLETED...');
  const completeRes = await mockRequest('PATCH', `/api/tasks/${taskId}/status`, { status: 'COMPLETED' }, volToken);
  if (completeRes.status !== 200 || completeRes.data?.task?.status !== 'COMPLETED' || !completeRes.data?.task?.completed_at) {
    throw new Error(`Failed to mark task COMPLETED: ${JSON.stringify(completeRes)}`);
  }
  console.log('✓ Volunteer marked task COMPLETED.');

  // 9. Verify Master Admin sees the live reflected status as COMPLETED
  console.log('\n[TEST 9] Verifying live completed status reflection for Master Admin...');
  const adminCheckRes2 = await mockRequest('GET', '/api/tasks', null, adminToken);
  const adminTaskView2 = adminCheckRes2.data.tasks.find(t => t.id === taskId);
  if (adminTaskView2.status !== 'COMPLETED') {
    throw new Error(`Live reflection failed! Admin saw: ${adminTaskView2.status}, expected: COMPLETED`);
  }
  console.log(`✓ Verified: Master Admin sees task as "${adminTaskView2.status}" completed at ${adminTaskView2.completed_at}!`);

  // 10. Admin deletes task
  console.log('\n[TEST 10] Admin removes task...');
  const delRes = await mockRequest('DELETE', `/api/tasks/${taskId}`, null, adminToken);
  if (delRes.status !== 200 || !delRes.data?.ok) {
    throw new Error(`Task deletion failed: ${JSON.stringify(delRes)}`);
  }
  console.log('✓ Task removed successfully.');

  // 11. Verify 404 after deletion
  const verifyDel = await mockRequest('PATCH', `/api/tasks/${taskId}/status`, { status: 'TODO' }, volToken);
  if (verifyDel.status !== 404) {
    throw new Error(`Deleted task was still found: ${JSON.stringify(verifyDel)}`);
  }
  console.log('✓ Verified task is deleted (returns 404).');

  console.log('\n===============================================================');
  console.log('   ALL TASK MANAGEMENT TESTS PASSED WITH 100% SUCCESS!         ');
  console.log('===============================================================');
}

runTests().catch(err => {
  console.error('\n❌ Test Suite Failed:', err);
  process.exit(1);
});
