-- =====================================================================
-- TNV Hub Portal - Phase 1 Backend & Database Migration
-- Part B: Step 7 / Task T5 - Admin Access, Helper Functions, Audit Log & RLS
-- Spec: TNV_Hub_Backend_Database_Spec (1).pdf (Sections 4.2, 4.4, 4.5, 5, 11)
-- Journey: TNV_End_to_End_Journey.pdf (Part B, Step 7)
-- =====================================================================

-- 1. Helper function: is_admin()
-- Returns true when caller has role master_admin or dept_admin
create or replace function is_admin() 
returns boolean 
language sql 
stable 
security definer 
set search_path = public
as $$
    select exists (
        select 1 from profiles
        where id = auth.uid() and role in ('master_admin', 'dept_admin')
    )
    or coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role'
    or current_user in ('postgres', 'supabase_admin');
$$;

grant execute on function is_admin() to anon, authenticated, service_role;

-- 2. Helper function: is_master_admin()
-- Returns true ONLY when caller has role master_admin (not dept_admin)
create or replace function is_master_admin() 
returns boolean 
language sql 
stable 
security definer 
set search_path = public
as $$
    select exists (
        select 1 from profiles
        where id = auth.uid() and role = 'master_admin'
    )
    or coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role'
    or current_user in ('postgres', 'supabase_admin');
$$;

grant execute on function is_master_admin() to anon, authenticated, service_role;

-- 3. Audit Log table
-- Records sensitive operations: reveal_aadhaar, approvals, role changes
create table if not exists audit_log (
    id uuid primary key default gen_random_uuid(),
    actor uuid references auth.users(id) on delete set null,
    action text not null,
    target uuid,
    detail jsonb default '{}'::jsonb,
    at timestamptz not null default now()
);

-- Enable RLS on audit_log
alter table audit_log enable row level security;

-- Master Admin ONLY can view audit log rows
drop policy if exists "Master Admin can view audit logs" on audit_log;
create policy "Master Admin can view audit logs"
    on audit_log
    for select
    using (is_master_admin());

-- Admins and Service Role can insert audit logs
drop policy if exists "Admins can insert audit logs" on audit_log;
create policy "Admins can insert audit logs"
    on audit_log
    for insert
    with check (is_admin() or coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role');

-- 4. RPC to securely append to audit log
create or replace function record_audit_log(
    p_action text,
    p_target uuid,
    p_detail jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
    v_id uuid;
begin
    if not is_admin() and coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' and current_user not in ('postgres', 'supabase_admin') then
        raise exception 'Access denied: Admin or Service Role required to write audit log';
    end if;

    insert into audit_log (actor, action, target, detail, at)
    values (auth.uid(), p_action, p_target, p_detail, now())
    returning id into v_id;

    return v_id;
end;
$$;

grant execute on function record_audit_log(text, uuid, jsonb) to authenticated, service_role;

-- 5. Standardized profiles_public view with joins
-- Strict Rule: Aadhaar plain/enc is NEVER exposed; only aadhaar_last4 is visible.
drop view if exists profiles_public cascade;
create or replace view profiles_public as
select
    p.id,
    p.username,
    p.full_name,
    p.email,
    p.phone,
    p.dob,
    p.gender,
    p.marital_status,
    p.father_or_husband_name,
    coalesce(p.affiliation, p.category) as affiliation,
    p.category,
    p.organization_name,
    p.work_study_status,
    p.employer_name,
    p.blood_group,
    p.occupation,
    p.address,
    p.pincode,
    p.district_id,
    d.name as district_name,
    p.assembly_constituency,
    p.panchayat,
    p.wing_to_join,
    p.department,
    p.mode_of_work,
    p.previous_experience,
    p.past_field_work,
    p.aadhaar_last4,
    p.preferred_designation,
    p.status,
    p.role,
    p.wing_id,
    w.name as wing_name,
    p.tnv_id,
    p.photo_path,
    p.membership_paid,
    p.created_at
from profiles p
left join districts d on d.id = p.district_id
left join wings w on w.id = p.wing_id;

comment on view profiles_public is 'Public view of volunteer profiles with masked Aadhaar and joined district/wing reference names.';

