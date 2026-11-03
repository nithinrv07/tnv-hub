-- Member management for the admin dashboard: lets the Master Admin block a member
-- (blocked members cannot sign in) and exposes birthday, TNV ID, approval date,
-- membership payment date and block status on admin_queue.
-- Same view as 20261022000100_admin_queue_field_work.sql with columns appended.
alter table profiles add column if not exists blocked boolean not null default false;
alter table profiles add column if not exists blocked_at timestamptz;
alter table profiles add column if not exists blocked_reason text;

CREATE OR REPLACE VIEW admin_queue AS
SELECT
    p.id,
    p.full_name,
    p.username,
    p.email,
    p.phone,
    p.district_id,
    d.name AS district_name,
    p.aadhaar_last4,
    p.status AS application_status,
    p.status,
    p.role,
    p.wing_id,
    w.name AS wing_name,
    p.membership_paid,
    p.created_at,
    p.photo_path,
    p.affiliation,
    p.category,
    p.assembly_constituency,
    p.panchayat,
    p.occupation,
    p.preferred_designation,
    p.wing_to_join,
    p.department,
    p.mode_of_work,
    p.company_area,
    COALESCE(cl.status, CASE WHEN cl.outcome = 'attended' THEN 'Attending' WHEN cl.outcome = 'no_answer' THEN 'No Answer' WHEN cl.outcome = 'scheduled' THEN 'Postponed' ELSE 'Not Called' END) AS call_status,
    cl.created_at AS latest_call_at,
    COALESCE(cl.notes, cl.note) AS latest_call_note,
    cl.admin_id AS latest_caller_id,
    (
        SELECT count(*)
        FROM call_logs
        WHERE profile_id = p.id
    ) AS total_call_attempts,
    cl.callback_at AS latest_callback_at,
    p.blood_group,
    p.pincode,
    p.work_study_status,
    p.organization_name,
    p.employer_name,
    p.past_field_work,
    p.previous_experience,
    p.previous_experience AS previous_works,
    p.dob,
    p.tnv_id,
    v.approved_at,
    pay.paid_at AS membership_paid_at,
    p.blocked,
    p.blocked_at
FROM profiles p
LEFT JOIN districts d ON d.id = p.district_id
LEFT JOIN wings w ON w.id = p.wing_id
LEFT JOIN verifications v ON v.profile_id = p.id
LEFT JOIN LATERAL (
    SELECT max(paid_at) AS paid_at
    FROM payments
    WHERE profile_id = p.id AND status = 'paid'
) pay ON true
LEFT JOIN LATERAL (
    SELECT status, outcome, created_at, notes, note, admin_id, callback_at
    FROM call_logs
    WHERE profile_id = p.id
    ORDER BY created_at DESC
    LIMIT 1
) cl ON true;
