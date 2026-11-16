# Design Document: Dashboard Inline Loading Skeletons and Navigation Sign-Out Guards

- **Date:** 2026-11-17
- **Status:** Proposed
- **Author:** Antigravity & User

---

## 1. Intent & The Why

When users visit either the **Admin Portal** (`/admin`) or the **Volunteer Member Dashboard** (`/dashboard`), there are two user-experience friction points:
1. **Flashing Zeroes During Initial Load:** The portal takes ~1 to 2 seconds to fetch initial data over the network. During this loading period, metrics and stat cards calculate from empty arrays, flashing literal `0`s, `₹0`, and `0 / 38` before jumping to their actual numbers.
2. **Accidental Sign-Out on Browser Back Navigation:** When navigating tabs/sections within a dashboard (e.g. going from Tasks to Events or Members), tab changes do not push browser history entries. Pressing the browser's "Back" button causes the browser to leave the portal entirely and return to the login or landing page, effectively signing out the user without warning.
3. **Unconfirmed Manual Sign-Out:** Clicking "Sign Out" in the sidebar/navigation immediately signs the user out with no confirmation prompt.

---

## 2. Goals, Non-Goals, and Anti-Goals

### Goals
- **Inline Loading Skeletons:** Display animated skeleton placeholders (`animate-pulse`) for metric values, stat cards, and counters while `loading === true`, preventing any flash of literal `0`s.
- **Hierarchical Back Navigation:**
  - Navigating to any sub-tab/section pushes a history entry.
  - Pressing the browser's "Back" button from a sub-tab steps back towards the **Overview** tab.
  - Pressing "Back" from the **Overview** tab intercepts navigation and prompts a confirmation modal: *"Are you sure you want to sign out?"*
- **Confirmed Manual Sign-Out:** Clicking the manual "Sign Out" button displays the same confirmation modal before ending the session.
- **Consistent Implementation:** Apply this behavior uniformly across both `/admin` and `/dashboard`.

### Non-Goals
- Migrating the app router to React Router Data Router (`createBrowserRouter`).
- Changing backend API contracts or adding external UI modal libraries.

### Anti-Goals
- Never trap the user in an un-closable navigation loop.
- Never flash zeroes or empty states while actively loading fresh data.

---

## 3. Approaches Considered

1. **Approach 1: URL SearchParams History + Shared Sign-Out Modal & Skeleton Components (Selected)**
   - *Description:* Sync tab state (`nav` / `tab`) with URL search params so browser history tracks sub-pages naturally. Use a `popstate` guard on the Overview root to trigger `<SignOutModal />`, and display inline pulse skeleton blocks when `loading` is true.
   - *Trade-offs:* Zero extra dependencies, clean deep-linking for dashboard tabs, and reusable across both portals.
   - *Why chosen:* Directly provides native browser history support and addresses all user concerns with minimal churn.

2. **Approach 2: In-Memory Tab History Stack**
   - *Description:* Keep an array of visited tabs in React component state without modifying the URL.
   - *Trade-offs:* Visited history is lost on page refresh; deep linking to tabs is impossible.

3. **Approach 3: React Router Data Router Migration (`useBlocker`)**
   - *Description:* Rewrite `App.jsx` to use `createBrowserRouter` to enable React Router v6 `useBlocker`.
   - *Trade-offs:* High risk of breaking existing route definitions and authentication wrappers.

---

## 4. Detailed Component Design

### A. Shared Sign-Out Confirmation Modal (`client/src/components/SignOutModal.jsx`)
- Props:
  - `isOpen: boolean`
  - `onConfirm: () => void`
  - `onCancel: () => void`
- UI:
  - Clean modal dialog matching TNV styling (emerald/dark green accents).
  - Clear message: *"Are you sure you want to sign out?"* with descriptive subtext: *"You will need to sign in again to access the portal."*
  - Buttons: **Cancel** (secondary button) and **Sign Out** (rose/red confirmation button).
  - Keyboard accessible (ESC to dismiss) and backdrop click dismissal.

### B. Inline Loading Skeletons (`Admin.jsx` & `Dashboard.jsx`)
- In `Admin.jsx`:
  - When `loading === true`, stat cards render `<div className="h-7 w-20 bg-neutral-200/80 animate-pulse rounded-md my-0.5" />` instead of `{card.value}`.
  - Quick badge changes and secondary notes render subtle pulsing skeleton bars during initial fetch.
- In `Dashboard.jsx`:
  - Profile header badges, event counts, task summaries, and membership payment cards render inline pulse blocks while profile and tasks are loading.

### C. History-Integrated Navigation & Popstate Guard
- **Tab Synchronization:**
  - When changing tabs via `openNav(tab)`:
    - Update URL search params (`navigate({ search: `?nav=${tab}` })` or `?tab=${tab}`).
  - When URL changes (via browser Back/Forward or direct link), update the active tab state accordingly.
- **Root Overview Back Guard:**
  - When on the root Overview (`activeNav === 'dashboard'` or `tab === 'overview'`), push a synthetic history entry (`history.pushState(null, '', location.href)`).
  - Listen to `popstate`: if the user triggers Back from the Overview, re-push the state to prevent immediate unmount and set `showSignOutModal = true`.
  - If the user clicks **Sign Out** in the modal: proceed with `logout()` and redirect to `/login`.
  - If the user clicks **Cancel**: close modal and remain on Overview.
- **Manual Sign Out:**
  - Clicking the "Sign Out" navigation link sets `showSignOutModal = true`.

---

## 5. Verification Plan
- Unit tests & component checks for `<SignOutModal />`.
- Manual and automated verification of browser Back behavior:
  - Overview -> Events -> Tasks -> Browser Back -> Events -> Browser Back -> Overview -> Browser Back -> Prompts Modal.
- Verification that initial load renders pulse skeletons and never flashes `0`.
- Verify production build with Vite.
