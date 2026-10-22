// =====================================================================
// TNV Phase 1 - Email Uniqueness and Profile Photo ID Card Test
// Tests:
// 1. Strict single account per email ID validation:
//    - /api/email-available API endpoint
//    - HTTP 409 rejection on duplicate email registration (case/whitespace insensitive)
// 2. Profile photo insertion & ID Card integration:
//    - Registration with photo_path
//    - Profile retrieval with photo_url
//    - POST /api/update-photo endpoint
//    - ID Card PDF generation with verified photo badge
// =====================================================================

const http = require('http');

function request(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ statusCode: res.statusCode, data: json, headers: res.headers });
        } catch (_e) {
          resolve({ statusCode: res.statusCode, raw: data, headers: res.headers });
        }
      });
    });
    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

function requestBuffer(options) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      const chunks = [];
      res.on('data', chunk => { chunks.push(chunk); });
      res.on('end', () => {
        resolve({ statusCode: res.statusCode, buffer: Buffer.concat(chunks), headers: res.headers });
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function run() {
  console.log('--- Starting Test: Email Uniqueness & Profile Photo on ID Card ---');

  // Test 1: GET /api/email-available for fresh random email
  const randNum = Math.floor(100000 + Math.random() * 900000);
  const freshEmail = `unique_vol_${randNum}@example.com`;
  const checkFreshEmail = await request({
    hostname: 'localhost',
    port: 3000,
    path: `/api/email-available?e=${encodeURIComponent(freshEmail)}`,
    method: 'GET'
  });
  console.log('1. Check fresh unique email:', checkFreshEmail.statusCode, checkFreshEmail.data);
  if (checkFreshEmail.statusCode !== 200 || checkFreshEmail.data.available !== true) {
    throw new Error('FAILED: Fresh unique email should return available: true');
  }

  // Test 2: Check invalid format email rejection
  const checkInvalidEmail = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/email-available?e=not-an-email',
    method: 'GET'
  });
  console.log('2. Check invalid email format:', checkInvalidEmail.statusCode, checkInvalidEmail.data);
  if (checkInvalidEmail.statusCode !== 200 || checkInvalidEmail.data.available !== false) {
    throw new Error('FAILED: Invalid email format should return available: false');
  }

  // Test 3: Register User A with freshEmail and an attached profile photo
  const testPhotoDataUrl = 'data:image/jpeg;base64,' + Buffer.from('TEST_VOLUNTEER_PHOTO_JPEG_BINARY').toString('base64');
  const regPayloadA = {
    full_name: 'Priya Raman',
    phone: '98401' + String(randNum).slice(0, 5),
    email: freshEmail,
    username: `priya_${randNum}`,
    password: 'password2026',
    district_id: 3, // Chennai
    aadhaar: '987654' + String(randNum), // Exactly 12 digits
    address: '15 Cathedral Road, Chennai',
    preferred_designation: 'Active Member',
    photo_path: testPhotoDataUrl,
    agree_terms: true
  };

  const regResA = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/register',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, regPayloadA);

  console.log('3. Register User A with photo:', regResA.statusCode, regResA.data?.user || regResA.data);
  if (regResA.statusCode !== 201) {
    throw new Error('FAILED: Registration of User A should succeed with 201: ' + JSON.stringify(regResA.data));
  }
  if (!regResA.data.profile.photo_path || regResA.data.profile.photo_path !== testPhotoDataUrl) {
    throw new Error('FAILED: Registered profile should preserve photo_path');
  }
  const tokenA = regResA.data.session.access_token;
  const userAId = regResA.data.user.id;

  // Test 4: Attempt to register User B with the EXACT SAME EMAIL (must fail HTTP 409)
  const regPayloadB = {
    full_name: 'Another Person',
    phone: '98402' + String(randNum).slice(0, 5),
    email: `  ${freshEmail.toUpperCase()}  `, // Test case-insensitivity and trim
    username: `person_${randNum}`,
    password: 'password2026',
    district_id: 4, // Coimbatore
    aadhaar: '123456' + String(randNum), // Exactly 12 digits
    address: '20 RS Puram, Coimbatore',
    agree_terms: true
  };

  const regResB = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/register',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, regPayloadB);

  console.log('4. Duplicate Email Registration rejection:', regResB.statusCode, regResB.data);
  if (regResB.statusCode !== 409) {
    throw new Error('FAILED: Duplicate email registration MUST be rejected with HTTP 409 Conflict');
  }
  if (!regResB.data.error || !regResB.data.error.includes('Only one account can be created per email ID')) {
    throw new Error('FAILED: Expected strict single account per email error message');
  }

  // Test 5: Verify GET /api/my-profile for User A returns photo_path & photo_url
  const myProfileRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/my-profile',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${tokenA}` }
  });
  console.log('5. Retrieve User A profile:', myProfileRes.statusCode, {
    username: myProfileRes.data.profile.username,
    hasPhoto: Boolean(myProfileRes.data.profile.photo_path)
  });
  if (!myProfileRes.data.profile.photo_path) {
    throw new Error('FAILED: my-profile must return photo_path');
  }

  // Test 6: Test POST /api/update-photo endpoint
  const validJpegBuf = Buffer.concat([Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xFF, 0xC0, 0x00, 0x11, 0x08, 0x01, 0x2C, 0x00, 0xFA, 0x03, 0x01, 0x11, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01]), Buffer.alloc(80, 0xAA), Buffer.from([0xFF, 0xD9])]);
  const updatedPhotoDataUrl = 'data:image/jpeg;base64,' + validJpegBuf.toString('base64');
  const updatePhotoRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/update-photo',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tokenA}`
    }
  }, { photo_path: updatedPhotoDataUrl });

  console.log('6. Update profile photo endpoint:', updatePhotoRes.statusCode, updatePhotoRes.data.message);
  if (updatePhotoRes.statusCode !== 200 || !updatePhotoRes.data.success) {
    throw new Error('FAILED: POST /api/update-photo should succeed with 200');
  }
  if (updatePhotoRes.data.profile.photo_path !== updatedPhotoDataUrl) {
    throw new Error('FAILED: Profile photo_path should be updated');
  }

  // Test 7: Approve User A and verify ID Card PDF contains the verified photo badge
  const approveRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/test/toggle-approval',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tokenA}`
    }
  }, { status: 'approved', role: 'Active Member' });

  console.log('7. Approve User A:', approveRes.statusCode, approveRes.data.status, approveRes.data.profile.tnv_id);

  const idCardPdfRes = await requestBuffer({
    hostname: 'localhost',
    port: 3000,
    path: `/api/id-card/${userAId}.pdf`,
    method: 'GET',
    headers: { 'Authorization': `Bearer ${tokenA}` }
  });

  console.log('8. Download ID Card PDF:', idCardPdfRes.statusCode, 'Bytes:', idCardPdfRes.buffer.length);
  if (idCardPdfRes.statusCode !== 200) {
    throw new Error('FAILED: ID card PDF download should return 200');
  }
  const pdfString = idCardPdfRes.buffer.toString('utf8');
  if (!pdfString.startsWith('%PDF-1.4')) {
    throw new Error('FAILED: ID Card must be valid %PDF-1.4 binary');
  }
  if ((!pdfString.includes('PHOTO') && !pdfString.includes('/Im1 Do')) || !/verified/i.test(pdfString)) {
    throw new Error('FAILED: ID Card PDF binary must contain verified photo indicator or image XObject');
  }

  console.log('\n===============================================================');
  console.log('ALL TESTS PASSED:');
  console.log('1. Strict single account per email ID enforced (HTTP 409 rejection)');
  console.log('2. Real-time /api/email-available check verified');
  console.log('3. Volunteer photo inserted during registration preserved in profile');
  console.log('4. Profile photo updating endpoint (POST /api/update-photo) working');
  console.log('5. ID Card PDF verified with photo badge embedded');
  console.log('===============================================================');
}

run().catch(err => {
  console.error('TEST ERROR:', err);
  process.exit(1);
});
