# TNV Hub Portal — Backend & Database System (Phase 1)

---

## 🏗️ Backend & Database Architecture Overview
This `backend` branch contains the complete server-side infrastructure, database migrations, RPC procedures, cryptographic protection, PostgREST bridge, and automated vector PDF generation engines.

### Key Components:
- **`server.js`**: Native Node.js HTTP test & API server (built with native standard libraries, zero external npm package dependencies).
- **`supabase_bridge.js`**: Production Supabase client adapter handling Supabase Auth admin API, PostgREST endpoints, and Database RPCs.
- **`supabase/migrations/`**: 15 SQL migrations configuring relational tables, security policies (RLS), sequences, and views.
- **`supabase/functions/`**: Deno TypeScript Edge Functions (`register`, `record_payment`, `approve_applicant`, shared crypto and PDF utilities).
- **`data/constituencies.js`**: 38 Tamil Nadu districts, assembly constituencies, organizational wings, and department structures.
- **`data/questions_seed.js`**: Standardized bilingual (English + Tamil) leadership interview questions with interviewer hints.
- **`test/`**: Comprehensive automated test suites verifying API workflows, encryption, migrations, scoring, and role assignments.

---

## 🚀 Key Modules & Capabilities

### 1. Database Schema & SQL Migrations
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
12. **`20261020120100_partb_admin_access.sql`**: Master Admin verification queue and RLS policies.
13. **`20261020140100_registration_company_area.sql`**: Company / institution location area column and views.
14. **`20261020140200_module_call_logs.sql`**: Telephone call verification logs (`Attending`, `Not Attending`, `Postponed`, `No Answer`).
15. **`20261020140300_bilingual_questions.sql`**: Standardized bilingual interview questions, active question selection, and score recording.

### 2. Cryptographic Security & Aadhaar Protection
- **AES-256-GCM Encryption**: Plain Aadhaar numbers are never stored in plain text, logged, or sent back over the wire.
- Ciphertext and 16-byte authentication tags ensure cryptographic integrity.
- Only masked Aadhaar (`XXXX XXXX 1234`) is exposed via public endpoints; decryption is strictly restricted to master admins with audit logging.

### 3. Interview Evaluation & Call Logging System
- **Telephone Call Verification**: Supports unlimited call attempts with timestamping, outcome categorization, and scheduled callback tracking.
- **Bilingual Leadership Questions**: 10 selectable active questions with 3-tier scoring (`0`, `0.5`, `1.0`) and optional tie-breaker (+0.5).
- **Auto-Suggested Roles**: 7-tier score-to-role auto-suggestion mapping.

### 4. Registration Validation & Payment Synchronization
- **Strict Password Validation**: Mandatory password and confirm password matching before account creation.
- **PIN Code Enforcement**: Strictly numeric 6-digit PIN code validation.
- **Immediate Receipt Generation**: Auto-incrementing sequence (`TNV-R-YYYY-0001`) with vector PDF generation and instant user dashboard synchronization.

---

## 🛠️ How to Run & Verify

```bash
# 1. Start the server (standard Node.js built-ins)
node server.js

# 2. Run verification test suites
node test/verify_dashboard_payment_and_pincode.test.js
node test/verify_user_3_fixes.test.js
node test/partb_frontend_e2e.test.js
```
