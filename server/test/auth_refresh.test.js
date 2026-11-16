const http = require('http');
const assert = require('assert');
const serverHandler = require('../server.js');

function makeRequest(path, method, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const srv = http.createServer((req, res) => serverHandler(req, res));
    srv.listen(0, '127.0.0.1', () => {
      const port = srv.address().port;
      const payload = body ? JSON.stringify(body) : '';
      const reqHeaders = {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        ...headers
      };

      const req = http.request({
        hostname: '127.0.0.1',
        port,
        path,
        method,
        headers: reqHeaders
      }, (res) => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          srv.close();
          try {
            const parsed = JSON.parse(data);
            resolve({ status: res.statusCode, data: parsed });
          } catch (_e) {
            resolve({ status: res.statusCode, raw: data });
          }
        });
      });

      req.on('error', err => {
        srv.close();
        reject(err);
      });

      if (payload) req.write(payload);
      req.end();
    });
  });
}

async function runTests() {
  console.log('Testing Task 2: Backend /api/auth/refresh endpoint...');

  // 1. Missing body or missing refresh_token -> 400
  console.log('  1. Testing missing refresh_token...');
  const res1 = await makeRequest('/api/auth/refresh', 'POST', {});
  assert.strictEqual(res1.status, 400, 'Empty refresh payload returns 400');
  assert(res1.data.error, 'Contains error explanation');

  // 2. Invalid refresh token -> 401
  console.log('  2. Testing invalid refresh_token...');
  const res2 = await makeRequest('/api/auth/refresh', 'POST', { refresh_token: 'invalid_token_12345' });
  assert.strictEqual(res2.status, 401, 'Invalid refresh token returns 401');
  assert.strictEqual(res2.data.ok, false, 'ok is false');

  // 3. Login -> obtain refresh_token -> call refresh -> verify new session
  console.log('  3. Testing login -> refresh token rotation...');
  const loginRes = await makeRequest('/api/login', 'POST', {
    username: 'masteradmin',
    password: 'AdminPassword2026!'
  });
  assert.strictEqual(loginRes.status, 200, 'Login succeeded');
  assert(loginRes.data.session?.refresh_token, 'Session contains refresh_token');
  const initialRefresh = loginRes.data.session.refresh_token;

  const refreshRes = await makeRequest('/api/auth/refresh', 'POST', {
    refresh_token: initialRefresh
  });
  assert.strictEqual(refreshRes.status, 200, 'Refresh succeeded');
  assert.strictEqual(refreshRes.data.ok, true, 'ok is true');
  assert(refreshRes.data.session?.access_token, 'Contains new access_token');
  assert(refreshRes.data.session?.refresh_token, 'Contains new refresh_token');

  console.log('Task 2 Tests Passed Successfully!');
}

runTests().catch(err => {
  console.error('Task 2 Test Failed:', err);
  process.exit(1);
});
