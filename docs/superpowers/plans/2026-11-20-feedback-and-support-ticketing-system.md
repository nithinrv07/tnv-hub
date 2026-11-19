# Feedback & Help-and-Support Ticketing System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete two-tier support communication system: a public visitor Feedback & Query Status page (`/feedback`), an authenticated volunteer Help & Support tab in the member dashboard (`/dashboard?tab=support`), and an integrated Admin "Queries and Complaints" hub (`/admin?nav=support`) with floating KPI metrics, segregated visitor/member views, and automated email reply dispatching.

**Architecture:** A unified backend router (`server/routes/support.js`) manages both visitor queries and member complaints under a single data model with sequential reference tracking (`TNV-QRY-YYYY-XXXX` and `TNV-TKT-YYYY-XXXX`) and Supabase snapshot sync (`sync_support_tickets`). Visitor queries dispatch confirmation and reply emails via `server/mail/mailer.js`. The public site gains `/feedback` linked in `Header.jsx` and `Footer.jsx` with an instant status checker. The volunteer dashboard gains an accessible Help & Support tab with complaint submission and in-dashboard resolution viewing. The admin dashboard replaces placeholder entries with a full operational desk with top KPI metrics, segregated tables, and a detail review drawer.

**Tech Stack:** Node.js HTTP server, React (JSX), Tailwind CSS, React Router DOM (v6), Vite.

**Spec:** `docs/superpowers/specs/2026-11-20-feedback-and-support-system-design.md`

## Global Constraints

- Zero new external npm dependencies (pure React + Tailwind CSS + standard Node.js libraries).
- Strictly adhere to TNV design tokens (`brand-green`, `brand-green-dark`, `brand-yellow`, `neutral-ink`, etc.).
- Follow anti-slop guidelines: clean, purposeful typography, flat buttons, no artificial gradients or decorative glows.
- All email communications use the existing `mailer` infrastructure in `server/mail/mailer.js`.
- Member complaints remain internal to the portal: resolutions are displayed directly in the dashboard without sending member emails.
- Preserves URL deep linking (`/admin?nav=support`, `/dashboard?tab=support`, `/feedback`).

## Review Focus

1. **Visitor Lookup Verification:** Ensure visitor query search matches both **Name** and **Mobile Number** (case-insensitive name check and exact phone match) or exact ticket ID.
2. **Sequential ID Isolation:** Ensure `TNV-QRY-YYYY-XXXX` and `TNV-TKT-YYYY-XXXX` have independent counters and format prefixes.
3. **Applicant vs Member Handling:** Ensure applicants without a `reg_id` can still submit technical/payment issues with fallback label `Applicant (ID Pending)`.
4. **Decoupled Admin Status Transitions:** Admin must be able to change status to `in_progress` without requiring an email dispatch, and only send emails when an official reply is composed.
5. **Clean Mobile Responsiveness:** The public feedback page, member support desk, and admin tables must be fully responsive on mobile screens.

---

### Task 1: Backend Support Router, Storage Engine & Mail Templates

**Files:**
- Create: `server/routes/support.js`
- Modify: `server/mail/templates.js`
- Modify: `server/server.js`
- Create: `server/test/support_ticketing.test.js`

**Interfaces:**
- Produces: `createSupportRoutes({ supabaseBridge, getAuthUser, sendJson, mailer, isHosted })`
- Consumes: `mailer` for visitor emails, `supabaseBridge` for snapshot persistence, `getAuthUser` for member session validation.

- [ ] **Step 1: Write the failing integration test**

Create `server/test/support_ticketing.test.js` testing:
1. Visitor query creation (`POST /api/support/visitor-query`) returns a `TNV-QRY-2026-XXXX` reference code.
2. Visitor query lookup (`GET /api/support/visitor-lookup?name=...&mobile=...`) retrieves the ticket.
3. Member complaint creation (`POST /api/support/member-complaint`) requires auth token and generates `TNV-TKT-2026-XXXX`.
4. Admin endpoints (`GET /api/support/admin/tickets` and `POST /api/support/admin/reply`) properly update status, store replies, and record metrics.

- [ ] **Step 2: Run test to verify it fails**

Run: `node server/test/support_ticketing.test.js`  
Expected: FAIL (routes not registered yet)

- [ ] **Step 3: Add Visitor Email Templates in `server/mail/templates.js`**

Implement:
- `mailTemplates.visitorQueryConfirmation({ name, ticketNumber, subject, message })`
- `mailTemplates.visitorQueryReply({ name, ticketNumber, subject, originalMessage, replyMessage })`

- [ ] **Step 4: Implement `server/routes/support.js`**

Implement the route module with:
- `inMemoryTickets` store with Supabase snapshot sync (`sync_support_tickets`).
- Sequential counters for queries (`qryCounter`) and member complaints (`tktCounter`).
- Route handlers:
  - `POST /api/support/visitor-query`
  - `GET /api/support/visitor-lookup`
  - `POST /api/support/member-complaint`
  - `GET /api/support/my-tickets`
  - `GET /api/support/admin/tickets`
  - `POST /api/support/admin/reply`

- [ ] **Step 5: Mount support routes in `server/server.js`**

Wire `/api/support` routes into the main HTTP server request router in `server/server.js`.

- [ ] **Step 6: Run test to verify it passes**

Run: `node server/test/support_ticketing.test.js`  
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add server/routes/support.js server/mail/templates.js server/server.js server/test/support_ticketing.test.js
git commit -m "feat(api): add unified support ticketing engine and visitor email templates"
```

---

### Task 2: Public Feedback Page & Navigation Links

**Files:**
- Create: `client/src/pages/Feedback.jsx`
- Modify: `client/src/components/Header.jsx`
- Modify: `client/src/components/Footer.jsx`
- Modify: `client/src/App.jsx`
- Create: `client/src/lib/supportService.js`

**Interfaces:**
- Produces: `<Feedback />` route component at `/feedback`.
- Consumes: `submitVisitorQuery` and `lookupVisitorQuery` from `client/src/lib/supportService.js`.

- [ ] **Step 1: Create client API client `client/src/lib/supportService.js`**

Add helper functions:
- `submitVisitorQuery({ name, mobile, email, subject, message })`
- `lookupVisitorQuery({ name, mobile, ticket })`
- `submitMemberComplaint({ category, subject, message })`
- `getMySupportTickets()`
- `getAdminSupportTickets()`
- `replyAdminSupportTicket({ id, status, admin_reply, send_email })`

- [ ] **Step 2: Implement `client/src/pages/Feedback.jsx`**

Implement the page layout following TNV design standards:
- Header introducing Tamil Nadu Volunteers public feedback desk.
- Two interactive sub-views/tabs:
  1. **"Submit a Query"**: Name, 10-digit Mobile, Email, Subject, Message. Instant success card showing the assigned Reference Code (`TNV-QRY-2026-XXXX`) with instructions.
  2. **"Check Query Status"**: Name and Mobile Number inputs (or Ticket ID). Displays submitted queries, timestamp, status badge (`New`, `In Progress`, `Resolved`), original query, and official admin response highlighted in a clean callout box.

- [ ] **Step 3: Update `client/src/components/Header.jsx` & `client/src/components/Footer.jsx`**

- Add `{ label: 'Feedback', to: '/feedback' }` to `NAV` in `Header.jsx`.
- Add `<Link to="/feedback">Feedback & Enquiries</Link>` to the About / Support list in `Footer.jsx`.

- [ ] **Step 4: Register route in `client/src/App.jsx`**

Add `<Route path="/feedback" element={<Feedback />} />` under the `AppShell` route group.

- [ ] **Step 5: Verify build & render**

Run: `node -e "require('./client/src/lib/supportService.js')"` or quick component import check.

- [ ] **Step 6: Commit**

```bash
git add client/src/pages/Feedback.jsx client/src/lib/supportService.js client/src/components/Header.jsx client/src/components/Footer.jsx client/src/App.jsx
git commit -m "feat(ui): add public Feedback page with status lookup and navigation links"
```

---

### Task 3: Member Portal "Help & Support" Desk

**Files:**
- Modify: `client/src/pages/Dashboard.jsx`

**Interfaces:**
- Produces: `tab === 'support'` Help & Support desk in the volunteer dashboard.
- Consumes: `getMySupportTickets()` and `submitMemberComplaint()` from `client/src/lib/supportService.js`.

- [ ] **Step 1: Add "Help & Support" to Dashboard Sidebar Navigation**

Add navigation button for `support` tab with:
- Life-ring / Headset SVG icon.
- Label: *"Help & Support"*.
- Active indicator dot.
- Unread resolution badge counter if tickets have fresh admin responses.

- [ ] **Step 2: Implement Support Desk Content in `Dashboard.jsx`**

Render support tab view:
- Top Header: *"Helpdesk & Grievance Redressal"*.
- Subtitle explaining that volunteers can raise technical portal issues or field coordination requests.
- Top Action Banner: *"Submit a Complaint / Request Help"* button opening an inline modal/form:
  - Read-only user details: Name, Mobile, Reg ID (or *"Applicant - Review Pending"*), District, Wing.
  - Category selector: **Technical Issue** (ID Card, Certificate, Payment) vs. **Work / Field Grievance** (Events, Attendance, Coordination).
  - Subject input & Message textarea.
  - Submit button with loading state.
- **My Complaints & Support Tickets List:**
  - Ticket ID (`TNV-TKT-2026-XXXX`).
  - Category badge & Date submitted.
  - Status pill (`New`, `In Progress`, `Resolved`).
  - Expandable resolution card displaying official Admin answer, replied timestamp, and resolution notes.
  - Empty state when no tickets have been raised yet.

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/Dashboard.jsx
git commit -m "feat(dashboard): add Help & Support tab with ticket creation and resolution tracking"
```

---

### Task 4: Admin Dashboard "Queries & Complaints" Hub

**Files:**
- Modify: `client/src/pages/Admin.jsx`

**Interfaces:**
- Produces: Active operational desk at `/admin?nav=support`.
- Consumes: `getAdminSupportTickets()` and `replyAdminSupportTicket()` from `client/src/lib/supportService.js`.

- [ ] **Step 1: Register Support Desk in `Admin.jsx` Navigation**

- Add `support: 'Queries & Complaints'` to `NAV_LABELS`.
- Replace placeholder `complaints` and `enquiries` in `SOON_FEATURES` with active navigation to `nav=support` in the sidebar Operations menu.
- Add Support icon and active menu handling in `menuForNav`.

- [ ] **Step 2: Implement Admin Support Workbench in `Admin.jsx`**

When `activeNav === 'support'`, render:
1. **Top Floating Summary KPI Cards:**
   - **Total Queries & Complaints** (Neutral Slate)
   - **New / Pending** (Amber Yellow)
   - **In Progress** (Blue)
   - **Resolved** (Emerald Green)
2. **Segregated Table Navigation:**
   - Tab 1: **Visitor Queries** (shows Visitor Name, Mobile, Email, Subject, Date, Status, Action: View & Reply).
   - Tab 2: **Member Complaints** (shows Ticket #, Member Name & Reg ID, District, Wing, Category, Date, Status, Action: View & Reply).
3. **Search & Filter Controls:**
   - Search by name, ticket number, or subject.
   - Filter by status (`all`, `new`, `in_progress`, `resolved`).

- [ ] **Step 3: Implement Review & Reply Modal**

Create an interactive modal/drawer in `Admin.jsx`:
- Full ticket details: submitter identity, contact info, category, timestamp, original message.
- Status toggle: `new` / `in_progress` / `resolved`.
- Admin reply textarea.
- Action Buttons:
  - *"Update Status Only"* (transitions status without emailing).
  - If visitor: *"Send Reply Email & Resolve"* (dispatches email to visitor and marks resolved).
  - If member: *"Publish Resolution to Member Portal"* (saves resolution for dashboard display).

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/Admin.jsx
git commit -m "feat(admin): implement Queries & Complaints desk with floating KPIs and segregated triage"
```

---

### Task 5: End-to-End Verification & Production Build

**Files:**
- Test: `server/test/e2e_support_flow.test.js`

- [ ] **Step 1: Write and run end-to-end flow test**

Test the full flow in `server/test/e2e_support_flow.test.js`:
1. Submit visitor query -> verify `TNV-QRY-2026-XXXX` generated.
2. Visitor query lookup -> verify data returned.
3. Member complaint creation -> verify `TNV-TKT-2026-XXXX` generated.
4. Admin fetch -> verify floating KPI counts match.
5. Admin reply to visitor -> verify email queued and query marked resolved.
6. Admin reply to member -> verify member dashboard data updated.

- [ ] **Step 2: Run Client Build Verification**

Run: `cd client && npm run build`  
Verify that Vite builds without any syntax or bundle errors.

- [ ] **Step 3: Commit**

```bash
git add server/test/e2e_support_flow.test.js
git commit -m "test(support): add end-to-end test suite and verify production build"
```
