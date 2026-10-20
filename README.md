# TNV Hub Portal — Backend & Database System (Phase 1)

> **Developer ID:** `NITHINSJNDI`  
> **Repository:** [https://github.com/nithinrv07/tnv-hub](https://github.com/nithinrv07/tnv-hub)  
> **Branch:** `backend`

---

## 🏗️ Backend & Database Architecture Overview
This `backend` branch contains the complete server-side infrastructure, database migrations, RPC procedures, cryptographic protection, PostgREST bridge, and automated vector PDF generation engines.

### Key Components:
- **`server.js`**: Native Node.js HTTP test & API server (built with native standard libraries, zero external npm package dependencies).
- **`supabase_bridge.js`**: Production Supabase client adapter handling Supabase Auth admin API, PostgREST endpoints, and Database RPCs.
- **`supabase/migrations/`**: 11 SQL migrations configuring relational tables, security policies (RLS), sequences, and views.
- **`supabase/functions/`**: Deno TypeScript Edge Functions (`register`, `record_payment`, shared crypto and PDF utilities).
- **`data/constituencies.js`**: 38 Tamil Nadu districts, assembly constituencies, organizational wings, and department structures.
- **`test/supabase_integration_check.js`**: Automated integrity script verifying SQL migrations, edge functions, and zero hardcoded data compliance.

---

## 🚀 What Has Been Done In This Project

### 1. Database Schema & 11 SQL Migrations
1. **`20261020000001_create_districts.sql`**: 38 Tamil Nadu districts table.
2. **`20261020000002_create_profiles_and_username_available.sql`**: Core `profiles` table, Row Level Security (RLS), and `username_available(u)` RPC.
3. **`20261020000003_add_registration_fields_and_notifications.sql`**: Supplementary registration columns and admin notifications table.
4. **`20261020000004_registration_dropdown_options.sql`**: Normalized dropdown options storage.
5. **`20261020000005_create_payments_and_receipt_seq.sql`**: Payment records table and `receipt_seq` strictly starting from `0001` (`TNV-R-YYYY-0001`).
6. **`20261020000006_whatsapp_links_and_login_email.sql`**: Community WhatsApp/Telegram links and `login_email_for(username)` RPC.
7. **`20261020000007_part_c_dashboard_unlocks_and_tnv_id.sql`**: Dynamic TNV ID sequence (`TNV-CHE-0001`) and dashboard unlocks.
8. **`20261020000008_unique_email_and_email_available.sql`**: Unique email constraint and `email_available(e)` RPC.
9. **`20261020000009_volunteer_registration_enhancements.sql`**: Wing, Department, Mode of Work, Previous Experience, Past Field Work.
10. **`20261020000010_add_work_study_status.sql`**: Work / Study status column.
11. **`20261020000011_add_dynamic_org_and_employer_fields.sql`**: `organization_name`, `employer_name`, and updated `profiles_public` view.

### 2. Cryptographic Security & Aadhaar Protection
- **AES-256-GCM Encryption**: Plain Aadhaar numbers are never stored in the database, logged, or returned.
- Ciphertext and 16-byte authentication tags ensure cryptographic integrity.
- Only masked Aadhaar (`XXXX XXXX 1234`) is exposed via `profiles_public`.

### 3. Automated Pure-JS Vector PDF Generation
- **Official Member ID Card**: CR80 landscape dimensions (85.6mm x 53.98mm / 243 x 153 pt) featuring volunteer photo, TNV ID, blood group, role, district, and vector barcode.
- **Appointment Letter**: Executive A4 letterhead with signature and placement credentials.
- **Membership Receipt**: Professional A4 payment voucher with transaction seal.

### 4. Zero Hardcoded Data Guarantee
- Standalone offline mode with in-memory stores.
- Supplying `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` in `.env` activates production Supabase integration with zero code changes.

---

## 🛠️ How to Run & Verify

```bash
# 1. Start the server
node server.js

# 2. Run the Supabase integration readiness check
node test/supabase_integration_check.js
```

---

**Author / Developer ID:** `NITHINSJNDI`  
**Repository:** [https://github.com/nithinrv07/tnv-hub](https://github.com/nithinrv07/tnv-hub)
