# Dashboard Inline Loading Skeletons and Navigation Sign-Out Guards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate flashing zeroes during data loading by showing inline pulsing skeleton placeholders, and prevent accidental sign-outs when pressing browser Back from dashboard subpages or the overview across both Admin and Volunteer dashboards.

**Architecture:** A reusable `<SignOutModal />` component provides accessible confirmation for both manual sign-out and trapped browser back exits. Both `Admin.jsx` and `Dashboard.jsx` synchronize their subpage/tab states with URL search params so browser Back naturally navigates back to the root Overview. A `popstate` guard on the root Overview intercepts exit attempts and prompts the confirmation modal. When `loading === true`, metric counters render animated skeleton blocks instead of literal zeros.

**Tech Stack:** React (JSX), Tailwind CSS, React Router DOM (v6), Vite.

**Spec:** `docs/superpowers/specs/2026-11-17-dashboard-inline-loading-and-navigation-guard-design.md`

## Global Constraints

- Zero new external npm dependencies (use native Tailwind CSS `animate-pulse` and standard React events).
- Clean accessibility: modals dismissible via `Escape` or backdrop click.
- Never flash literal zeroes (`0`, `₹0`, `0 / 38`) while initial data is being fetched.
- Preserves deep linking to direct tabs via query params (`/admin?nav=events`, `/dashboard?tab=tasks`).

## Review Focus

1. **Popstate Clean-Up:** Ensure `popstate` event listeners are cleanly removed on component unmount to prevent memory leaks or ghost interceptors.
2. **Backdrop & Keyboard Dismissal:** Ensure pressing `Escape` or clicking the backdrop cancels sign-out cleanly without navigating away.
3. **Double Push Prevention:** Ensure `history.pushState` on the overview does not pollute the history stack with infinite identical entries.
4. **Direct URL Entry:** If a user navigates directly to `/admin?nav=tasks`, pressing Back must return to `/admin?nav=dashboard` rather than exiting.
5. **No Layout Shift:** Skeleton loaders must match the approximate height and bounding box of real metrics to prevent cumulative layout shift (CLS).

---

### Task 1: Create Shared `<SignOutModal />` Component

**Files:**
- Create: `client/src/components/SignOutModal.jsx`
- Test: `server/test/signout_modal_dom.test.js`

**Interfaces:**
- Produces: `SignOutModal({ isOpen, onConfirm, onCancel, title, message })`
- Consumes: Tailwind CSS styles and standard React callbacks.

- [ ] **Step 1: Write the failing test**

Create `server/test/signout_modal_dom.test.js` asserting that `client/src/components/SignOutModal.jsx` exists and exports a valid React component handling `isOpen`, `onConfirm`, and `onCancel`.

- [ ] **Step 2: Run test to verify it fails**

Run: `node server/test/signout_modal_dom.test.js`
Expected: FAIL (file does not exist yet)

- [ ] **Step 3: Implement `client/src/components/SignOutModal.jsx`**

Implement accessible modal with:
- Backdrop overlay (`bg-neutral-900/60 backdrop-blur-xs`).
- Confirmation card with warning/logout icon, title *"Sign out of TNV Portal?"*, and explanatory subtext.
- Action buttons: *"Stay Signed In"* (secondary) and *"Sign Out"* (rose red confirmation).
- `Escape` key listener when open.

- [ ] **Step 4: Run test to verify it passes**

Run: `node server/test/signout_modal_dom.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add client/src/components/SignOutModal.jsx server/test/signout_modal_dom.test.js
git commit -m "feat(ui): add reusable SignOutModal component"
```

---

### Task 2: Implement Inline Loading Skeletons in `Admin.jsx`

**Files:**
- Modify: `client/src/pages/Admin.jsx`

**Interfaces:**
- Consumes: `loading` state in `Admin.jsx`.
- Produces: Pulsing skeleton placeholders when `loading === true` for stat cards, metrics, and monthly changes.

- [ ] **Step 1: Update Stat Card Value Rendering in `Admin.jsx`**

In `Admin.jsx` lines 2320-2345:
When `loading` is true:
Render `<div className="h-7 w-20 bg-neutral-200/80 animate-pulse rounded my-0.5" />` instead of `{card.value}`.
Hide or render a subtle skeleton pill for the monthly change badge instead of computing on empty previous month data.

- [ ] **Step 2: Update Quick Figures & Coverage Badges**

Ensure District Coverage and secondary notes do not display `0 / 38` during load; render an animated skeleton bar `<div className="h-4 w-28 bg-neutral-200/60 animate-pulse rounded" />`.

- [ ] **Step 3: Verify with Vite build**

Run: `cmd.exe /c "npm run build --prefix client"`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/Admin.jsx
git commit -m "fix(admin): replace flashing zero metrics with inline loading skeletons"
```

---

### Task 3: Implement History-Integrated Navigation & Sign-Out Guard in `Admin.jsx`

**Files:**
- Modify: `client/src/pages/Admin.jsx`

**Interfaces:**
- Consumes: `<SignOutModal />`, React Router `useNavigate`, `useLocation`.
- Produces: Seamless tab back-navigation to Overview and confirmed exit.

- [ ] **Step 1: Synchronize `openNav` with Browser History**

In `openNav(nav)`:
Use `navigate(`/admin?nav=${encodeURIComponent(nav)}`)` so each tab change pushes to browser history.

- [ ] **Step 2: Add Root Overview `popstate` Guard**

In `Admin.jsx`:
When `activeNav === 'dashboard'`:
Push a synthetic state `history.pushState({ tnvRoot: true }, '', location.href)` if not already trapped.
Listen to `window.addEventListener('popstate')`:
If on `'dashboard'`, prevent immediate unload, re-push trap state, and trigger `setShowSignOutModal(true)`.

- [ ] **Step 3: Wire Manual Sign Out**

Update `handleLogout` to trigger `setShowSignOutModal(true)`.
When confirmed in `<SignOutModal />`: execute `logout(); navigate('/login');`.

- [ ] **Step 4: Verify with Vite build**

Run: `cmd.exe /c "npm run build --prefix client"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/Admin.jsx
git commit -m "feat(admin): integrate browser history with tabs and add sign-out confirmation guard"
```

---

### Task 4: Implement Inline Loading Skeletons & Navigation Guard in `Dashboard.jsx`

**Files:**
- Modify: `client/src/pages/Dashboard.jsx`

**Interfaces:**
- Consumes: `<SignOutModal />`, volunteer profile & tasks loading states.
- Produces: Skeleton placeholders during data load and confirmed exit guard on Overview.

- [ ] **Step 1: Add Inline Loading Skeletons in `Dashboard.jsx`**

In `Dashboard.jsx`:
While `loading` is true:
Render skeleton placeholders for Member ID, validity dates, registered events count, and assigned tasks count.

- [ ] **Step 2: Synchronize Tabs with Browser History**

Update tab navigation to sync with `?tab=${tab}` via `navigate`.
When browser Back is clicked from a sub-tab, it returns to the Overview (`tab === 'overview'`).

- [ ] **Step 3: Add Root Overview `popstate` Guard & Confirm Modal**

On `'overview'`, trap browser Back with `setShowSignOutModal(true)`.
Wire manual "Sign Out" button to `setShowSignOutModal(true)`.

- [ ] **Step 4: Verify with Vite build**

Run: `cmd.exe /c "npm run build --prefix client"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/Dashboard.jsx
git commit -m "feat(dashboard): add inline loading skeletons and navigation sign-out guard"
```

---

### Task 5: End-to-End Verification & Remote Push

- [ ] **Step 1: Run complete test suite**
- [ ] **Step 2: Verify production Vite build**
- [ ] **Step 3: Push commits to `origin main`**
