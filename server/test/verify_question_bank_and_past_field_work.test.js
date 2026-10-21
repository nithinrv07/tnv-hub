const assert = require('assert');

const BASE_URL = 'http://localhost:3000';

async function runTests() {
  console.log('=== VERIFYING QUESTION BANK & PAST FIELD WORK ENHANCEMENTS ===\n');

  // Step 1: Login as Master Admin
  console.log('1. Logging in as Master Admin...');
  const loginRes = await fetch(`${BASE_URL}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'masteradmin', password: 'AdminPassword2026!' })
  });
  const loginData = await loginRes.json();
  assert.strictEqual(loginRes.status, 200, 'Admin login must return 200');
  const token = loginData.session?.access_token;
  assert(token, 'Must receive access_token');
  console.log('   ✓ Logged in as masteradmin successfully.');

  // Step 2: Fetch all questions
  console.log('2. Fetching Question Bank...');
  const questRes = await fetch(`${BASE_URL}/api/admin/questions`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const questData = await questRes.json();
  assert.strictEqual(questRes.status, 200);
  const questions = questData.questions;
  assert(Array.isArray(questions) && questions.length > 0, 'Questions must be an array');
  console.log(`   ✓ Loaded ${questions.length} questions from question bank.`);

  // Step 3: Deactivate question 1 and verify
  console.log('3. Deactivating Question 1...');
  const q1 = questions[0];
  const patchRes = await fetch(`${BASE_URL}/api/admin/questions/toggle-active`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ id: q1.id, active: false })
  });
  const patchData = await patchRes.json();
  assert.strictEqual(patchRes.status, 200, 'toggle-active must return 200');
  assert.strictEqual(patchData.active, false, 'Question 1 active must be false');
  console.log('   ✓ Question 1 successfully deactivated.');

  // Step 4: Re-activate question 1
  console.log('4. Activating Question 1...');
  const patchRes2 = await fetch(`${BASE_URL}/api/admin/questions/toggle-active`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ id: q1.id, active: true })
  });
  const patchData2 = await patchRes2.json();
  assert.strictEqual(patchRes2.status, 200);
  assert.strictEqual(patchData2.active, true, 'Question 1 active must be true');
  console.log('   ✓ Question 1 successfully re-activated.');

  // Step 5: Save Active 10 Questions
  console.log('5. Setting 10 Active Questions...');
  const activeTen = questions.slice(0, 10).map(q => q.id);
  const setActiveRes = await fetch(`${BASE_URL}/api/admin/questions/set-active`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ active_ids: activeTen })
  });
  const setActiveData = await setActiveRes.json();
  assert.strictEqual(setActiveRes.status, 200, 'set-active must return 200');
  assert.strictEqual(setActiveData.active_count, 10, 'Active count must be 10');
  console.log('   ✓ Active set of 10 questions saved successfully.');

  // Step 6: Create new question
  console.log('6. Adding new custom question...');
  const addRes = await fetch(`${BASE_URL}/api/admin/questions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      question_en: 'How do you handle grassroots conflict during relief drives?',
      question_ta: 'நிவாரணப் பணிகளின் போது ஏற்படும் முரண்பாடுகளை எவ்வாறு கையாளுவீர்கள்?',
      hint: '1.0 = clear de-escalation; 0.5 = neutral; 0.0 = escalates conflict'
    })
  });
  const addData = await addRes.json();
  assert.strictEqual(addRes.status, 201, 'POST /api/admin/questions must return 201');
  const createdQ = addData.question;
  assert(createdQ && createdQ.id, 'Must return created question with ID');
  console.log(`   ✓ New question created with ID: ${createdQ.id}`);

  // Step 7: Delete the newly created question
  console.log('7. Deleting the custom question...');
  const delRes = await fetch(`${BASE_URL}/api/admin/questions?id=${createdQ.id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
  const delData = await delRes.json();
  assert.strictEqual(delRes.status, 200, 'DELETE must return 200');
  assert.strictEqual(delData.success, true);
  console.log('   ✓ Custom question successfully deleted.');

  // Step 8: Test Registration with past_field_work dropdown array
  console.log('8. Testing Volunteer Registration with past_field_work array...');
  const rand = Math.floor(100000 + Math.random() * 900000);
  const regRes = await fetch(`${BASE_URL}/api/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      full_name: 'Field Volunteer Test',
      phone: `9876${rand}`,
      email: `field_test_${rand}@example.com`,
      username: `fld_${rand}`,
      password: 'VolunteerPass123!',
      district_id: 3,
      dob: '1998-08-15',
      gender: 'Female',
      blood_group: 'B+',
      aadhaarNumber: '123456789012',
      aadhaar: '123456789012',
      pincode: '600028',
      past_field_work: [
        'Health, Hygiene & Sanitation',
        'Blood Donation Initiatives',
        'Disaster Response'
      ],
      previous_works: 'Active volunteer in cyclone relief and health camps across Chennai.'
    })
  });
  const regData = await regRes.json();
  assert.strictEqual(regRes.status, 201, 'Registration must return 201');
  assert(regData.profile, 'Profile must be returned');
  assert(Array.isArray(regData.profile.past_field_work), 'past_field_work must be an array');
  assert.strictEqual(regData.profile.past_field_work.length, 3, 'Must have 3 past field work items');
  assert(regData.profile.past_field_work.includes('Blood Donation Initiatives'));
  console.log('   ✓ Registered volunteer with past_field_work correctly persisted.');

  console.log('\n===============================================================');
  console.log('   ALL QUESTION BANK & PAST FIELD WORK TESTS PASSED 100%!');
  console.log('===============================================================\n');
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
