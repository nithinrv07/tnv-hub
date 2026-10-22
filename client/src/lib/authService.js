import { api } from './api.js';
import { saveToken, getToken, clearToken } from './session.js';

export const USER_KEY = 'tnv_user';

export function saveUser(user) {
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch (_e) {}
}

export function getCurrentUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_e) {
    return null;
  }
}

// The server's admin roles are master_admin and dept_admin ('admin' kept for older sessions)
export function isAdminUser(user) {
  const role = user?.role || user?.profile?.role;
  return role === 'admin' || role === 'master_admin' || role === 'dept_admin';
}

export function clearUser() {
  try {
    localStorage.removeItem(USER_KEY);
  } catch (_e) {}
}

export async function login(username, password) {
  const res = await api('/api/login', {
    method: 'POST',
    body: { username, password }
  });

  if (res.ok && res.data) {
    const token = res.data.session?.access_token || res.data.token;
    if (token) saveToken(token);
    const role = res.data.profile?.role || res.data.role || 'volunteer';
    const user = {
      username: res.data.profile?.username || username,
      full_name: res.data.profile?.full_name || username,
      role: role,
      profile: res.data.profile
    };
    saveUser(user);
    return { ok: true, data: { ...res.data, role } };
  }

  // No response, no API at this address, or a server failure: not a wrong password
  if (res.status === 0 || res.status === 404 || res.status === 405 || res.status >= 500) {
    return { ok: false, error: "We couldn't reach the TNV server. Please try again in a few minutes." };
  }
  return { ok: false, error: res.data?.error || 'Invalid username or password' };
}

export function logout() {
  clearToken();
  clearUser();
}
