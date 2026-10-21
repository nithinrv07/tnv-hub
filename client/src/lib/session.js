// Session token storage. Same key as the legacy public/ frontend.
// Replace with the Supabase client session when auth moves to supabase-js.
const TOKEN_KEY = 'tnv_token';

export function saveToken(token) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch (_e) {}
}

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch (_e) {
    return null;
  }
}

export function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch (_e) {}
}
