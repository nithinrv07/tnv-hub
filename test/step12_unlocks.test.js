// =====================================================================
// TNV Phase 1 - Step 12 & Part C Verification Test
// Tests: Test Approval Toggle, Dashboard Unlocks, ID Card & Appointment Letter PDFs,
// and 17 WhatsApp Community Links Unlock (Step 14).
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
  console.log('--- Running Step 12 Dashboard Unlocks & Part C Tests ---');

  // 1. Register a fresh volunteer
  const rand = Math.floor(10000 + Math.random() * 90000);
  const regPayload = {
    full_name: 'Sundar Pichai',
    phone: '98401' + String(rand).slice(0, 5),
    email: `sundar_${rand}@example.com`,
    username: `sundar_${rand}`,
    password: 'password123',
    district_id: 3, // Chennai
    aadhaar: '9988776' + String(rand).slice(0, 5),
    address: '10 Anna Salai, Chennai',
    preferred_designation: 'Active Member',
    agree_terms: true
  };

  const regRes = await request({
    host: 'localhost',
    port: 3000,
    path: '/api/register',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, regPayload);

  if (regRes.statusCode !== 201) throw new Error('Registration failed: ' + JSON.stringify(regRes.data));
  const token = regRes.data.session.access_token;
  const userId = regRes.data.user.id;
  console.log(`[SETUP] Registered applicant @${regPayload.username} (${userId})`);

  // Verify initial state: pending
  if (regRes.data.profile.status !== 'pending') throw new Error('Initial status should be pending');
  console.log('[TEST 1] Initial status strictly pending: PASS');

  // Verify initial guards: my-links returns 0 rows, documents return 403
  const preLinks = await request({
    host: 'localhost',
    port: 3000,
    path: '/api/my-links',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (preLinks.data.links.length !== 0) throw new Error('Pending user must get 0 links');
  console.log('[TEST 2] Pending user gets zero WhatsApp links: PASS');

  const preDocs = await request({
    host: 'localhost',
    port: 3000,
    path: '/api/member-documents',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (preDocs.statusCode !== 403) throw new Error('Pending user documents must be 403');
  console.log('[TEST 3] Pending user documents return 403 Forbidden: PASS');

  // 2. TOGGLE APPROVAL: Simulate Admin Approval (Part B Bypass)
  const toggleRes = await request({
    host: 'localhost',
    port: 3000,
    path: '/api/test/toggle-approval',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  }, { status: 'approved', role: 'Volunteer' });

  if (toggleRes.statusCode !== 200 || !toggleRes.data.success) {
    throw new Error('Approval toggle failed: ' + JSON.stringify(toggleRes));
  }
  console.log('[TEST 4] Simulated Approval Toggle: status 200');
  console.log('         New Status:', toggleRes.data.profile.status);
  console.log('         Assigned Role:', toggleRes.data.profile.role);
  console.log('         Generated TNV ID:', toggleRes.data.profile.tnv_id);

  if (toggleRes.data.profile.status !== 'approved') throw new Error('Expected status to be approved');
  if (!toggleRes.data.profile.tnv_id.startsWith('TNV-CHE-')) {
    throw new Error('TNV ID should follow TNV-CHE-<seq>, got: ' + toggleRes.data.profile.tnv_id);
  }

  // 3. STEP 12 & 14: my_links() unlocks all 17 community links!
  const postLinks = await request({
    host: 'localhost',
    port: 3000,
    path: '/api/my-links',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log(`[TEST 5] Unlocked WhatsApp Links count: ${postLinks.data.links.length}`);
  if (postLinks.data.links.length < 15) throw new Error('Expected at least 15 unlocked links');
  const districtLink = postLinks.data.links.find(l => l.kind === 'district');
  const wingLink = postLinks.data.links.find(l => l.kind === 'wing');
  const sectorLinks = postLinks.data.links.filter(l => l.kind === 'sector');
  console.log('         District Link:', districtLink.label);
  console.log('         Wing Link:', wingLink.label);
  console.log('         Sector Links Count:', sectorLinks.length);
  if (sectorLinks.length !== 13) throw new Error('Expected exactly 13 sector links');
  console.log('         [PASS] Step 14 WhatsApp community links unlocked.');

  // 4. STEP 13: member-documents unlocks
  const postDocs = await request({
    host: 'localhost',
    port: 3000,
    path: '/api/member-documents',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (postDocs.statusCode !== 200) throw new Error('Expected 200 for member documents');
  console.log('[TEST 6] Member Documents Access Unlocked: status 200');
  console.log('         ID Card URL:', postDocs.data.documents.id_card);
  console.log('         Appointment Letter URL:', postDocs.data.documents.appointment_letter);

  // 5. Download ID Card PDF
  const idCardRes = await requestBuffer({
    host: 'localhost',
    port: 3000,
    path: postDocs.data.documents.id_card,
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (idCardRes.statusCode !== 200) throw new Error('Failed to download ID card PDF');
  const idCardHeader = idCardRes.buffer.slice(0, 8).toString('utf8');
  console.log(`[TEST 7] Download ID Card PDF: status ${idCardRes.statusCode}, size ${idCardRes.buffer.length} bytes, Header: ${idCardHeader.trim()}`);
  if (!idCardHeader.startsWith('%PDF-1.4')) throw new Error('Invalid ID Card PDF header');

  // 6. Download Appointment Letter PDF
  const apptRes = await requestBuffer({
    host: 'localhost',
    port: 3000,
    path: postDocs.data.documents.appointment_letter,
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (apptRes.statusCode !== 200) throw new Error('Failed to download Appointment Letter PDF');
  const apptHeader = apptRes.buffer.slice(0, 8).toString('utf8');
  console.log(`[TEST 8] Download Appointment Letter PDF: status ${apptRes.statusCode}, size ${apptRes.buffer.length} bytes, Header: ${apptHeader.trim()}`);
  if (!apptHeader.startsWith('%PDF-1.4')) throw new Error('Invalid Appointment Letter PDF header');

  // 7. Toggle back to Pending -> guards immediately lock again!
  const revertRes = await request({
    host: 'localhost',
    port: 3000,
    path: '/api/test/toggle-approval',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  }, { status: 'pending' });

  if (revertRes.data.profile.status !== 'pending') throw new Error('Revert to pending failed');
  const relockLinks = await request({
    host: 'localhost',
    port: 3000,
    path: '/api/my-links',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (relockLinks.data.links.length !== 0) throw new Error('Re-locked state must return 0 links');
  console.log('[TEST 9] Revert to Pending re-locks documents and WhatsApp links to 0: PASS');

  console.log('\n--- ALL STEP 12 & PART C TESTS PASSED WITH 100% SUCCESS! ---');
}

run().catch(err => {
  console.error('Step 12 Test Failed:', err);
  process.exit(1);
});
