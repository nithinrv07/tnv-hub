# TNV Hub Portal — Volunteer Registration & Member Lifecycle System (Phase 1)

---

## 📌 Repository Branches

This repository is split into dedicated branches for modular collaboration:

- **`main`**: Complete unified full-stack solution (Frontend + Backend + Supabase Database + Edge Functions).
- **`frontend`**: **REFERENCE FOR THE FRONTEND TEAM** — Contains the complete client-side architecture, UI design system, interactive DOM workflows, dynamic form logic, and visual assets for the frontend team to integrate into existing/new client frameworks.
- **`backend`**: Backend server, Supabase PostgREST & Auth bridge, 11 SQL migrations, Deno Edge Functions, and automated vector PDF generation engines.

---

## 🚀 What Has Been Done In This Project

### 1. Dynamic Volunteer Registration System
- **Affiliation / Category Dynamic Expansion**:
  - `Individual`: Default view without extra organization fields.
  - `NGO`: Dynamically generates **`NGO Name *`** with placeholder `Enter name of ngo`.
  - `Trust`: Dynamically generates **`Trust Name *`** with placeholder `Enter name of trust`.
  - `Club`: Dynamically generates **`Club Name *`** with placeholder `Enter name of club`.
  - `School`: Dynamically generates **`School Name *`** with placeholder `Enter name of school`.
  - `College`: Dynamically generates **`College Name *`** with placeholder `Enter name of college`.
  - `Association`: Dynamically generates **`Association Name *`** with placeholder `Enter name of association`.
  - `Company`: Dynamically generates **`Company Name *`** with placeholder `Enter name of company`.
  - `Other`: Dynamically generates **`Other Name *`** with placeholder `Enter name of other`.
  - `Others (type manually)`: Inlines manual text input (`Enter Affiliation / Category`) directly below the dropdown without disturbing the 2-column grid.
- **Work / Study Status Dynamic Fields**:
  - `Working`: Dynamically shows **`Company / Employer Name *`** (placeholder: `Enter company / employer name`).
  - `Student`: Dynamically shows **`School / College / Institution Name *`** (placeholder: `Enter school, college, or institution name`).
  - `Other` / `Others (type manually)`: Shows **`Work / Study Details *`**.
- **Location Hierarchy & Area**:
  - All 38 Tamil Nadu districts loaded.
  - Assembly Constituencies dynamically populated based on chosen district.
  - Mandatory **`Panchayat / Area *`** input enforced on client and server.
- **Previous Works / Experience Box**:
  - Dark glassmorphic styling eliminating white glare.
  - Flexible word validation accepting any description up to 150 words (or 'Nil' for freshers) with real-time word counting.
- **Searchable Past Field Work Dropdown**:
  - Multi-select dropdown with real-time text filter.
  - Department categorization (General, Social Responsibility, Health & Wellness, Education & Skill Development, Community Development, Emergency Crisis, Environment & Sustainability).
  - Multi-selection trigger summary (e.g. `Fresher`, `Women & Child Safety (+2 more)`).
  - Quick action buttons: `Clear all` and `Done`.
- **Photo Upload & Selfie Camera Integration**:
  - File picker (PNG/JPEG/WebP) and live HTML5 camera selfie snapshot.
  - Embedded profile picture preview optimized for CR80 Member ID card.

### 2. Security & Aadhaar Protection
- **AES-256-GCM Encryption**: Plain Aadhaar numbers are never stored in plain text, logged, or sent back over the wire.
- **Masked Aadhaar**: Securely stored as ciphertext with authenticated tags, only masked `XXXX XXXX 1234` is displayed.
- **One Account Per Email**: Strict 1-to-1 enforcement with live RPC pre-check (`email_available`).
- **Live Username Availability**: Debounced real-time RPC check (`username_available`).

### 3. Membership Payment & Receipts
- **₹365 Membership Fee**: Supports immediate UPI payment verification with 12-digit UTR or optional review skip.
- **Receipt Sequence**: Auto-incrementing sequence strictly starting from `TNV-R-YYYY-0001`.
- **Vector PDF Receipt Generation**: Instant on-the-fly downloadable PDF receipt with transaction details.

### 4. Part B — Master Admin Verification, Telephone Call Logging & Leadership Scoring
- **Master Admin Verification Queue**:
  - Live applicant review queue with masked Aadhaar display (`XXXX XXXX 1234`).
  - Master Admin secure Aadhaar reveal with on-demand AES-256-GCM decryption and tamper-evident audit logging.
- **Telephone Call Logging (Task T6)**:
  - Three call outcome workflows: `no_answer`, `scheduled` (strictly requiring callback timestamp), and `attended`.
  - Full history audit tracking call timestamp, admin user ID, outcome, and notes.
- **Structured Leadership Scoring (Task T7)**:
  - 10 standardized Tamil Nadu Volunteers interview evaluation questions.
  - Strict score scale enforcement: `0.0`, `0.5`, or `1.0` per question.
  - Automatic calculation of cumulative interview score.
- **Final Approval & Edge Function (Task T8)**:
  - Dedicated Supabase Edge Function: `approve_applicant`.
  - Multi-guard enforcement: verifies master admin role, checks interview scoring completeness (all 10 questions scored), and performs atomic transaction.
  - Generates official TNV Member ID (`TNV-<district_code>-<0001>`).
  - Automatically transitions volunteer to `approved`, unlocking the CR80 Member ID Card, Appointment Letter, and community group links.

### 5. Automated PDF Document Generation
- **Official Member ID Card**: CR80 landscape format (3.375" x 2.125" / 243 x 153 pt) with volunteer photo, TNV ID, blood group, role, district, and QR/barcode.
- **Appointment Letter**: Official A4 format letter with executive header, candidate details, wing placement, and signature.
- **Membership Receipt**: Professional A4 payment voucher with transaction seal.

### 6. Full Supabase Database Integration & Zero Hardcoded Data
- **15 SQL Migrations** configuring schema, RLS policies, views (`profiles_public`), call logs, scoring, and verification tables.
- **Deno Edge Functions** in TypeScript (`register`, `record_payment`, `approve_applicant`).
- Clean separation between offline test environment and live Supabase production mode.

---

## 🛠️ How to Run Locally

```bash
# 1. Clone repository
git clone <repository-url>
cd tnv-hub

# 2. Run server (Zero npm install needed - uses standard Node.js built-ins)
node server.js

# 3. Open portal
# Navigate to http://localhost:3000 in your browser
```
