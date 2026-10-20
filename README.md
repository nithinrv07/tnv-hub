# TNV Hub Portal — Frontend Reference

---

## 📢 IMPORTANT NOTICE FOR FRONTEND TEAM
> **NOTE:** This `frontend` branch is created as an official **REFERENCE FOR THE FRONTEND TEAM**.  
> It contains the complete frontend implementation, DOM hierarchy, responsive 2-column grid layout, dynamic form field behaviors, client-side validation, searchable multi-select dropdown, photo/selfie capture, Part B verification queue, telephone call logging, leadership interview scoring, and volunteer dashboard UI. The frontend team can use this code directly or adapt these patterns into modern client frameworks (React, Next.js, Vue, or Angular).

---

## 🚀 Key Modules & Capabilities

### 1. Dynamic Volunteer Registration Form (Phase 1)
- **Strict Password & Confirm Password Matching**:
  - Live feedback indicators displaying matching (`✓ Passwords match`) or mismatching (`✕ Passwords do not match`) status in real time.
  - Form submission guard preventing any submission unless both fields are identical.
- **PIN Code Numeric Enforcement**:
  - Automatically strips non-numeric input on the fly.
  - Strict 6-digit number validation.
- **Wing & Department Selection**:
  - Main numbered department headers (e.g. `1. Administration & Human Resources Department`) are selectable.
  - Sub-initiatives/cells (e.g. `• Volunteer Recruitment`) are styled as disabled info-only guidance so applicants select official departments.
- **Affiliation / Category Dynamic Expansion**:
  - `Individual`: Standard view without extra organization fields.
  - `NGO`, `Trust`, `Club`, `School`, `College`, `Association`, `Company`, `Other`: Dynamically generates contextual organization name inputs.
  - `Others (type manually)`: Inlines text input (`Enter Affiliation / Category`) directly below the dropdown.
- **Work / Study Status Dynamic Fields**:
  - `Working`: Dynamically displays **`Company / Employer Name *`**.
  - `Student`: Dynamically displays **`School / College / Institution Name *`**.
- **Searchable Past Field Work Multi-Select Dropdown**:
  - Search filter input with instant text filtering across 7 core departments.
  - Selection summary badge and clear/done actions.
- **Demographics & Location Cascade**:
  - 38 Tamil Nadu districts with dynamic Assembly Constituencies and mandatory Panchayat / Area.
- **Media & Profile Photo Integration**:
  - HTML5 Canvas & MediaDevices webcam selfie snapshot modal, plus drag-and-drop file upload.

### 2. User Dashboard & Payment Synchronization
- **Live Verified Payment Status**:
  - Automatic synchronization with verified server records (`PAID (₹365)` vs `UNPAID`).
  - Instant official vector PDF receipt download (`TNV-R-YYYY-XXXX`).
  - Unpaid applicants can complete membership payments directly from the dashboard at any time.
- **Status-Driven Progression**:
  - `Under Review`: Locks official documents and community groups while displaying security notices.
  - `Approved Member`: Unlocks official CR80 Member ID card download, appointment letter, and WhatsApp community links.

### 3. Part B — Master Admin Verification, Telephone Call Logging & Interview Scoring
- **Master Admin Queue**: Real-time review table with search, district filters, call status filters, and AES-256-GCM Aadhaar decryption with audit logs.
- **Telephone Call Logging**: Standardized call outcome logging (`Attending`, `Not Attending`, `Postponed`, `No Answer`) with scheduled callback support and audit trail.
- **Structured Interview Scoring**: 10 active bilingual questions with 3-tier scoring (`0`, `0.5`, `1.0`), running score tally, tie-breaker bonus, and auto-suggested roles.
- **Bilingual Question Management**: Manage and activate any 10 questions from the 16-question seed pool, or add custom bilingual questions.

---

## 📂 Frontend Directory Structure
```
frontend reference/
├── index.html        # Main semantic markup, accessible forms, modal dialogs, and verification dashboard
├── style.css         # Modern dark glassmorphic design system and responsive grid
├── app.js            # Client-side state, dynamic form handlers, dropdown logic, and API calls
└── public/           # Direct static deployment bundle with index.html, style.css, and app.js
```

---

## 💻 Running the Frontend Reference
The frontend files are static HTML5, CSS3, and modern JavaScript. They can be served using any static HTTP server:
```bash
# Serve frontend reference directory:
npx serve "frontend reference"
# or
python -m http.server 3000 --directory "frontend reference"
```
