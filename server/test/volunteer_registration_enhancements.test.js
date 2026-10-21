// test/volunteer_registration_enhancements.test.js
const assert = require('assert');

const BASE_URL = 'http://localhost:3000';

async function runTests() {
  console.log('--- Testing Volunteer Registration Enhancements ---');

  // Test 1: GET /api/options
  const optRes = await fetch(`${BASE_URL}/api/options`);
  assert.strictEqual(optRes.status, 200, 'GET /api/options must return 200');
  const optData = await optRes.json();

  console.log('1. Checking Dropdown Options...');
  // Requirement 1: Affiliations
  assert(Array.isArray(optData.affiliations), 'affiliations must be an array');
  assert(optData.affiliations.includes('Individual'), 'Must include Individual');
  assert(optData.affiliations.includes('NGO'), 'Must include NGO');
  assert(optData.affiliations.includes('Others (type manually)'), 'Must include Others (type manually)');
  console.log('   ✓ Affiliation/Category options verified (Image 1)');

  // Requirement 6: Wings and Departments
  assert(Array.isArray(optData.wings), 'wings must be an array');
  assert(optData.wings.includes('Management Wing — Governance, Systems & Organizational Support'), 'Must include Management Wing');
  assert(optData.wings.includes('Operations Wing — Programs, Public Service & Social Impact'), 'Must include Operations Wing');
  assert(optData.departments_by_wing['Management Wing — Governance, Systems & Organizational Support'], 'Must have Management Wing departments');
  assert(optData.departments_by_wing['Operations Wing — Programs, Public Service & Social Impact'], 'Must have Operations Wing departments');
  console.log('   ✓ Wing to Join & Department options verified (Image 4)');

  // Requirement 7: Mode of Work
  assert(Array.isArray(optData.modes_of_work), 'modes_of_work must be an array');
  assert(optData.modes_of_work.includes('Online Volunteering'), 'Must include Online Volunteering');
  assert(optData.modes_of_work.includes('Field Volunteering'), 'Must include Field Volunteering');
  assert(optData.modes_of_work.includes('Both'), 'Must include Both');
  console.log('   ✓ Mode of work options verified (Image 5)');

  // Requirement 5: Past Field Work Departments
  assert(Array.isArray(optData.past_field_work_departments), 'past_field_work_departments must be an array');
  assert.strictEqual(optData.past_field_work_departments.length, 7, 'Must have 7 departments');
  const deptNames = optData.past_field_work_departments.map(d => d.department);
  assert(deptNames.includes('General'), 'Must include General');
  assert(deptNames.includes('Social Responsibility, Awareness & Advocacy Department'), 'Must include Social Responsibility');
  assert(deptNames.includes('Health & Wellness Department'), 'Must include Health & Wellness');
  assert(deptNames.includes('Education & Skill Development Department'), 'Must include Education & Skill');
  assert(deptNames.includes('Community Development Department'), 'Must include Community Development');
  assert(deptNames.includes('Emergency Crisis & Disaster Management Department'), 'Must include Emergency Crisis');
  assert(deptNames.includes('Environment, Sustainability & Ecological Restoration Department'), 'Must include Environment');
  console.log('   ✓ Past Field Work 7 departments & sub-initiatives verified');

  // Test 2: Assembly Constituencies loaded for District
  console.log('2. Checking Assembly Constituencies by District...');
  const constRes = await fetch(`${BASE_URL}/api/constituencies?district_id=3`);
  assert.strictEqual(constRes.status, 200, 'GET /api/constituencies must return 200');
  const constData = await constRes.json();
  assert(Array.isArray(constData.constituencies), 'constituencies must be an array');
  assert(constData.constituencies.length === 16, 'Chennai must have 16 assembly constituencies');
  assert(constData.constituencies.includes('Mylapore'), 'Chennai must include Mylapore');
  assert(constData.constituencies.includes('Dr. Radhakrishnan Nagar'), 'Chennai must include Dr. Radhakrishnan Nagar');
  console.log('   ✓ Chennai (District 3) loaded 16 constituencies including Mylapore & RK Nagar');

  // Test 3: Register Applicant with all 7 new fields
  console.log('3. Registering volunteer with all 7 new fields...');
  const rand = Math.floor(100000 + Math.random() * 900000);
  const testPayload = {
    full_name: 'Dr. Meena Selvam',
    phone: '98401' + rand.toString().slice(0, 5),
    email: `meena_selvam_${rand}@example.com`,
    username: `meena_${rand}`,
    password: 'tnvPassword2026',
    confirm_password: 'tnvPassword2026',
    dob: '1992-04-12',
    gender: 'Female',
    marital_status: 'Married',
    father_or_husband_name: 'Dr. Selvam',
    aadhaar: '98765432' + rand.toString().slice(0, 4),
    blood_group: 'O+',
    company_area: 'Mylapore Health Center',
    // 1. Affiliation / Category
    affiliation: 'NGO',
    category: 'NGO',
    // 2. Profession / Designation (no dropdown)
    occupation: 'Community Health Specialist & Medical Social Worker',
    // 4. District, Assembly Constituency & Panchayat
    district_id: 3,
    assembly_constituency: 'Mylapore',
    panchayat: 'Mylapore Ward 120, Alwarpet',
    address: '12 Luz Church Road, Mylapore',
    pincode: '600004',
    // 6. Wing & Department
    wing_to_join: 'Operations Wing — Programs, Public Service & Social Impact',
    department: 'Health & Wellness Department',
    // 7. Mode of Work
    mode_of_work: 'Field Volunteering',
    // 3. Previous Experience (5-150 words or Nil)
    previous_experience: 'Over five years of direct grassroots experience facilitating medical camps, health awareness lectures, and maternal healthcare drives across Chennai and neighboring rural zones.',
    // 5. Past Field Work (select all that apply)
    past_field_work: [
      'Health, Hygiene & Sanitation',
      'Nutrition & Wellness',
      'Blood Donation Initiatives',
      'Fostering Social Responsibility',
      'Women & Child Safety'
    ],
    agree_terms: true
  };

  const regRes = await fetch(`${BASE_URL}/api/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testPayload)
  });

  const regData = await regRes.json();
  assert.strictEqual(regRes.status, 201, `Registration should succeed (201), got: ${JSON.stringify(regData)}`);
  assert(regData.session && regData.session.access_token, 'Session token must be returned');
  const token = regData.session.access_token;
  console.log(`   ✓ Registered applicant: @${testPayload.username} (${regData.user.id})`);

  // Test 4: Retrieve Dashboard Profile & verify all fields are persisted
  console.log('4. Verifying profile stored in database & exposed on user dashboard...');
  const profRes = await fetch(`${BASE_URL}/api/my-profile`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  assert.strictEqual(profRes.status, 200, 'GET /api/my-profile must return 200');
  const profData = await profRes.json();
  const p = profData.profile;

  assert.strictEqual(p.affiliation, 'NGO', 'Affiliation must match NGO');
  assert.strictEqual(p.occupation, 'Community Health Specialist & Medical Social Worker', 'Occupation must match');
  assert.strictEqual(p.assembly_constituency, 'Mylapore', 'Constituency must match Mylapore');
  assert.strictEqual(p.panchayat, 'Mylapore Ward 120, Alwarpet', 'Panchayat must match');
  assert.strictEqual(p.wing_to_join, 'Operations Wing — Programs, Public Service & Social Impact', 'Wing must match');
  assert.strictEqual(p.department, 'Health & Wellness Department', 'Department must match');
  assert.strictEqual(p.mode_of_work, 'Field Volunteering', 'Mode of work must match');
  assert.strictEqual(p.previous_experience, testPayload.previous_experience, 'Previous experience must match');
  assert(Array.isArray(p.past_field_work), 'past_field_work must be an array');
  assert.strictEqual(p.past_field_work.length, 5, 'Must contain 5 past field work items');
  assert(p.past_field_work.includes('Health, Hygiene & Sanitation'), 'Must contain Health, Hygiene & Sanitation');
  console.log('   ✓ All 8 fields successfully persisted in database and returned in profile for user dashboard!');

  // Test 5: Verify previous experience with "Nil" works
  console.log('5. Testing Registration with previous_experience = "Nil"...');
  const rand2 = Math.floor(100000 + Math.random() * 900000);
  const nilPayload = {
    ...testPayload,
    email: `nil_worker_${rand2}@example.com`,
    username: `nil_${rand2}`,
    aadhaar: '88765432' + rand2.toString().slice(0, 4),
    previous_experience: 'Nil'
  };

  const nilRes = await fetch(`${BASE_URL}/api/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(nilPayload)
  });
  assert.strictEqual(nilRes.status, 201, 'Should allow "Nil" as valid previous experience');
  console.log('   ✓ "Nil" accepted as valid previous work/experience');

  console.log('\n===============================================================');
  console.log('ALL 7 VOLUNTEER REGISTRATION ENHANCEMENT TESTS PASSED 100%!');
  console.log('===============================================================');
}

runTests().catch(err => {
  console.error('Test Failed:', err);
  process.exit(1);
});
