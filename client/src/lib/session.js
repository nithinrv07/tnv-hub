// Session token storage. Same key as the legacy public/ frontend.
// Replace with the Supabase client session when auth moves to supabase-js.
const TOKEN_KEY = 'tnv_token';
const REFRESH_TOKEN_KEY = 'tnv_refresh_token';

export function saveToken(token, refreshToken) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  } catch (_e) {}
}

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch (_e) {
    return null;
  }
}

export function getRefreshToken() {
  try {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  } catch (_e) {
    return null;
  }
}

export function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  } catch (_e) {}
}
