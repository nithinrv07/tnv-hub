# Navigation Guard & Trackpad Back-Gesture Fix Design

## Intent & Why
When users navigate to the Admin Dashboard (`/admin`) or Volunteer Dashboard (`/dashboard`) and perform a two-finger swipe back on their trackpad, the browser pops the history stack back to previous landing page anchors (such as `/#about`) or the login page. This bypasses the intended dashboard workflow, where pressing Back from sub-tabs should return to the Overview tab, and pressing Back from the Overview should prompt for sign-out confirmation.

## Goals
1. **Clean Pre-Auth History:** Prevent landing page anchors (`/#about`) and `/login` from lingering in the immediate back history after successful authentication.
2. **Trackpad-Resilient Overview Guard:** Trap browser Back actions and trackpad swipe gestures on both `/admin` and `/dashboard` Overview tabs so they reliably open `<SignOutModal />` instead of unmounting the dashboard.
3. **Tab History Hierarchy:** Maintain browser history for sub-tabs (`?nav=...` in Admin, `?tab=...` in Dashboard) so swiping back walks back through open tabs to the Overview.
4. **Consistent Sign-Out Flow:** On Overview back navigation, ask for sign-out confirmation. If canceled, remain on Overview; if confirmed, clear session and navigate cleanly to `/login`.

## Non-Goals
- Migrating the app from standard `<BrowserRouter>` to React Router v6 data router (`createBrowserRouter`).
- Intercepting external website navigation (e.g. typing a new URL in the browser address bar or closing the tab).

## Approaches Considered
- **Approach 1: History Boundary & Synchronized Sentinel Guard (Selected):**
  - Use `{ replace: true }` in `Login.jsx` upon successful sign-in to eliminate the login and marketing anchor stack leak.
  - In `Admin.jsx` and `Dashboard.jsx`, manage a sentinel state entry (`{ tnvGuard: true }`) whenever on the root Overview tab.
  - When `popstate` triggers from the Overview, catch the event, re-establish the sentinel route to keep the portal mounted, and display `<SignOutModal />`.
  - Re-arm cleanly when canceled; logout with replace when confirmed.
  - *Trade-off:* Requires coordinating browser history events with React Router state, but stays 100% native with zero external dependencies and zero risk to other routes.
- **Approach 2: Full React Router Data Architecture Migration (`createBrowserRouter` + `useBlocker`):**
  - Refactor all 20+ routes in `App.jsx` and `index.jsx` to use data routing and `useBlocker`.
  - *Trade-off:* High risk of regressions across public and civic pages for a localized portal navigation guard.

## Components Touched
1. `client/src/pages/Login.jsx`: Update redirect calls to use `{ replace: true }`.
2. `client/src/pages/Admin.jsx`: Overhaul `popstate` guard on `activeNav === 'dashboard'` to be resilient against trackpad swipe momentum and properly re-arm on modal cancel.
3. `client/src/pages/Dashboard.jsx`: Apply the identical resilient guard to the volunteer member overview (`activeTab === 'overview'`).
