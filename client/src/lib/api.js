// Small fetch wrapper. Never throws: returns { ok, status, data } and turns
// network failures and timeouts into status 0 so screens can show a retry.
export async function api(path, { method = 'GET', body, token, timeoutMs = 15000, signal } = {}) {
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
    return { ok: res.ok, status: res.status, data };
  } catch (_err) {
    return { ok: false, status: 0, data: {} };
  } finally {
    clearTimeout(timer);
  }
}
