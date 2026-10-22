-- =====================================================================
-- TNV Hub Portal - Phase 1 Backend & Database Migration
-- Part B: Step 11 / Task T8 - Verifications, reveal_aadhaar RPC, and Atomic approve_applicant_tx RPC
-- Spec: TNV_Hub_Backend_Database_Spec (1).pdf (Sections 4.2, 4.4, 5, 6.3, 7, 10, 12)
-- Journey: TNV_End_to_End_Journey.pdf (Part B, Step 11)
-- =====================================================================

-- 1. Create verifications table
create table if not exists verifications (
    profile_id uuid primary key references profiles(id) on delete cascade,
    total_score numeric(4,1) not null,
    recommended_role app_role not null,
    approved_by uuid not null references profiles(id),
    approved_at timestamptz not null default now()
);

-- Enable Row Level Security on verifications
alter table verifications enable row level security;

-- Admins can view verifications
drop policy if exists "Admins can view verifications" on verifications;
create policy "Admins can view verifications"
    on verifications
    for select
    using (is_admin());

-- Admins & Service role can insert/update verifications
drop policy if exists "Admins and service role can insert verifications" on verifications;
create policy "Admins and service role can insert verifications"
    on verifications
    for all
    using (is_admin() or coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role')
    with check (is_admin() or coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role');

-- 2. RPC: reveal_aadhaar(id)
-- Caller: Master Admin ONLY (checked inside function; dept_admin is REFUSED)
-- Contract: Writes audit_log in the same transaction, returns aadhaar data.
create or replace function reveal_aadhaar(id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_actor uuid;
    v_enc text;
    v_last4 text;
    v_full_name text;
begin
    -- 1. Master Admin verification (Strict: dept_admin and regular users cannot reveal)
    if not is_master_admin() and coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' then
        raise exception 'Access denied: Master Admin role strictly required to reveal Aadhaar';
    end if;

    -- 2. Fetch applicant Aadhaar data
    select aadhaar_enc, aadhaar_last4, full_name
    into v_enc, v_last4, v_full_name
    from profiles
    where profiles.id = reveal_aadhaar.id;

    if v_enc is null then
        raise exception 'Profile % not found', reveal_aadhaar.id;
    end if;

    -- 3. Actor identification
    v_actor := auth.uid();
    if v_actor is null then
        select p.id into v_actor from profiles p where p.role = 'master_admin' limit 1;
        if v_actor is null then
            v_actor := reveal_aadhaar.id;
        end if;
    end if;

    -- 4. Mandatory Audit Log entry (in the exact same atomic transaction)
    insert into audit_log (
        actor,
        action,
        target,
        detail,
        at
    ) values (
        v_actor,
        'reveal_aadhaar',
        reveal_aadhaar.id,
        jsonb_build_object(
            'target_name', v_full_name,
            'aadhaar_last4', v_last4,
            'revealed_at', now()
        ),
        now()
    );

    return jsonb_build_object(
        'success', true,
        'profile_id', reveal_aadhaar.id,
        'full_name', v_full_name,
        'aadhaar_enc', v_enc,
        'aadhaar_last4', v_last4
    );
end;
$$;

grant execute on function reveal_aadhaar(uuid) to authenticated, service_role;

-- 3. Atomic Database Transaction RPC: approve_applicant_tx
-- Called by Edge Function approve_applicant or Admin UI
-- Atomic Steps:
--   1. Check caller is admin (master_admin or dept_admin)
--   2. Check applicant exists and status is 'pending' (refuses already approved)
--   3. Verify EVERY active question in interview_questions has a recorded score
--   4. Calculate total score
--   5. Generate official TNV ID from sequence
--   6. Update profile: status='approved', role=p_role, wing_id, tnv_id
--   7. Upsert verifications row
--   8. Insert audit_log row
create or replace function approve_applicant_tx(
    p_profile_id uuid,
    p_role app_role,
    p_wing_id int default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_admin_id uuid;
    v_status app_status;
    v_district_id int;
    v_full_name text;
    v_username text;
    v_email text;
    v_missing_questions int[];
    v_total_score numeric(4,1);
    v_scored_count int;
    v_active_count int;
    v_tnv_id text;
    v_final_wing_id int;
begin
    -- 1. Verify caller is an admin
    if not is_admin() and coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' then
        raise exception 'Access denied: Admin role required to approve applicants';
    end if;

    v_admin_id := auth.uid();
    if v_admin_id is null then
        select id into v_admin_id from profiles where role in ('master_admin', 'dept_admin') limit 1;
        if v_admin_id is null then
            v_admin_id := p_profile_id;
        end if;
    end if;

    -- 2. Fetch applicant profile & verify pending status
    select status, district_id, full_name, username, email, wing_id
    into v_status, v_district_id, v_full_name, v_username, v_email, v_final_wing_id
    from profiles
    where id = p_profile_id;

    if v_district_id is null then
        raise exception 'Profile % not found', p_profile_id;
    end if;

    if v_status <> 'pending' then
        raise exception 'Applicant cannot be approved: current status is "%" (only pending applicants can be approved)', v_status;
    end if;

    -- 3. Verify ALL active interview questions are scored
    select coalesce(array_agg(q.id order by q.position), array[]::int[])
    into v_missing_questions
    from interview_questions q
    where q.active = true
      and not exists (
          select 1
          from interview_scores s
          where s.profile_id = p_profile_id
            and s.question_id = q.id
      );

    if array_length(v_missing_questions, 1) > 0 then
        raise exception 'Scoring incomplete: applicant is missing scores for question ID(s): %', array_to_string(v_missing_questions, ', ');
    end if;

    -- 4. Calculate total score and counts
    select coalesce(sum(s.score), 0), count(*)
    into v_total_score, v_scored_count
    from interview_scores s
    join interview_questions q on q.id = s.question_id
    where s.profile_id = p_profile_id
      and q.active = true;

    select count(*)
    into v_active_count
    from interview_questions
    where active = true;

    -- 5. Generate official TNV ID
    v_tnv_id := generate_tnv_id(v_district_id);

    -- Decide final wing
    if p_wing_id is not null then
        v_final_wing_id := p_wing_id;
    elsif v_final_wing_id is null then
        v_final_wing_id := 1; -- default to Administration
    end if;

    -- 6. Update profile in single transaction
    update profiles
    set status = 'approved',
        role = p_role,
        wing_id = v_final_wing_id,
        tnv_id = v_tnv_id
    where id = p_profile_id;

    -- 7. Upsert verifications record
    insert into verifications (
        profile_id,
        total_score,
        recommended_role,
        approved_by,
        approved_at
    ) values (
        p_profile_id,
        v_total_score,
        p_role,
        v_admin_id,
        now()
    )
    on conflict (profile_id)
    do update set
        total_score = excluded.total_score,
        recommended_role = excluded.recommended_role,
        approved_by = excluded.approved_by,
        approved_at = excluded.approved_at;

    -- 8. Record in audit_log
    insert into audit_log (
        actor,
        action,
        target,
        detail,
        at
    ) values (
        v_admin_id,
        'approve_applicant',
        p_profile_id,
        jsonb_build_object(
            'total_score', v_total_score,
            'role', p_role,
            'wing_id', v_final_wing_id,
            'tnv_id', v_tnv_id,
            'questions_scored', v_scored_count
        ),
        now()
    );

    return jsonb_build_object(
        'success', true,
        'profile_id', p_profile_id,
        'status', 'approved',
        'role', p_role,
        'wing_id', v_final_wing_id,
        'tnv_id', v_tnv_id,
        'total_score', v_total_score,
        'full_name', v_full_name,
        'username', v_username,
        'email', v_email,
        'approved_by', v_admin_id,
        'approved_at', now()
    );
end;
$$;

grant execute on function approve_applicant_tx(uuid, app_role, int) to authenticated, service_role;

