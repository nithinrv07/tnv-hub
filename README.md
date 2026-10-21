# Tamil Nadu Volunteers (TNV) Hub

Official unified platform for Tamil Nadu Volunteers (TNV) volunteer onboarding, civic screening, automated membership sequencing, bilingual interview evaluations, and administrative governance across all 38 districts of Tamil Nadu.

---

## 🏛️ Monorepo Architecture

This repository is organized as a unified monorepo:

- **`client/`**: Modern React + Vite application adhering to the **TNV Civic Design System** (`Design.md`). Built with Plus Jakarta Sans & Anek Tamil typography, Tailwind CSS, Lucide icons, and Zod validation schemas.
- **`server/`**: Robust Node.js REST API providing 30+ endpoints covering volunteer registration, AES-256 Aadhaar encryption, bilingual question rubrics, phone call logging, marks scoring, dynamic PDF generation (Receipts, ID Cards, Appointment Letters), and Supabase PostgreSQL integration with automatic offline in-memory fallback.
- **`scripts/dev.js`**: Cross-platform parallel runner that spins up both the API server on `http://localhost:3000` and the Vite client on `http://localhost:5173` with a single command.

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js** (v18 or higher recommended)
- **npm** (v9 or higher)

### 2. Installation
Install dependencies across the monorepo:
```bash
# Install root, client, and server dependencies
npm install
npm install --prefix client
npm install --prefix server
```

### 3. Running in Development
Start both the client and server concurrently:
```bash
npm run dev
```
- **Client (Vite):** [http://localhost:5173](http://localhost:5173)
- **REST API Server:** [http://localhost:3000](http://localhost:3000)

### 4. Running Automated Tests
Run the test suite verifying registration, payment flows, pincode validation, call logs, and question bank governance:
```bash
npm test
```
To run specific verification suites:
```bash
# Verify Question Bank activation/deactivation and Past Field Work dropdown:
node server/test/verify_question_bank_and_past_field_work.test.js

# Verify 5 Core Parity Requirements:
node server/test/verify_five_requirements.test.js
```

### 5. Production Build
Build the client application for production deployment:
```bash
npm run build:client
```

---

## 📋 Core Modules

1. **Volunteer Enrolment & Past Field Work (`/register`)**
   - 38 Tamil Nadu Native Districts & Assembly Constituencies.
   - Categorized Past Field Work multi-select dropdown fetched from central registry across 7 departments with smart Fresher logic and removable tags.
   - Dual-mode membership payment: instant UPI pay or skip to pay from dashboard.

2. **Volunteer Member Dashboard (`/dashboard`)**
   - Active volunteer membership status and receipt tracking.
   - Dynamic binary PDF generation: Official Volunteer ID Card & Appointment Letter.
   - Community WhatsApp group access.

3. **Admin Screening Suite (`/admin`)**
   - Live applicant queue with district, wing, and status filtering.
   - Telephone screening call logger (Attending, Not Attending, Postponed, No Answer).
   - Master Admin passkey-protected Aadhaar decryption.
   - Candidate marks evaluation & role recommendation.

4. **Bilingual Interview Question Bank**
   - Flexible rubric governance: freely choose, unchoose, activate, or deactivate questions.
   - Standard 10-question rubric enforcement with real-time selection counter.
   - Spacious question creation workbench with live scorecard preview.

---

## 📄 Documentation

- [`Design.md`](./Design.md): Full TNV Civic Forest Green visual design specifications and color tokens.
- [`INTEGRATION_PLAN.md`](./INTEGRATION_PLAN.md): Technical integration and architectural parity record.
