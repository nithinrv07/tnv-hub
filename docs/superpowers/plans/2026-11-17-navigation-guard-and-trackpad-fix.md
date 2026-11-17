# Navigation Guard & Trackpad Back-Gesture Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent trackpad two-finger back gestures and browser back buttons from popping out of `/admin` or `/dashboard` into pre-login marketing anchors (`/#about`), ensuring sub-tabs navigate back to Overview, and Overview Back triggers a sign-out confirmation modal.

**Architecture:** Replace `/login` in browser history on successful authentication so pre-auth anchors are eliminated from the active stack. Install a synchronized sentinel history guard in both Admin and Dashboard overview views that intercepts trackpad pops, keeps the component mounted, and displays the sign-out confirmation dialog.

**Tech Stack:** React 18, React Router v6, Tailwind CSS, Node.js test harness.

**Spec:** [`docs/superpowers/specs/2026-11-17-navigation-guard-and-trackpad-fix-design.md`](file:///c:/Users/Faster/Desktop/Balaji/TNV/tnv-hub/docs/superpowers/specs/2026-11-17-navigation-guard-and-trackpad-fix-design.md)

## Global Constraints
- Use standard HTML5 history API coordinates with React Router v6 without altering top-level router architecture in `App.jsx`.
- Preserve existing sub-tab URL query parameter synchronization (`?nav=...` in Admin, `?tab=...` in Dashboard).
- Do not introduce external libraries or dependencies.
- Zero layout shift and zero breaking changes across all public routes.

## Review Focus
1. Rapid trackpad two-finger swipe with inertia: Must not blow through Overview to landing page anchors.
2. Clicking "Stay Signed In" on modal: Must re-arm the sentinel trap seamlessly without extra duplicate history entries.
3. Tab navigation back-walk: Swiping back from a sub-tab (e.g. `?nav=members-all`) must return to Overview first, not open the sign-out modal immediately.
4. Direct URL access to Overview: Entering `/admin` directly must arm the sentinel guard properly.
5. Sign-out confirmation: Confirming signout must call `logout()` and navigate to `/login` with `{ replace: true }`.

---

### Task 1: Eliminate Pre-Auth History Stack Leakage in Login

**Files:**
- Modify: `client/src/pages/Login.jsx:83-93`
- Test: `server/test/login_history_replace.test.js`

**Interfaces:**
- Consumes: React Router's `navigate(to, { replace: true })`
- Produces: Clean history handoff where `/login` does not remain behind the session.

- [ ] **Step 1: Write the test verifying `{ replace: true }` in `Login.jsx`**
Create `server/test/login_history_replace.test.js` checking that all role-based `navigate` redirects in `Login.jsx` specify `{ replace: true }`.

- [ ] **Step 2: Run test to verify it fails**
Run: `node tnv-hub/server/test/login_history_replace.test.js`
Expected: FAIL (missing `{ replace: true }`).

- [ ] **Step 3: Update `Login.jsx` redirects**
In `client/src/pages/Login.jsx`, update:
```javascript
      if (role === 'admin' || role === 'master_admin' || role === 'dept_admin') {
        navigate(fromPath && fromPath.startsWith('/admin') ? fromPath : '/admin', { replace: true });
      } else if (role === 'ngo') {
        navigate('/ngo', { replace: true });
      } else {
        navigate(fromPath || '/dashboard', { replace: true });
      }
```

- [ ] **Step 4: Run test to verify it passes**
Run: `node tnv-hub/server/test/login_history_replace.test.js`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git -C tnv-hub add client/src/pages/Login.jsx server/test/login_history_replace.test.js
git -C tnv-hub commit -m "fix(auth): replace history entry on login to prevent back navigation to marketing anchors"
```

---

### Task 2: Implement Trackpad-Resilient Navigation Guard in Admin Portal

**Files:**
- Modify: `client/src/pages/Admin.jsx`
- Test: `server/test/admin_nav_guard.test.js`

**Interfaces:**
- Consumes: `SignOutModal.jsx`, `window.history.pushState`, `window.addEventListener('popstate')`
- Produces: Overview guard that catches trackpad back gestures and opens `SignOutModal`.

- [ ] **Step 1: Write the test verifying the Admin navigation guard contract**
Create `server/test/admin_nav_guard.test.js` verifying the guard logic, popstate handling, re-arming, and logout handling.

- [ ] **Step 2: Run test to verify it fails**
Run: `node tnv-hub/server/test/admin_nav_guard.test.js`
Expected: FAIL

- [ ] **Step 3: Implement synchronized sentinel guard in `client/src/pages/Admin.jsx`**
In `client/src/pages/Admin.jsx`:
- Ensure sentinel state `window.history.pushState({ tnvAdminGuard: true }, '', window.location.href)` is armed whenever `activeNav === 'dashboard'`.
- Listen for `popstate`. When triggered while on `dashboard`:
  - Push the sentinel state back immediately to keep `/admin` in place.
  - Set `setShowSignOutModal(true)`.
- If user cancels (`setShowSignOutModal(false)`): sentinel is already in place.
- If user confirms: `confirmLogout` calls `logout()` and `navigate('/login', { replace: true })`.

- [ ] **Step 4: Run test to verify it passes**
Run: `node tnv-hub/server/test/admin_nav_guard.test.js`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git -C tnv-hub add client/src/pages/Admin.jsx server/test/admin_nav_guard.test.js
git -C tnv-hub commit -m "fix(admin): make overview navigation guard resilient against trackpad back gestures"
```

---

### Task 3: Implement Trackpad-Resilient Navigation Guard in Volunteer Member Dashboard

**Files:**
- Modify: `client/src/pages/Dashboard.jsx`
- Test: `server/test/dashboard_nav_guard.test.js`

**Interfaces:**
- Consumes: `SignOutModal.jsx`, `window.history.pushState`, `window.addEventListener('popstate')`
- Produces: Overview guard that catches trackpad back gestures and opens `SignOutModal`.

- [ ] **Step 1: Write the test verifying the Dashboard navigation guard contract**
Create `server/test/dashboard_nav_guard.test.js` verifying the volunteer dashboard sentinel guard contract.

- [ ] **Step 2: Run test to verify it fails**
Run: `node tnv-hub/server/test/dashboard_nav_guard.test.js`
Expected: FAIL

- [ ] **Step 3: Implement synchronized sentinel guard in `client/src/pages/Dashboard.jsx`**
In `client/src/pages/Dashboard.jsx`:
- Arm sentinel state `window.history.pushState({ tnvVolunteerGuard: true }, '', window.location.href)` whenever `activeTab === 'overview'`.
- Listen for `popstate`. When triggered on `overview`:
  - Push sentinel state back to maintain `/dashboard` location.
  - Set `setShowSignOutModal(true)`.
- If user cancels (`setShowSignOutModal(false)`): sentinel remains armed.
- If user confirms: `confirmLogout` calls `logout()` and `navigate('/login', { replace: true })`.

- [ ] **Step 4: Run test to verify it passes**
Run: `node tnv-hub/server/test/dashboard_nav_guard.test.js`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git -C tnv-hub add client/src/pages/Dashboard.jsx server/test/dashboard_nav_guard.test.js
git -C tnv-hub commit -m "fix(dashboard): make volunteer overview navigation guard resilient against trackpad back gestures"
```

---

### Task 4: Full Suite Verification, Client Build & Origin Push

**Files:**
- Verify all tests in `server/test/`
- Build client via `npm run build --prefix client`

- [ ] **Step 1: Run complete test suite**
Run:
`node tnv-hub/server/test/login_history_replace.test.js`
`node tnv-hub/server/test/admin_nav_guard.test.js`
`node tnv-hub/server/test/dashboard_nav_guard.test.js`
`node tnv-hub/server/test/cache_performance.test.js`
`node tnv-hub/server/test/auth_refresh.test.js`
`node tnv-hub/server/test/signout_modal_dom.test.js`
Expected: All tests PASS.

- [ ] **Step 2: Run full client production build**
Run: `npm run build --prefix tnv-hub/client`
Expected: Vite build succeeds with 0 errors.

- [ ] **Step 3: Push commits to GitHub**
Run: `git -C tnv-hub push origin main`
Expected: Push succeeds cleanly.
