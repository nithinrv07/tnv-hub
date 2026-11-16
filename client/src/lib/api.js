import { getRefreshToken, saveToken, clearToken } from './session.js';

let refreshPromise = null;

async function performRefresh() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  try {
    const res = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken })
    });
    if (!res.ok) return null;
    const data = await res.json().catch(() => ({}));
    if (data.ok && data.session?.access_token) {
      saveToken(data.session.access_token, data.session.refresh_token);
      return data.session.access_token;
    }
  } catch (_e) {}
  return null;
}

// Small fetch wrapper. Never throws: returns { ok, status, data } and turns
// network failures and timeouts into status 0 so screens can show a retry.
export async function api(path, { method = 'GET', body, token, timeoutMs = 15000, signal, _isRetry = false } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  if (signal) signal.addEventListener('abort', () => controller.abort());

  try {
    const headers = {};
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(path, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal
    });
    const data = await res.json().catch(() => ({}));

    // Intercept 401 Unauthorized for authenticated endpoints
    if (res.status === 401 && token && !_isRetry && path !== '/api/auth/refresh') {
      if (!refreshPromise) {
        refreshPromise = performRefresh().finally(() => {
          refreshPromise = null;
        });
      }
      const newToken = await refreshPromise;
      if (newToken) {
        return api(path, { method, body, token: newToken, timeoutMs, signal, _isRetry: true });
      } else {
        clearToken();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('tnv:session-expired'));
        }
        return { ok: false, status: 401, data, sessionExpired: true };
      }
    }

    return { ok: res.ok, status: res.status, data };
  } catch (_err) {
    return { ok: false, status: 0, data: {} };
  } finally {
    clearTimeout(timer);
  }
}
