-- =====================================================================
-- TNV Hub Portal - Phase 1 Backend & Database Migration
-- Part B: Steps 8 & 9 / Task T6 - Call Logs, log_call RPC, admin_queue & admin_followups
-- Spec: TNV_Hub_Backend_Database_Spec (1).pdf (Sections 4.2, 4.4, 5, 7, 10)
-- Journey: TNV_End_to_End_Journey.pdf (Part B, Steps 8 & 9)
-- =====================================================================

-- 1. Create call_logs table
create table if not exists call_logs (
    id uuid primary key default gen_random_uuid(),
    profile_id uuid not null references profiles(id) on delete cascade,
    admin_id uuid not null references profiles(id) on delete cascade,
    outcome call_outcome not null,
    callback_at timestamptz,
    note text,
    created_at timestamptz not null default now(),
    -- Constraint: callback_at is required when outcome is scheduled
    constraint chk_scheduled_callback check (
        outcome <> 'scheduled' or callback_at is not null
    )
);

-- Index for fast lookup of applicant call history
create index if not exists idx_call_logs_profile_id on call_logs (profile_id, created_at desc);

-- 2. Enable Row-Level Security on call_logs
alter table call_logs enable row level security;

-- Admins only policy (applicants get zero access)
drop policy if exists "Admins can view call logs" on call_logs;
create policy "Admins can view call logs"
    on call_logs
    for select
    using (is_admin());

drop policy if exists "Admins can insert call logs" on call_logs;
create policy "Admins can insert call logs"
    on call_logs
    for insert
    with check (is_admin() or coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role');

-- 3. RPC: log_call(profile_id, outcome, callback_at, note)
-- Caller: Admin (checked inside the function)
-- Rule: Scheduled requires callback_at; unlimited attempts allowed per applicant.
create or replace function log_call(
    profile_id uuid,
    outcome call_outcome,
    callback_at timestamptz default null,
    note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_admin_id uuid;
    v_log_id uuid;
    v_created_at timestamptz;
begin
    -- 1. Verify caller is an admin
    if not is_admin() and coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' then
        raise exception 'Access denied: Admin role required to log calls';
    end if;

    -- 2. Identify acting admin
    v_admin_id := auth.uid();
    if v_admin_id is null then
        -- If called by service role or system without jwt, fallback to finding a master_admin or the profile itself
        select id into v_admin_id from profiles where role = 'master_admin' limit 1;
        if v_admin_id is null then
            v_admin_id := profile_id;
        end if;
    end if;

    -- 3. Check applicant profile exists
    if not exists (select 1 from profiles where id = profile_id) then
        raise exception 'Applicant profile % does not exist', profile_id;
    end if;

    -- 4. Check business rule: outcome 'scheduled' requires callback_at
    if outcome = 'scheduled' and callback_at is null then
        raise exception 'callback_at is required when outcome is scheduled';
    end if;

    -- 5. Insert call log entry
    insert into call_logs (
        profile_id,
        admin_id,
        outcome,
        callback_at,
        note,
        created_at
    ) values (
        profile_id,
        v_admin_id,
        outcome,
        callback_at,
        note,
        now()
    )
    returning id, created_at into v_log_id, v_created_at;

    return jsonb_build_object(
        'success', true,
        'id', v_log_id,
        'profile_id', profile_id,
        'admin_id', v_admin_id,
        'outcome', outcome,
        'callback_at', callback_at,
        'note', note,
        'created_at', v_created_at
    );
end;
$$;

grant execute on function log_call(uuid, call_outcome, timestamptz, text) to authenticated, service_role;

-- 4. Admin Queue View: admin_queue
-- Includes paid & unpaid applicants, masked Aadhaar, and latest call outcome
create or replace view admin_queue as
select
    p.id,
    p.full_name,
    p.username,
    p.email,
    p.phone,
    p.district_id,
    d.name as district_name,
    p.aadhaar_last4,
    p.status as application_status,
    p.status,
    p.role,
    p.wing_id,
    w.name as wing_name,
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
    coalesce(cl.outcome::text, 'not_called') as call_status,
    cl.callback_at as latest_callback_at,
    cl.created_at as latest_call_at,
    cl.note as latest_call_note,
    cl.admin_id as latest_caller_id,
    (
        select count(*)
        from call_logs
        where profile_id = p.id
    ) as total_call_attempts
from profiles p
left join districts d on d.id = p.district_id
left join wings w on w.id = p.wing_id
left join lateral (
    select outcome, callback_at, created_at, note, admin_id
    from call_logs
    where profile_id = p.id
    order by created_at desc
    limit 1
) cl on true;

comment on view admin_queue is 'Admin review queue with paid & unpaid applicants, masked Aadhaar, and latest call attempt outcome.';

-- 5. Admin Follow-ups View: admin_followups
-- Lists scheduled callbacks that are due and no-answer applicants older than 24 hours
create or replace view admin_followups as
select *
from admin_queue
where status = 'pending'
  and (
      (call_status = 'scheduled' and latest_callback_at <= now())
      or
      (call_status = 'no_answer' and latest_call_at <= now() - interval '24 hours')
  );

comment on view admin_followups is 'Scheduled callbacks that are due and uncontacted applicants past 24 hours.';

