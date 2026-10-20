-- =====================================================================
-- Migration: Module Call Logs Parity
-- Exact 4 Call Statuses from tnv-selection-next:
-- ('Attending', 'Not Attending', 'Postponed', 'No Answer')
-- =====================================================================

-- 1. Modify call_logs table
ALTER TABLE call_logs DROP CONSTRAINT IF EXISTS chk_scheduled_callback;
ALTER TABLE call_logs ALTER COLUMN outcome DROP NOT NULL;

ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS status text CHECK (status IN ('Attending', 'Not Attending', 'Postponed', 'No Answer'));
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS notes text;

-- Sync existing outcome data if any
UPDATE call_logs SET status = 'Attending' WHERE outcome = 'attended' AND status IS NULL;
UPDATE call_logs SET status = 'No Answer' WHERE outcome = 'no_answer' AND status IS NULL;
UPDATE call_logs SET status = 'Postponed' WHERE outcome = 'scheduled' AND status IS NULL;
UPDATE call_logs SET notes = note WHERE notes IS NULL AND note IS NOT NULL;

-- 2. Updated log_call RPC
CREATE OR REPLACE FUNCTION log_call(
    p_profile_id uuid,
    p_status text,
    p_notes text DEFAULT NULL,
    p_callback_at timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_admin_id uuid;
    v_log_id uuid;
    v_created_at timestamptz;
BEGIN
    -- Verify caller is admin
    IF NOT is_admin() AND coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' THEN
        RAISE EXCEPTION 'Access denied: Admin role required to log calls';
    END IF;

    -- Validate status
    IF p_status NOT IN ('Attending', 'Not Attending', 'Postponed', 'No Answer') THEN
        RAISE EXCEPTION 'Invalid status. Must be Attending, Not Attending, Postponed, or No Answer';
    END IF;

    v_admin_id := auth.uid();
    IF v_admin_id IS NULL THEN
        SELECT id INTO v_admin_id FROM profiles WHERE role IN ('master_admin', 'dept_admin') LIMIT 1;
        IF v_admin_id IS NULL THEN
            v_admin_id := p_profile_id;
        END IF;
    END IF;

    INSERT INTO call_logs (
        profile_id,
        admin_id,
        status,
        notes,
        created_at
    ) VALUES (
        p_profile_id,
        v_admin_id,
        p_status,
        p_notes,
        now()
    )
    RETURNING id, created_at INTO v_log_id, v_created_at;

    RETURN jsonb_build_object(
        'success', true,
        'id', v_log_id,
        'profile_id', p_profile_id,
        'admin_id', v_admin_id,
        'status', p_status,
        'notes', p_notes,
        'created_at', v_created_at
    );
END;
$$;

GRANT EXECUTE ON FUNCTION log_call(uuid, text, text, timestamptz) TO authenticated, service_role;

-- 3. Update admin_queue view with module call statuses
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
    ) AS total_call_attempts
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
