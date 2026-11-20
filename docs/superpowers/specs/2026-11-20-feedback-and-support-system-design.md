# Feedback & Help-and-Support Ticketing System Specification

**Date:** 2026-11-20  
**Status:** Approved by Builder Review / Ready for Final Approval  
**Domain:** Public Feedback, Member Support Desk, and Admin Query Management  

---

## 1. Intent & Context

Tamil Nadu Volunteers (TNV) requires a structured, two-channel communication system to capture public visitor enquiries and member field/technical grievances separately, while giving administrative coordinators a unified operational desk:

1. **Public Visitors:** Seek information, ask questions about volunteering, collaborations, or general queries. They need an accessible form on the public site (linked cleanly in header and footer), immediate email acknowledgement with a reference ID, and a simple way to return to the site and check the status/reply using their **Name** and **Mobile Number**.
2. **Authenticated Members & Applicants:** Encounter technical portal issues (e.g., payment receipts, ID card download) or ground operational challenges (e.g., events, tasks, district coordination). They require a dedicated **Help & Support** tab in their volunteer dashboard to submit structured complaints that automatically link to their profile, assign a tracking **Ticket Number**, and display status and admin resolutions directly inside the portal without needing email spam.
3. **Administrators:** Require a single unified desk titled **"Queries and Complaints"** featuring floating KPI metrics (Total, New/Unread, In Progress, Resolved), segregated tabs between Visitor Queries and Member Complaints, and a modal to review details, update ticket status, and dispatch official email replies (for visitors) or in-dashboard notifications (for members).

---

## 2. Goals, Non-Goals & Anti-Goals

### Goals
- **Public Feedback Page (`/feedback`):**
  - Seamlessly reachable via Header navigation bar and Footer links (not an obtrusive hero banner).
  - Form fields: Full Name, Mobile Number, Email Address, Subject, Message.
  - Automated confirmation email sent immediately to visitor with their reference code (`TNV-QRY-YYYY-XXXX`).
  - Built-in status checker on `/feedback`: Visitor enters **Name + Mobile Number** (or optional Reference Ticket ID) to view their query history, current status badge (`New`, `In Progress`, `Resolved`), and the admin's official reply.
- **Member Help & Support (`/dashboard?tab=support`):**
  - Clean tab in member dashboard sidebar navigation, available to both active verified members and registered applicants.
  - Member identity is auto-bound (Name, Reg ID or "Pending Application", Mobile, Email, District, Wing).
  - Category selector: **Technical Issue** (portal bugs, payment receipts, ID card) vs. **Work / Field Coordination** (events, task assignment, coordinator support).
  - Generates a unique Ticket Number (`TNV-TKT-YYYY-XXXX`).
  - Displays ticket history, active statuses, and in-dashboard notifications/answers from administrators.
- **Admin "Queries & Complaints" Hub (`/admin?nav=support`):**
  - Prominent floating metric cards: **Total**, **New / Pending**, **In Progress**, and **Resolved**.
  - Two segregated tabs:
    - **Visitor Queries:** Shows Name, Mobile, Email, Subject, Date, Status, and action to View & Email Reply.
    - **Member Complaints:** Shows Ticket #, Member Name, District, Wing, Category, Date, Status, and action to View & Resolve.
  - Action Drawer/Modal:
    - View full message context and submitter metadata.
    - Status transitions (`new`, `in_progress`, `resolved`).
    - Decoupled status update (e.g. mark "In Progress" with optional internal notes) vs. official reply dispatch.
    - If replying to visitors: Dispatches an official email to visitors via TNV’s `mailer`.
    - If resolving for members: Saves the in-dashboard resolution with timestamp and displays an active resolution card in the member's portal.

### Non-Goals
- Third-party ticketing SaaS integrations (Zendesk, Freshdesk, Intercom) — all data remains self-contained in TNV Hub.
- Sending member resolution emails (member explicitly views answers and receives notifications directly within their dashboard).
- Real-time live chat sockets.

### Anti-Goals
- Generic "AI template" aesthetics: No decorative background gradients, no glowing border pills, no unneeded index badges (respecting TNV's established design tokens and house style).

---

## 3. Approaches Considered & Trade-offs

### Approach A: Unified Support & Ticketing Engine (Selected)
- **Architecture:** Single backend route module (`/api/support`) with an integrated data store that distinguishes tickets by `type: 'visitor_query' | 'member_complaint'`.
- **Reference Codes:** Standard sequential numbering (`TNV-QRY-YYYY-XXXX` for visitors, `TNV-TKT-YYYY-XXXX` for members).
- **Pros:** DRY codebase, unified admin KPI counters, single state sync pipeline with Supabase snapshots (`sync_support_tickets`), shared search and filter utilities.
- **Why Chosen:** Delivers the exact workflow requested while keeping admin triage simple and resilient.

### Approach B: Completely Disjoint Modules (Rejected)
- Separate `/api/visitor-feedback` and `/api/member-complaints` with distinct storage files and frontend tables.
- **Why Rejected:** Unnecessary code duplication for ticket statuses, notification routing, and admin metric aggregation.

---

## 4. Builder Clarifications & Architecture Decisions

*(Resolved via Builder Review)*
1. **Single-Turn Resolution Lifecycle:**
   - Standard flow: Submitter posts query/complaint -> Admin reviews and marks In Progress / drafts Reply -> Submitter views answer.
   - If an ongoing follow-up is needed, submitters can open a linked follow-up ticket citing their previous ticket ID.
2. **Decoupled Status & Reply Actions in Admin:**
   - Admin can independently update status to `in_progress` or `resolved` without immediately dispatching an email.
   - A dedicated "Send Email Reply" button triggers visitor email dispatch and marks the query resolved.
3. **Visitor Lookup Security & Requirements:**
   - Form requires both **Mobile Number** and **Name** (or exact Reference Ticket ID).
   - Lookup verifies both match before returning submitted queries to prevent unauthorized browsing.
4. **Member Dashboard Scope:**
   - Accessible to all logged-in volunteers (Verified Members and Applicants awaiting review/payment).
   - If applicant does not yet have a `reg_id`, their profile displays "Applicant (ID Pending)", allowing them to submit payment/verification issues directly to admin.

---

## 5. Detailed System Architecture

### 5.1 Data Model (`support_tickets`)

```javascript
{
  id: "uuid-string",
  ticket_number: "TNV-QRY-2026-0001", // or TNV-TKT-2026-0001
  type: "visitor_query" | "member_complaint",
  category: "general" | "technical" | "work_related",
  status: "new" | "in_progress" | "resolved",
  
  // Submitter details
  name: "Visitor or Member Name",
  mobile: "9876543210",
  email: "person@example.com",
  
  // Member specific metadata (null for visitor queries)
  member_id: "user-uuid" | null,
  member_reg_id: "TNV-2026-0142" | null,
  member_district: "Chennai" | null,
  member_wing: "Youth Wing" | null,
  is_approved: true | false,
  
  // Content
  subject: "Inquiry or Complaint Subject",
  message: "Detailed text describing the query or issue",
  
  // Resolution details
  admin_reply: "Official response from administration" | null,
  replied_at: "2026-11-20T10:30:00.000Z" | null,
  replied_by: "Admin" | null,
  
  // Timestamps
  created_at: "2026-11-20T09:00:00.000Z",
  updated_at: "2026-11-20T10:30:00.000Z"
}
```

### 5.2 API Endpoints

1. `POST /api/support/visitor-query`
   - **Body:** `{ name, mobile, email, subject, message }`
   - **Actions:** Validates input, assigns `TNV-QRY-YYYY-XXXX`, saves ticket, dispatches immediate confirmation email to visitor.
   - **Returns:** `{ ok: true, ticket_number, message }`

2. `GET /api/support/visitor-lookup?name=...&mobile=...&ticket=...`
   - **Query Params:** `name` and `mobile` (required), or `ticket` (exact match).
   - **Returns:** `{ ok: true, items: [...] }` containing submitted queries, status, and admin replies.

3. `POST /api/support/member-complaint` *(Bearer Token Auth Required)*
   - **Body:** `{ category: 'technical' | 'work_related', subject, message }`
   - **Actions:** Validates member session, pulls member profile, assigns `TNV-TKT-YYYY-XXXX`, saves complaint.
   - **Returns:** `{ ok: true, ticket_number, item }`

4. `GET /api/support/my-tickets` *(Bearer Token Auth Required)*
   - **Returns:** `{ ok: true, items: [...] }` containing all complaints filed by the authenticated member.

5. `GET /api/support/admin/tickets` *(Admin Auth Required)*
   - **Returns:** `{ ok: true, metrics: { total, new, in_progress, resolved }, items: [...] }`

6. `POST /api/support/admin/reply` *(Admin Auth Required)*
   - **Body:** `{ id, status, admin_reply, send_email: boolean }`
   - **Actions:** Updates ticket status and reply text.
   - If `send_email === true` and `type === 'visitor_query'`, dispatches official reply email to visitor's email.
   - If `type === 'member_complaint'`, sets resolution for member dashboard display.
   - **Returns:** `{ ok: true, item }`

---

## 6. User Interface & Experience Specifications

### 6.1 Public Feedback Page (`/feedback`)
- Route registered in `AppShell` (inheriting `TopBar`, `Header`, `Footer`).
- **Header & Footer Links:** Added to `NAV` array in `Header.jsx` and the navigation links in `Footer.jsx`.
- **Top Section:** Clean explanation of TNV's feedback channel with two clear tabs:
  - **Tab 1: "Submit a Query"**:
    - Clean inputs: Full Name, 10-digit Mobile Number, Email Address, Subject, Message.
    - Submit button with instant feedback banner and reference code.
  - **Tab 2: "Check Query Status"**:
    - Input: Full Name and Mobile Number (or Reference Ticket #).
    - Result card list showing: Reference Code, Submission Date, Status Badge (`New`, `In Progress`, `Resolved`), Original Question, and Official Response from TNV Team (highlighted with timestamp).

### 6.2 Member Portal "Help & Support" (`/dashboard?tab=support`)
- Added as a top-level sidebar tab in `Dashboard.jsx`:
  - Icon: Support headset / Life ring.
  - Title: **Help & Support**.
- **Header:** "Member Helpdesk & Grievance Redressal".
- **Action Banner:** "Report an Issue or Ground Complaint" button opening an inline modal/form:
  - Pre-filled member details (read-only: Name, Reg ID, Mobile).
  - Category radio buttons: **Technical Issue** (portal, documents, payments) vs. **Work / Field Grievance** (events, tasks, team coordination).
  - Subject input & Message textarea.
- **My Support Tickets Table / Feed:**
  - Ticket Number, Category badge, Date filed, Status pill.
  - Expandable detail view revealing the admin's official response and resolution date.

### 6.3 Admin Dashboard "Queries & Complaints" (`/admin?nav=support`)
- Replaces the placeholder `complaints` and `enquiries` in `Admin.jsx` with active navigation `nav=support`.
- **Top Floating Summary Cards:**
  - Total Queries & Complaints (Gray/Neutral)
  - New / Pending Triage (Amber/Yellow)
  - In Progress (Blue)
  - Resolved (Emerald/Green)
- **Segregated Views (Tabs):**
  - **Tab A: Visitor Queries**
    - Columns: Date, Reference #, Visitor Name, Mobile, Email, Subject, Status, Actions.
  - **Tab B: Member Complaints**
    - Columns: Date, Ticket #, Member Name & Reg ID, District & Wing, Category, Subject, Status, Actions.
- **Review & Reply Drawer / Modal:**
  - Full submission readout: Submitter contact info, original timestamp, category, and complete message.
  - Status selector dropdown (`New`, `In Progress`, `Resolved`).
  - Admin reply text editor.
  - Action button:
    - For visitors: "Send Reply via Email" (triggers automated HTML email).
    - For members: "Publish Resolution to Member Dashboard".

---

## 7. Email Templates (Visitor Flow)

1. **Visitor Confirmation Email (`mailTemplates.visitorQueryConfirmation`):**
   - Subject: `[TNV Query Received] Reference: TNV-QRY-2026-XXXX`
   - Content: Friendly acknowledgement, summary of the query, link to `/feedback` with instructions to enter Name & Mobile number to check status.
2. **Visitor Reply Email (`mailTemplates.visitorQueryReply`):**
   - Subject: `[TNV Response] Regarding your query: TNV-QRY-2026-XXXX`
   - Content: Official response from TNV Support Team, original query quoted for context, contact details for further queries.

---

## 8. Verification & Testing Strategy

1. **Visitor Submission & Immediate Email:**
   - Submit a test query via `/feedback`.
   - Verify ticket sequence increments and email dispatch is logged in `server/mail/mailer.js`.
2. **Visitor Query Lookup:**
   - Query `/api/support/visitor-lookup` with matching and non-matching phone/name combinations; verify accurate history returns.
3. **Member Complaint Submission:**
   - Login as applicant/member, switch to Help & Support tab, submit a technical complaint.
   - Verify ticket is created with category, member UUID, and Reg ID.
4. **Admin Triage & Reply Dispatch:**
   - Login as admin, view floating KPI counts, switch between Visitor and Member tabs.
   - Reply to visitor query: verify email is dispatched and status changes to `resolved`.
   - Reply to member complaint: verify member dashboard updates with the reply and status.
