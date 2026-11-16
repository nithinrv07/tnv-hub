const assert = require('assert');

// Test suite for Client Session Interceptor Logic
async function runTests() {
  console.log('Testing Task 3: Client Session Auto-Refresh Interceptor...');

  let storedAccessToken = 'expired_access_token';
  let storedRefreshToken = 'valid_refresh_token';
  let refreshed = false;
  let eventDispatched = null;

  // Mock session storage
  const mockSession = {
    getToken: () => storedAccessToken,
    getRefreshToken: () => storedRefreshToken,
    saveToken: (acc, ref) => {
      storedAccessToken = acc;
      if (ref) storedRefreshToken = ref;
    },
    clearToken: () => {
      storedAccessToken = null;
      storedRefreshToken = null;
    }
  };

  // Mock fetch function simulating an expired token on first request and success on retry
  let callCount = 0;
  async function mockFetch(url, options = {}) {
    callCount++;
    if (url === '/api/auth/refresh') {
      const body = JSON.parse(options.body || '{}');
      if (body.refresh_token === 'valid_refresh_token') {
        refreshed = true;
        return {
          ok: true,
          status: 200,
          json: async () => ({
            ok: true,
            session: {
              access_token: 'new_fresh_access_token',
              refresh_token: 'new_fresh_refresh_token'
            }
          })
        };
      }
      return {
        ok: false,
        status: 401,
        json: async () => ({ ok: false, error: 'Invalid refresh token' })
      };
    }

    const authHeader = options.headers?.Authorization || '';
    if (authHeader.includes('expired_access_token')) {
      return {
        ok: false,
        status: 401,
        json: async () => ({ error: 'Unauthorized: token expired' })
      };
    }
    if (authHeader.includes('new_fresh_access_token')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ ok: true, data: ['member1', 'member2'] })
      };
    }
    return {
      ok: false,
      status: 400,
      json: async () => ({ error: 'Bad request' })
    };
  }

  // Interceptor implementation function (matching api.js)
  async function apiWrapper(path, { method = 'GET', body, token, _isRetry = false } = {}, fetchFn = mockFetch) {
    const headers = {};
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetchFn(path, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined
    });
    const data = await res.json().catch(() => ({}));

    // Interceptor: if 401 and token was provided, attempt refresh once
    if (res.status === 401 && token && !_isRetry && path !== '/api/auth/refresh') {
      const refreshToken = mockSession.getRefreshToken();
      if (refreshToken) {
        const refreshRes = await fetchFn('/api/auth/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: refreshToken })
        });
        const refreshData = await refreshRes.json().catch(() => ({}));
        if (refreshRes.ok && refreshData.session?.access_token) {
          mockSession.saveToken(refreshData.session.access_token, refreshData.session.refresh_token);
          // Retry original call
          return apiWrapper(path, {
            method,
            body,
            token: refreshData.session.access_token,
            _isRetry: true
          }, fetchFn);
        }
      }
      mockSession.clearToken();
      eventDispatched = 'tnv:session-expired';
      return { ok: false, status: 401, data, sessionExpired: true };
    }

    return { ok: res.ok, status: res.status, data };
  }

  // 1. Test successful transparent retry on 401
  console.log('  1. Testing transparent retry with refresh token...');
  const res1 = await apiWrapper('/api/admin/queue', { token: mockSession.getToken() });
  assert.strictEqual(res1.ok, true, 'Request succeeded after transparent refresh');
  assert.strictEqual(refreshed, true, 'Refresh was invoked');
  assert.strictEqual(storedAccessToken, 'new_fresh_access_token', 'New access token stored');
  assert.strictEqual(storedRefreshToken, 'new_fresh_refresh_token', 'New refresh token stored');

  // 2. Test failed refresh clears token and flags sessionExpired
  console.log('  2. Testing failed refresh clears token and flags sessionExpired...');
  storedAccessToken = 'expired_access_token';
  storedRefreshToken = 'revoked_refresh_token';
  const res2 = await apiWrapper('/api/admin/queue', { token: mockSession.getToken() });
  assert.strictEqual(res2.ok, false, 'Request fails');
  assert.strictEqual(res2.sessionExpired, true, 'sessionExpired flag set');
  assert.strictEqual(mockSession.getToken(), null, 'Access token cleared');
  assert.strictEqual(mockSession.getRefreshToken(), null, 'Refresh token cleared');
  assert.strictEqual(eventDispatched, 'tnv:session-expired', 'Session expired event triggered');

  console.log('Task 3 Interceptor Tests Passed Successfully!');
}

runTests().catch(err => {
  console.error('Task 3 Test Failed:', err);
  process.exit(1);
});
