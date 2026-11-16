# Design Document: Vercel Session Auto-Refresh and Server Performance Caching

- **Date:** 2026-11-17
- **Status:** Proposed
- **Author:** Antigravity & User

---

## 1. Intent & The Why

When hosted on Vercel Serverless, users experience noticeable delays when loading the TNV Hub portal (especially the Admin dashboard). Furthermore, leaving the portal open for more than an hour causes all counters, applicant records, and tables to drop to zero (`0`).

This happens because:
1. **1-Hour Token Expiration:** Supabase Auth issues JWT access tokens that expire after 3,600 seconds (1 hour). When a user leaves the portal open or returns after a few hours, API calls return `401/403`. The frontend catches these failures by clearing its applicant state (`setApplicants([])`), rendering a blank dashboard showing zeros instead of maintaining the session or alerting the user.
2. **Sequential Serverless-to-Supabase Roundtrips:** On every single incoming API request, `getAuthUser` performs 2 to 3 sequential remote HTTP requests back to Supabase (token validation, profile query, block check). Concurrent frontend requests on page load trigger dozens of cross-region network requests that, combined with Vercel serverless cold starts, cause long loading times.

---

## 2. Goals, Non-Goals, and Anti-Goals

### Goals
- **Automatic Token Refresh:** Seamlessly refresh expiring Supabase access tokens in the background using the stored refresh token so active or returning users stay logged in without data vanishing.
- **Graceful Session Expiry Handling:** If the refresh token is truly revoked or expired, display an explicit "Session expired" message with a re-login action instead of silently resetting data state to zero.
- **In-Memory Server-Side Auth Caching:** Cache verified user tokens and permissions for 60 seconds on the server, eliminating redundant Supabase auth roundtrips across concurrent requests in the same serverless instance.
- **Snapshot Caching:** Add a short TTL (15–30 seconds) in-memory cache for `getSupabaseSnapshot` to avoid slamming the `audit_log` table repeatedly during page loads.

### Non-Goals
- Migrating the entire 4,500-line server codebase to `@supabase/supabase-js` client library.
- Altering the PostgreSQL database schema or adding third-party Redis infrastructure.

### Anti-Goals
- Never silently set data collections to empty arrays (`[]`) when an authentication error occurs.
- Never write credentials or sensitive tokens into public response payloads or unencrypted logs.

---

## 3. Approaches Considered

1. **Approach 1: Auto-Refreshing Sessions + Server Auth & Snapshot Caching (Selected)**
   - *Description:* Store `refresh_token` in frontend session storage, add `/api/auth/refresh` on the server, intercept 401s in `api.js` to refresh and retry transparently, and introduce short TTL in-memory caches for auth lookups and Supabase snapshots on warm serverless instances.
   - *Trade-offs:* Requires targeted changes to both client session logic and server auth middleware, but permanently resolves both token expiry and load latency without high churn.
   - *Why chosen:* Directly addresses the two root causes identified by the user without introducing external infrastructure or breaking existing APIs.

2. **Approach 2: Session Interceptor & Graceful Re-login Only**
   - *Description:* Simply intercept 401/403 responses and redirect to `/login?expired=1` without refreshing tokens or caching server lookups.
   - *Trade-offs:* Low effort, but forces users to re-login every hour and leaves data loading delays unaddressed.

3. **Approach 3: Complete Migration to `@supabase/supabase-js` Client SDK**
   - *Description:* Refactor frontend and backend to use Supabase SDK session managers.
   - *Trade-offs:* Massive churn across ~5,000 lines of existing custom server routes with high risk of regressions.

---

## 4. Detailed Design & Architecture

### A. Frontend Session Auto-Refresh (`client/src/lib/session.js` & `client/src/lib/api.js`)
1. **Token Persistence:**
   - Extend `session.js` to save and retrieve both `access_token` and `refresh_token`:
     - `saveTokens({ accessToken, refreshToken })`
     - `getTokens()` -> `{ accessToken, refreshToken }`
     - `clearTokens()`
2. **Login Response Capture:**
   - Ensure `Login.jsx` (and any token-storing path) persists both `access_token` and `refresh_token` when logging in via `/api/login`.
3. **401 Interception & Transparent Retry:**
   - In `client/src/lib/api.js`:
     - If a request with a token fails with HTTP `401`, check if a `refreshToken` is available and not already in the middle of refreshing.
     - Call `/api/auth/refresh` with `{ refresh_token }`.
     - If successful, update stored tokens and retry the original request once with the new access token.
     - If refresh fails (or no refresh token exists), dispatch a session-expired event or show an alert, avoiding silent state clearing.
4. **Admin Dashboard Guard:**
   - In `client/src/pages/Admin.jsx`:
     - When `getQueue()` returns an error or status 401/403, do not execute `setApplicants([])`. Instead, show an explicit banner: *"Your session has expired. Please sign in again."*

### B. Backend Refresh Endpoint (`server/server.js` & `server/supabase_bridge.js`)
1. **Supabase Refresh Integration:**
   - In `supabase_bridge.js`, add `refreshSession(refreshToken)`:
     - `POST ${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token` with `{ refresh_token }` and Anon API headers.
     - Returns `{ access_token, refresh_token, expires_in, user }`.
2. **Server Route:**
   - Add `POST /api/auth/refresh`:
     - Reads `{ refresh_token }` from request body.
     - Returns updated tokens or 401 if invalid.

### C. Server-Side Performance Caching (`server/server.js` & `server/supabase_bridge.js`)
1. **User Token Cache (`getAuthUser`):**
   - Maintain an in-memory cache `authProfileCache = new Map()`:
     - Key: SHA-256 of `token`.
     - Value: `{ profile, expiresAt }` (TTL: 60 seconds).
   - In `getAuthUser(req)`, check cache first. If hit and unexpired, return cached profile immediately.
   - If miss, query Supabase, cache the result for 60 seconds, and return.
2. **Snapshot In-Memory Cache (`getSupabaseSnapshot`):**
   - Maintain `snapshotCache = new Map()`:
     - Key: `actionKind` (e.g. `payment_proofs`, `sync_tasks`, `sync_events`).
     - Value: `{ data, expiresAt }` (TTL: 15 seconds).
   - When `saveSupabaseSnapshot` is called, invalidate or update the local cache key immediately.

---

## 5. Verification Plan

1. **Automated Unit & Integration Tests:**
   - Test `refreshSession` with valid and invalid refresh tokens.
   - Test `getAuthUser` caching: verify consecutive calls resolve in <2ms with zero external fetch calls.
   - Test `getSupabaseSnapshot` caching and cache invalidation on save.
2. **Simulated Token Expiry Test:**
   - Send expired JWT to `/api/admin/queue` -> confirm frontend triggers `/api/auth/refresh` and completes request.
   - Verify `Admin.jsx` displays session expiry banner if refresh fails rather than zeroing out numbers.
