# TNV Hub System Integration & Missing Pages Implementation Plan

> **Author**: Principal Full-Stack Architect & Lead Frontend Engineer  
> **Status**: Approved for Execution  
> **Target Version**: Unified Monorepo v1.0.0 (`/main`)  
> **Specification Reference**: [`DESIGN.md`](./DESIGN.md)

---

## Executive Summary & Gap Analysis

Our audit of the two separate branch codebases reveals:
1. **`/backend`**: Houses a robust, complete backend implementation in `server.js` (with `supabase_bridge.js`, SQLite/PostgreSQL schemas, and crypto services) providing 29 REST endpoints covering district data, live uniqueness checks, volunteer registration, UPI receipt sequencing (`TNV-R-YYYY-0001`), authenticated dashboard profiles, WhatsApp community link unlocking, official PDF generation (ID card, Appointment letter, Payment receipt), Master Admin Aadhaar AES-256 decryption, phone call logging, bilingual interview question banking (with 10-question active sets), dynamic marks scoring, and role band recommendation.
2. **`/frontend`**: Houses a production-grade, highly accessible civic React + Vite + Tailwind client (`frontend/client`), but 8 out of 12 core application routes currently render `<ComingSoon />` placeholders. The operational UI for payments, logins, dashboards, and admin review only existed inside the monolithic naive testing frontend (`frontend/frontend reference`).
3. **Objective**: Consolidate both into a clean, unified monorepo on `/main`, discard the monolithic testing files, build the 8 missing production pages strictly adhering to `DESIGN.md`, and wire all live backend endpoints.

---

## 1. Target Directory Architecture (`/main`)

The consolidated repository in `/main` (`d:/TNV PHASE 1/`) is structured as an industry-standard unified monorepo with clean separation of client, server, and shared assets:

```text
d:/TNV PHASE 1/                          # Unified Monorepo Root
├── client/                              # Production React 18 + Vite 5 + Tailwind 3 App
│   ├── index.html                       # Entry point, Anek Tamil font preconnects, meta theme
│   ├── package.json                     # Client dependencies
│   ├── vite.config.js                   # Vite config with proxy: { '/api': 'http://localhost:3000' }
│   ├── tailwind.config.js               # Design tokens, color scales, 44px tap targets
│   ├── postcss.config.js                # PostCSS compilation
│   ├── public/                          # Static assets (tnv-logo.png, qrcode.png, gallery/)
│   └── src/
│       ├── main.jsx                     # React root & Google Translate DOM guard
│       ├── App.jsx                      # Full client routing table (all 12 routes active)
│       ├── index.css                    # @tailwind directives, civic button variants, a11y focus rings
│       ├── components/                  # UI Primitives & Molecules
│       │   ├── AppShell.jsx             # Shell with skip-link, sticky Header, and Footer
│       │   ├── Header.jsx               # Sticky civic header with auth-aware navigation
│       │   ├── TopBar.jsx               # Announcement ticker, helpline, and social links
│       │   ├── Footer.jsx               # 4-column civic footer
│       │   ├── Logo.jsx                 # Official TNV brand emblem
│       │   ├── Gallery.jsx              # Full-width touch-enabled civic carousel
│       │   ├── LanguageMenu.jsx         # 12-language Google Translate switcher
│       │   ├── Spinner.jsx              # Circular SVG loading primitive
│       │   ├── SocialIcon.jsx           # Zero-dependency accessible SVGs
│       │   ├── Reveal.jsx               # Scroll-linked heading motion wrappers
│       │   └── form/                    # Form Primitives (Strict WCAG 2.1 AA)
│       │       ├── FormField.jsx        # Accessible wrapper (label, hint, error, aria-describedby)
│       │       ├── PasswordInput.jsx    # Masked input with Show/Hide toggle
│       │       └── DistrictSelect.jsx   # Dynamic 38-district dropdown with retry
│       ├── pages/                       # Application Views (Zero ComingSoon placeholders)
│       │   ├── Landing.jsx              # Official public landing page
│       │   ├── Register.jsx             # Comprehensive 2-column volunteer registration
│       │   ├── Payment.jsx              # [NEW] UPI QR ₹365 fee, Pay Now & Skip, Receipt download
│       │   ├── Login.jsx                # [NEW] Volunteer & Admin authentication with role redirect
│       │   ├── Dashboard.jsx            # [NEW] Under Review / Approved status, WhatsApp links, PDF IDs
│       │   ├── AdminQueue.jsx           # [NEW] Filterable applicant queue, follow-ups, and stats
│       │   ├── AdminReview.jsx          # [NEW] Aadhaar reveal, Call logger, 10-Question scoring, Role assign
│       │   ├── ManageQuestions.jsx      # [NEW] Question bank manager (10 active, add/edit question)
│       │   ├── Donate.jsx               # [NEW] Civic donation tiers, UPI ID, bank details
│       │   ├── ForgotPassword.jsx       # [NEW] Self-service recovery flow
│       │   ├── Policy.jsx               # Terms, Privacy, Refund policies
│       │   └── NotFound.jsx             # 404 handler
│       ├── lib/                         # Client Utilities
│       │   ├── api.js                   # Unified fetch client with timeout, JSON formatting, auth headers
│       │   ├── session.js               # Auth token & user profile session storage
│       │   ├── format.js                # Phone, Aadhaar, currency, and date formatters
│       │   ├── motion.js                # prefers-reduced-motion, in-view, RAF hooks
│       │   └── registerSchema.js        # Zod validation schema
│       └── data/                        # Static datasets
│           ├── site.js                  # 38 districts, zones, programs, impact metrics
│           └── policies.js              # Legal policies copy
│
├── server/                              # Clean Node.js REST API Server
│   ├── server.js                        # Pure REST API server (zero static testing UI)
│   ├── supabase_bridge.js               # In-memory & Supabase database adapter with AES-256 Aadhaar
│   ├── data/                            # Core Seed Data
│   │   ├── constituencies.js            # 38 districts, 234 assembly constituencies, wings, departments
│   │   └── questions_seed.js            # 16 bilingual interview questions with scoring rubrics
│   ├── supabase/                        # Database Schemas & Migrations
│   │   └── migrations/                  # 14 ordered SQL migration files
│   └── test/                            # Comprehensive Automated Test Suites
│       ├── crypto.test.js
│       ├── verify_dashboard_payment_and_pincode.test.js
│       ├── call_logs_module_parity.test.js
│       ├── interview_scoring.test.js
│       └── volunteer_registration_enhancements.test.js
│
├── package.json                         # Root Monorepo Orchestration Scripts
├── .env.example                         # Environment configuration template
├── README.md                            # Project documentation (clean, team-focused)
└── DESIGN.md                            # Single Source of Truth for Design Tokens & Components
```

---

## 2. Discarded Testing UI Manifest

The following naive, monolithic, and temporary testing files from the legacy workspace will be **completely stripped out** and excluded from the production `/main` directory:

| Discarded File / Code Artifact | Original Path | Reason for Removal |
| :--- | :--- | :--- |
| **Monolithic Testing HTML** | `frontend/frontend reference/index.html` (1,498 lines) | Unscoped vanilla HTML mixing all views into one file with manual `hidden` class toggling. |
| **Dark Glassmorphic Test CSS** | `frontend/frontend reference/style.css` (3,247 lines) | Non-standard CSS variables that violate the official civic Tailwind tokens in `DESIGN.md`. |
| **Testing State Machine JS** | `frontend/frontend reference/app.js` (3,525 lines) | Fragile imperative DOM scripting (`document.getElementById`) superseded by React components. |
| **Legacy Static File Server** | `backend/server.js` (Lines 2027–2054) | `fs.readFile` static server for `public/` directory; replaced by Vite in dev and Express static `dist/` in prod. |
| **Redundant Public Bundles** | `frontend/frontend reference/public/*` | Duplicate compiled assets from prior iterations. |
| **DOM ID Scraper Tests** | `backend/test/check_dom_ids.js`, `test_admin_review_modal_dom.js` | Unit tests hardcoded to old monolithic HTML element IDs (`#adminReviewModal`, `#btnCallModal`). |

*Note: The original `/frontend` and `/backend` directories remain safe and untouched in git history as isolated branch checkouts until full verification.*

---

## 3. Backend-to-Frontend Mapping Table

Every backend endpoint is mapped to its target React frontend page, required HTTP method, request/response payload, and integration status:

| # | Backend Endpoint | HTTP Method | Target Frontend Route / Component | Payload / Data Model | Integration Status |
| :-: | :--- | :---: | :--- | :--- | :---: |
| **1** | `/api/districts` | `GET` | `DistrictSelect.jsx`, `Register.jsx`, `AdminQueue.jsx` | Returns `{ districts: [{ id, name, zone }] }` | **Needs Wiring** |
| **2** | `/api/options` | `GET` | `Register.jsx` | Returns `{ wings, departments_by_wing, blood_groups, ... }` | **Needs Wiring** |
| **3** | `/api/constituencies` | `GET` | `Register.jsx` | Query: `?district_id=N`. Returns `{ constituencies: [...] }` | **Needs Wiring** |
| **4** | `/api/username-available` | `GET` | `Register.jsx` | Query: `?u=username`. Returns `{ available: boolean }` | **Connected** |
| **5** | `/api/email-available` | `GET` | `Register.jsx` | Query: `?e=email`. Returns `{ available: boolean }` | **Connected** |
| **6** | `/api/register` | `POST` | `Register.jsx` | Full volunteer registration payload (demographics, wing, encrypted Aadhaar) | **Connected (Needs Field Expansion)** |
| **7** | `/api/record-payment` | `POST` | `Payment.jsx`, `Dashboard.jsx` | Body: `{ profile_id, utr, payment_mode }`. Returns `{ receipt_no, paid: true }` | **Missing UI** |
| **8** | `/api/receipts/:no.pdf` | `GET` | `Payment.jsx`, `Dashboard.jsx` | Downloads official PDF receipt with signature & seal | **Missing UI** |
| **9** | `/api/login` | `POST` | `Login.jsx` | Body: `{ username, password }`. Returns `{ session: { access_token }, role, profile }` | **Missing UI** |
| **10** | `/api/my-profile` | `GET` | `Dashboard.jsx` | Headers: `Authorization: Bearer <token>`. Returns authenticated volunteer profile | **Missing UI** |
| **11** | `/api/my-links` | `GET` | `Dashboard.jsx` | RLS-guarded. Returns WhatsApp links (unlocked only if `status === 'approved'`) | **Missing UI** |
| **12** | `/api/member-documents` | `GET` | `Dashboard.jsx` | Returns `{ id_card_available: boolean, appointment_available: boolean }` | **Missing UI** |
| **13** | `/api/id-card/:id.pdf` | `GET` | `Dashboard.jsx` | Streamed official ID card PDF with QR code & photo | **Missing UI** |
| **14** | `/api/appointment/:id.pdf`| `GET` | `Dashboard.jsx` | Streamed official appointment letter PDF | **Missing UI** |
| **15** | `/api/update-photo` | `POST` | `Dashboard.jsx`, `Register.jsx` | Body: `{ profile_id, photo_base64 }`. Updates profile avatar | **Missing UI** |
| **16** | `/api/admin/queue` | `GET` | `AdminQueue.jsx` | Headers: `Bearer <admin_token>`. Filters: `district_id`, `status`, `wing`, `search` | **Missing UI** |
| **17** | `/api/admin/followups` | `GET` | `AdminQueue.jsx` | Headers: `Bearer <admin_token>`. Returns applicants with scheduled callbacks | **Missing UI** |
| **18** | `/api/admin/reveal-aadhaar`| `POST` | `AdminReview.jsx` | Master Admin only. Body: `{ profile_id, master_key }`. Logs audit & returns 12-digit Aadhaar | **Missing UI** |
| **19** | `/api/admin/log-call` | `POST` | `AdminReview.jsx` | Body: `{ profile_id, outcome, notes, callback_time }`. Updates call history & status | **Missing UI** |
| **20** | `/api/admin/call-logs` | `GET` | `AdminReview.jsx` | Query: `?profile_id=N`. Returns chronologically ordered call log attempts | **Missing UI** |
| **21** | `/api/admin/questions` | `GET` | `AdminReview.jsx`, `ManageQuestions.jsx` | Query: `?active_only=true` (or all). Returns 16 bilingual questions & active flag | **Missing UI** |
| **22** | `/api/admin/questions` | `POST` | `ManageQuestions.jsx` | Body: `{ text_en, text_ta, category, max_marks }`. Creates new bilingual question | **Missing UI** |
| **23** | `/api/admin/questions` | `PUT` | `ManageQuestions.jsx` | Body: `{ id, text_en, text_ta, category, max_marks }`. Edits question | **Missing UI** |
| **24** | `/api/admin/questions/set-active` | `POST` | `ManageQuestions.jsx` | Body: `{ question_ids: [...] }`. Validates exactly 10 active questions | **Missing UI** |
| **25** | `/api/admin/scores` | `GET` | `AdminReview.jsx` | Query: `?profile_id=N`. Returns existing score record & total marks (0–100) | **Missing UI** |
| **26** | `/api/admin/save-scores` | `POST` | `AdminReview.jsx` | Body: `{ profile_id, scores: { q_id: marks }, total_score, suggested_role }` | **Missing UI** |
| **27** | `/api/admin/approve` | `POST` | `AdminReview.jsx` | Body: `{ profile_id, decision: 'approved'|'rejected', assigned_wing, assigned_role, notes }` | **Missing UI** |

---

## 4. Missing Pages Detailed Specifications

Every missing page will be implemented as a modular React component in `client/src/pages/` using the exact design tokens and primitives from `DESIGN.md`.

### 4.1 Page 1: Membership Payment (`/register/payment` -> `Payment.jsx`)
- **Route**: `/register/payment`
- **Purpose**: Displays immediate post-registration confirmation, presents official ₹365 annual membership fee with UPI QR code, and allows immediate payment verification or skipping.
- **User Flow**:
  1. Arrives from successful registration (`navigate('/register/payment', { state: { profile } })`).
  2. Displays application number and name banner in `brand-green-tint` container.
  3. Displays QR code (`/public/qrcode.png`), UPI ID (`tnvvolunteers@sbi`), and ₹365 fee.
  4. User can enter UTR / Transaction Reference Number and click **"Verify & Download Receipt"** (`POST /api/record-payment`).
  5. User can click secondary **"Skip for Now / Pay from Dashboard Later"** button, which navigates directly to `/dashboard`.
- **Design Tokens & Primitives**:
  - Container: `max-w-2xl mx-auto py-12 px-4`
  - Action Buttons: `.btn-register` (Pay Now, yellow), `.btn-outline` (Skip, green border)
  - Colors: `bg-brand-green-tint`, `text-brand-green-dark`, `border-brand-green`
  - Typography: `font-display text-3xl font-bold` for title, `font-mono` for UPI & Receipt numbers

### 4.2 Page 2: Authentication / Sign In (`/login` -> `Login.jsx`)
- **Route**: `/login`
- **Purpose**: Secure sign-in portal for both Volunteers (to access their personal dashboard) and Administrators (to access the verification queue).
- **User Flow**:
  1. Form with `username` and `password` fields using `FormField` and `PasswordInput`.
  2. Calls `POST /api/login`.
  3. On success:
     - Saves JWT token in `sessionStorage` / `localStorage` via `saveToken()`.
     - If `role === 'admin'`: navigates to `/admin`.
     - If `role === 'volunteer'`: navigates to `/dashboard`.
  4. On error: displays accessible inline error alert (`role="alert"` in `status-no-answer`).
- **Design Tokens & Primitives**:
  - Container: `max-w-md mx-auto py-16 px-4`
  - Primitives: `FormField`, `PasswordInput`, `.btn-primary` with `min-h-tap`
  - Focus Ring: `outline-[3px] outline-brand-yellow`

### 4.3 Page 3: Volunteer Member Dashboard (`/dashboard` -> `Dashboard.jsx`)
- **Route**: `/dashboard`
- **Purpose**: Personalized member hub showing verification state, unlocked community access, official credentials, and payment history.
- **User Flow**:
  1. On mount: loads `GET /api/my-profile` with auth token. If unauthenticated, redirects to `/login`.
  2. **Status Banner**:
     - *If Pending (`under_review`)*: Yellow pill `status-pending` with explanation that telephone verification is underway.
     - *If Approved (`approved`)*: Green badge `status-approved` displaying official Member ID (`TNV-<DIST>-XXXX`) and Assigned Wing.
  3. **Unlocked Documents (Approved Only)**:
     - "Download Member ID Card" -> `GET /api/id-card/:id.pdf`
     - "Download Appointment Letter" -> `GET /api/appointment/:id.pdf`
  4. **Community Access (Approved Only)**:
     - Unlocked WhatsApp Community Links (`GET /api/my-links`) with district group and state channel cards.
  5. **Membership Payment Card**:
     - If Paid: Green checkmark with Receipt Number (`TNV-R-2026-XXXX`) and "Download Receipt PDF" link (`GET /api/receipts/:no.pdf`).
     - If Unpaid: Warning pill with "Pay Annual Fee (₹365)" opening the UPI modal.
  6. **Profile Photo**: Avatar display with "Update Photo" modal.
- **Design Tokens & Primitives**:
  - Grid: `grid gap-6 md:grid-cols-3`
  - Badges: `rounded-full px-3 py-1 text-xs font-bold uppercase`
  - Cards: `rounded-xl bg-white p-6 shadow-sm ring-1 ring-brand-green-tint`

### 4.4 Page 4: Admin Verification Queue (`/admin` -> `AdminQueue.jsx`)
- **Route**: `/admin`
- **Purpose**: Administrative command center for state/district coordinators to monitor, filter, and process volunteer applications.
- **User Flow**:
  1. Guards access: checks admin role, redirects to `/login` if unauthorized.
  2. **Metric Summary Cards**: Total Applicants, Pending Review, Approved Volunteers, Scheduled Callbacks.
  3. **Filter Bar**: District dropdown (38 districts), Status filter (`All`, `Pending`, `Approved`, `Rejected`), Wing filter, and Search input.
  4. **Applicants Table**: Sortable columns for Name, Username, District, Phone, Wing, Applied Date, Status Badge, and "Review" button.
  5. **Follow-ups Tab**: Dedicated view for applicants requiring callback (`GET /api/admin/followups`).
  6. **Manage Questions Action**: Top-right button linking to `/admin/questions`.
- **Design Tokens & Primitives**:
  - Table: Responsive civic table with zebra striping, sticky header, and 44px tap target rows.
  - Metrics: Stat cards with `font-display text-3xl font-extrabold text-brand-green-dark`.

### 4.5 Page 5: Applicant Review & Verification Sheet (`/admin/applicants/:id` -> `AdminReview.jsx`)
- **Route**: `/admin/applicants/:id`
- **Purpose**: Deep verification workspace containing the 4 critical modules: Profile Audit, Call Logger, Bilingual 10-Question Score Sheet, and Decision/Role Assignment.
- **User Flow**:
  1. **Section 1: Applicant Profile Dossier**: Demographics, address, education/workplace, skills, past experience.
  2. **Section 2: Masked Aadhaar & Master Decryption**: Displays `XXXXXXXX1234`. Master Admin can click "Reveal Aadhaar" (requiring admin passkey) to call `POST /api/admin/reveal-aadhaar`.
  3. **Section 3: Telephone Call Logging Module**:
     - Form to record outcome (`Connected`, `No Answer`, `Busy`, `Wrong Number`, `Switched Off`), call notes, and optional callback datetime.
     - Calls `POST /api/admin/log-call`.
     - Timeline of previous call attempts (`GET /api/admin/call-logs`).
  4. **Section 4: Bilingual Interview Questions & Dynamic Marks Entry**:
     - Loads active 10 questions (`GET /api/admin/questions?active_only=true`).
     - Renders bilingual question card (English + Tamil) with scoring rubric (0–10).
     - Live total score counter (0–100) with automatic role recommendation band:
       - 80–100: State Executive / District Lead
       - 60–79: Wing Secretary / Taluk Lead
       - 40–59: Active Field Volunteer
       - < 40: General Volunteer
     - Button: "Save Interview Scores" (`POST /api/admin/save-scores`).
  5. **Section 5: Role Assignment & Verification Decision**:
     - Decision dropdown: `Approve`, `Reject`, `Need Follow-up`.
     - Final Assigned Wing and Final Assigned Role dropdowns.
     - Verification notes field.
     - Button: **"Submit Official Decision"** (`POST /api/admin/approve`).
- **Design Tokens & Primitives**:
  - Layout: 2-column split (Dossier on left, Interview & Decision on right) on `lg` screens.
  - Score Badge: Sticky total score badge in `bg-brand-green text-white font-mono`.

### 4.6 Page 6: Manage Interview Questions (`/admin/questions` -> `ManageQuestions.jsx`)
- **Route**: `/admin/questions`
- **Purpose**: Administration interface to curate the 16-question bilingual bank, toggle active status (strict 10-question interview limit), and add/edit questions.
- **User Flow**:
  1. Fetches all questions (`GET /api/admin/questions`).
  2. Checklist showing active questions with counter (`Active: 10 / 10`). Checkboxes disabled when 10 are selected unless one is unchecked.
  3. Button: "Save Active 10 Questions" (`POST /api/admin/questions/set-active`).
  4. "Add New Question" form: English text, Tamil text, category, maximum marks. Calls `POST /api/admin/questions`.
  5. Edit inline modal: Calls `PUT /api/admin/questions`.
- **Design Tokens & Primitives**:
  - Question Cards: `rounded-lg border border-brand-green-tint bg-white p-4 shadow-sm`
  - Active Toggle: High-contrast switch with `focus:ring-2 focus:ring-brand-green`

### 4.7 Page 7: Civic Donation (`/donate` -> `Donate.jsx`)
- **Route**: `/donate`
- **Purpose**: Public contribution portal to support grassroots community programs across Tamil Nadu.
- **User Flow**:
  1. Suggested donation tier buttons: ₹100, ₹365 (Sponsor a Volunteer), ₹1,000, ₹5,000, and Custom.
  2. UPI QR Code display and Click-to-Pay UPI intent link.
  3. Bank NEFT/RTGS details card (Account Name, Account Number, IFSC, Branch).
  4. Tax exemption note and receipt request form.
- **Design Tokens & Primitives**:
  - Tier Buttons: `.btn-outline` with active state in `.btn-primary`
  - Container: `max-w-3xl mx-auto py-16 px-4`

### 4.8 Page 8: Self-Service Password Recovery (`/forgot-password` -> `ForgotPassword.jsx`)
- **Route**: `/forgot-password`
- **Purpose**: Volunteer account recovery via registered email or mobile SMS link.

---

## 5. Execution Strategy: Step-by-Step Implementation

1. **Step 1**: Present Phase 1 & 2 Gap Analysis and get architectural alignment.
2. **Step 2 (Phase 3 Migration)**:
   - Create unified monorepo structure in `/main` (`client/` and `server/`).
   - Copy production React client from `frontend/client/` to `/main/client/`.
   - Copy clean backend API logic from `backend/` to `/main/server/` (purging legacy static HTML/JS/CSS).
   - Configure root `package.json` with parallel runner (`concurrently`), unified `.env.example`, and proxy scripts.
3. **Step 3 (Phase 4 API Client Layer)**:
   - Create typed API service modules in `/main/client/src/lib/`:
     - `authService.js` (login, session, logout, current user)
     - `volunteerService.js` (registration, profile, documents, payments)
     - `adminService.js` (queue, followups, call logs, scoring, approval, question bank)
4. **Step 4 (Phase 4 Build Missing Pages)**:
   - Build all 8 missing pages adhering strictly to `DESIGN.md`.
   - Expand `Register.jsx` to support all dynamic demographic, workplace, and wing fields.
   - Wire all routes into `App.jsx`.
5. **Step 5 (Phase 4 End-to-End Verification)**:
   - Run automated test suite verifying all 29 API endpoints.
   - Verify client production build with `npm run build` in `client/`.
   - Spin up dev server and perform full verification of volunteer and admin journeys.
