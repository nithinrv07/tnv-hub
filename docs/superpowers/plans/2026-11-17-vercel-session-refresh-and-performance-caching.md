# Vercel Session Auto-Refresh and Server Performance Caching Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate Vercel dashboard latency via server-side in-memory caching and prevent portal statistics from dropping to zero after inactivity by implementing background session auto-refresh and graceful session expiration handling.

**Architecture:** A lightweight in-memory cache layer in `server.js` caches verified auth profiles (60s TTL) and Supabase snapshots (15s TTL) to cut serverless cross-region roundtrip latency. The frontend session manager (`session.js` & `api.js`) captures the Supabase `refresh_token` and automatically retries failed 401 requests via a new `/api/auth/refresh` endpoint. The admin dashboard is guarded so that auth failures display a clear re-login banner instead of zeroing out stats.

**Tech Stack:** Node.js (HTTP / Crypto), React (Vite / Tailwind CSS), Supabase Auth & PostgREST.

**Spec:** `docs/superpowers/specs/2026-11-17-vercel-session-refresh-and-performance-caching-design.md`

## Global Constraints

- Never commit secrets or hardcoded passwords.
- Maintain backward compatibility with in-memory offline fallback for local development.
- Zero extra external dependencies (use native `crypto`, `Map`, and `fetch`).
- Never set member collections to empty `[]` when receiving a 401 or 403 response.

## Review Focus

1. **Token Refresh Loop Prevention:** Ensure `api.js` cannot enter an infinite retry loop if `/api/auth/refresh` itself returns 401.
2. **Multi-Tab Token Sync:** Ensure updating tokens in `session.js` updates `localStorage` consistently across browser tabs.
3. **Cache Invalidation on Mutation:** Ensure calling `saveSupabaseSnapshot` clears the cached snapshot immediately so updates show right away.
4. **Invalid Refresh Token Handling:** Ensure invalid or expired refresh tokens return a clean 401 with `{ error: 'Invalid or expired session' }`.
5. **No Memory Leaks:** Ensure bounded TTL pruning on `authProfileCache` and `snapshotCache`.

---

### Task 1: Server In-Memory Performance Caching (Auth & Snapshot)

**Files:**
- Modify: `server/server.js:1208-1240` (Auth caching), `server/supabase_bridge.js:1015-1080` (Snapshot caching)
- Test: `server/test/cache_performance.test.js`

**Interfaces:**
- Consumes: `supabaseBridge.getProfileFromToken`, `supabaseBridge.getSupabaseSnapshot`, `supabaseBridge.saveSupabaseSnapshot`
- Produces: Fast cached responses (<2ms) for repeated token validations and snapshot lookups.

- [ ] **Step 1: Write the failing test**

Create `server/test/cache_performance.test.js` asserting that:
1. `getAuthUser` caches the profile for the same token and avoids repeating `getProfileFromToken`.
2. `getSupabaseSnapshot` returns cached data on second call without fetching remote, and invalidates immediately when `saveSupabaseSnapshot` is called.

- [ ] **Step 2: Run test to verify it fails**

Run: `node server/test/cache_performance.test.js`
Expected: FAIL (cache not yet implemented)

- [ ] **Step 3: Implement Auth Caching in `server/server.js`**

Implement `authProfileCache = new Map()`:
Key: SHA-256 of `token`.
Entry: `{ profile, expiresAt: Date.now() + 60000 }`.
Before calling `supabaseBridge.getProfileFromToken(token)`, check cache. If valid and not expired, return cached profile. On fresh fetch, store in cache with 60s TTL.

- [ ] **Step 4: Implement Snapshot Caching in `server/supabase_bridge.js`**

Implement `snapshotMemoryCache = new Map()`:
Key: `actionKind`.
Entry: `{ data, expiresAt: Date.now() + 15000 }`.
In `getSupabaseSnapshot`, check memory cache first.
In `saveSupabaseSnapshot`, immediately update or invalidate `snapshotMemoryCache.set(actionKind, { data: detailData, expiresAt: Date.now() + 15000 })`.

- [ ] **Step 5: Run test to verify it passes**

Run: `node server/test/cache_performance.test.js`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add server/server.js server/supabase_bridge.js server/test/cache_performance.test.js
git commit -m "perf: add in-memory caching for auth tokens and supabase snapshots"
```

---

### Task 2: Backend Token Refresh Endpoint (`POST /api/auth/refresh`)

**Files:**
- Modify: `server/supabase_bridge.js`
- Modify: `server/server.js`
- Test: `server/test/auth_refresh.test.js`

**Interfaces:**
- Consumes: Supabase GoTrue Auth endpoint `${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`
- Produces: `POST /api/auth/refresh` -> `{ session: { access_token, refresh_token, expires_in }, profile }`

- [ ] **Step 1: Write the failing test**

Create `server/test/auth_refresh.test.js` verifying:
1. `POST /api/auth/refresh` with empty body returns 400.
2. `POST /api/auth/refresh` with invalid refresh token returns 401.

- [ ] **Step 2: Run test to verify it fails**

Run: `node server/test/auth_refresh.test.js`
Expected: FAIL (endpoint returns 404 or missing route)

- [ ] **Step 3: Implement `refreshSession` in `server/supabase_bridge.js`**

Add `async function refreshSession(refreshToken)`:
```javascript
async function refreshSession(refreshToken) {
  if (!isConfigured() || !refreshToken) return null;
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: getAnonHeaders(),
    body: JSON.stringify({ refresh_token: refreshToken })
  });
  if (!res.ok) return null;
  return await res.json();
}
```
Export `refreshSession`.

- [ ] **Step 4: Add `/api/auth/refresh` route in `server/server.js`**

Handle `POST /api/auth/refresh`:
1. Parse JSON body `{ refresh_token }`. If missing, return 400.
2. Call `supabaseBridge.refreshSession(refresh_token)`.
3. If successful, fetch user profile and return `{ ok: true, session: { access_token, refresh_token, expires_in }, profile }`.
4. If failed, return 401 `{ ok: false, error: 'Invalid or expired refresh token' }`.

- [ ] **Step 5: Run test to verify it passes**

Run: `node server/test/auth_refresh.test.js`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add server/supabase_bridge.js server/server.js server/test/auth_refresh.test.js
git commit -m "feat(auth): add /api/auth/refresh endpoint for supabase session rotation"
```

---

### Task 3: Frontend Token Management & Seamless Auto-Refresh Interceptor

**Files:**
- Modify: `client/src/lib/session.js`
- Modify: `client/src/lib/api.js`
- Modify: `client/src/pages/Login.jsx`
- Test: `server/test/client_session_interceptor.test.js`

**Interfaces:**
- Consumes: `POST /api/auth/refresh`
- Produces: `saveToken(accessToken, refreshToken)`, `getRefreshToken()`, automatic transparent 401 retry in `api()`.

- [ ] **Step 1: Write the failing test**

Create a test in `server/test/client_session_interceptor.test.js` modeling the interceptor logic:
- Mock fetch returning 401 on initial call, calling refresh, and returning 200 on retry.
- Ensure when refresh fails, it doesn't loop infinitely and returns `{ ok: false, status: 401, sessionExpired: true }`.

- [ ] **Step 2: Run test to verify it fails**

Run: `node server/test/client_session_interceptor.test.js`
Expected: FAIL

- [ ] **Step 3: Update `client/src/lib/session.js`**

Support `REFRESH_TOKEN_KEY = 'tnv_refresh_token'`:
- `saveToken(token, refreshToken)`
- `getRefreshToken()`
- `clearToken()` clears both.

- [ ] **Step 4: Update `client/src/pages/Login.jsx`**

On successful login response:
`saveToken(data.session?.access_token, data.session?.refresh_token)`

- [ ] **Step 5: Implement transparent retry in `client/src/lib/api.js`**

In `api(path, options)`:
If response status is `401` and `options.token` was provided and `!options._isRetry`:
Check `getRefreshToken()`.
If present:
Call `/api/auth/refresh` with `{ refresh_token }`.
If successful:
`saveToken(newAccess, newRefresh)`.
Retry original request with `_isRetry: true` and new token.
If refresh fails:
`clearToken()`.
Dispatch custom window event `'tnv:session-expired'`.

- [ ] **Step 6: Run test to verify it passes**

Run: `node server/test/client_session_interceptor.test.js`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add client/src/lib/session.js client/src/lib/api.js client/src/pages/Login.jsx server/test/client_session_interceptor.test.js
git commit -m "feat(client): implement automatic token refresh interceptor on 401"
```

---

### Task 4: Admin Dashboard Session Protection & Verification

**Files:**
- Modify: `client/src/pages/Admin.jsx`

**Interfaces:**
- Consumes: `'tnv:session-expired'` event and `api()` responses.
- Produces: Explicit session expiry warning banner; prevents zeroing out stats to `0`.

- [ ] **Step 1: Guard data resetting in `client/src/pages/Admin.jsx`**

In `loadPortalData()`:
If `qRes.status === 401 || qRes.status === 403`:
Do NOT call `setApplicants([])`.
Set `sessionExpired: true`.
Render a top alert: *"Your session expired due to inactivity. Please sign in again to view and manage members."* with a `"Sign In Again"` button linking to `/login`.

- [ ] **Step 2: Add session-expired event listener**

In `Admin.jsx` `useEffect`:
Listen for `window.addEventListener('tnv:session-expired')` -> set `sessionExpired: true`.

- [ ] **Step 3: End-to-End Verification of All Existing Tests**

Run existing test suite to ensure no regressions:
Run: `npm test --prefix server`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/Admin.jsx
git commit -m "fix(admin): guard against clearing data on session expiration and add alert"
```
