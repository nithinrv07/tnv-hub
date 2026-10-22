-- Expose past field work and the remaining profile details on admin_queue, so the
-- applicant review screen shows what the volunteer entered instead of "Not provided".
-- Same definition as 20261020140200_module_call_logs.sql with new columns appended
-- (CREATE OR REPLACE VIEW only allows adding columns at the end).
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
    p.blood_group,
    p.pincode,
    p.work_study_status,
    p.organization_name,
    p.employer_name,
    p.past_field_work,
    p.previous_experience,
    p.previous_experience AS previous_works
FROM profiles p
LEFT JOIN districts d ON d.id = p.district_id
LEFT JOIN wings w ON w.id = p.wing_id
LEFT JOIN LATERAL (
    SELECT status, outcome, created_at, notes, note, admin_id
    FROM call_logs
    WHERE profile_id = p.id
    ORDER BY created_at DESC
    LIMIT 1
) cl ON true;
