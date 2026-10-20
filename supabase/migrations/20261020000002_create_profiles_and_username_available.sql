-- =====================================================================
-- TNV Hub Portal - Phase 1 Backend & Database Migration
-- Step 2: Types, Profiles Table, and username_available RPC
-- Spec: TNV_Hub_Backend_Database_Spec (1).pdf (Sections 4.1, 4.3, 4.5, 5, 7)
-- Journey: TNV_End_to_End_Journey.pdf (Part A, Step 2)
-- =====================================================================

-- 1. Create custom enums if they do not exist
do $$
begin
    if not exists (select 1 from pg_type where typname = 'app_status') then
        create type app_status as enum ('pending', 'approved');
    end if;
    if not exists (select 1 from pg_type where typname = 'app_role') then
        create type app_role as enum ('volunteer', 'district_coordinator', 'wing_lead', 'dept_admin', 'master_admin');
    end if;
    if not exists (select 1 from pg_type where typname = 'call_outcome') then
        create type call_outcome as enum ('no_answer', 'scheduled', 'attended');
    end if;
    if not exists (select 1 from pg_type where typname = 'pay_status') then
        create type pay_status as enum ('paid', 'failed');
    end if;
end $$;

-- 2. Reference tables: wings and sectors
create table if not exists wings (
    id serial primary key,
    name text unique not null
);

create table if not exists sectors (
    id serial primary key,
    name text unique not null
);

-- Seed basic wings if empty
insert into wings (name) values ('Administration'), ('Online')
on conflict (name) do nothing;

-- Enable RLS on reference tables
alter table wings enable row level security;
alter table sectors enable row level security;

drop policy if exists "Wings are viewable by everyone" on wings;
create policy "Wings are viewable by everyone" on wings for select using (true);

drop policy if exists "Sectors are viewable by everyone" on sectors;
create policy "Sectors are viewable by everyone" on sectors for select using (true);

-- 3. Profiles table
create table if not exists profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    username text unique not null check (username ~ '^[A-Za-z0-9_]{4,20}$'),
    full_name text not null,
    email text not null,
    phone text not null check (phone ~ '^[6-9][0-9]{9}$'),
    address text,
    district_id int references districts(id) not null,
    aadhaar_enc text not null, -- encrypted; never selected by client code
    aadhaar_last4 char(4) not null, -- for masked display
    status app_status not null default 'pending',
    role app_role, -- null until verified
    wing_id int references wings(id),
    tnv_id text unique, -- generated on approval
    photo_path text,
    membership_paid boolean not null default false,
    created_at timestamptz not null default now()
);

-- 4. Enable RLS on profiles
alter table profiles enable row level security;

-- 5. Helper function is_admin()
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
    );
$$;

-- 6. Profiles RLS Policies
-- Applicant reads own row
drop policy if exists "Users can view own profile" on profiles;
create policy "Users can view own profile"
    on profiles
    for select
    using (auth.uid() = id);

-- Admins read all profiles
drop policy if exists "Admins can view all profiles" on profiles;
create policy "Admins can view all profiles"
    on profiles
    for select
    using (is_admin());

-- Applicant can update only personal fields (name, phone, address, photo_path)
-- Note: status, role, tnv_id, membership_paid, aadhaar protected by trigger/service key
drop policy if exists "Users can update own profile personal fields" on profiles;
create policy "Users can update own profile personal fields"
    on profiles
    for update
    using (auth.uid() = id)
    with check (auth.uid() = id);

-- Admins can update profiles
drop policy if exists "Admins can update profiles" on profiles;
create policy "Admins can update profiles"
    on profiles
    for update
    using (is_admin())
    with check (is_admin());

-- 7. Trigger to protect sensitive columns from applicant self-updates
create or replace function protect_profile_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    caller_role text;
begin
    -- Check if caller is using service role (bypass)
    caller_role := coalesce(current_setting('request.jwt.claim.role', true), '');
    if caller_role = 'service_role' then
        return new;
    end if;

    -- If not service role, check if admin
    if not is_admin() then
        -- Normal applicants CANNOT change status, role, tnv_id, wing_id, membership_paid, or Aadhaar columns
        if new.status is distinct from old.status then
            raise exception 'Applicants cannot update status';
        end if;
        if new.role is distinct from old.role then
            raise exception 'Applicants cannot update role';
        end if;
        if new.tnv_id is distinct from old.tnv_id then
            raise exception 'Applicants cannot update tnv_id';
        end if;
        if new.wing_id is distinct from old.wing_id then
            raise exception 'Applicants cannot update wing_id';
        end if;
        if new.membership_paid is distinct from old.membership_paid then
            raise exception 'Applicants cannot update membership_paid';
        end if;
        if new.aadhaar_enc is distinct from old.aadhaar_enc or new.aadhaar_last4 is distinct from old.aadhaar_last4 then
            raise exception 'Aadhaar columns cannot be modified by user';
        end if;
    end if;

    return new;
end;
$$;

drop trigger if exists trg_protect_profile_columns on profiles;
create trigger trg_protect_profile_columns
    before update on profiles
    for each row
    execute function protect_profile_columns();

-- 8. Public view: profiles_public (excludes aadhaar_enc)
create or replace view profiles_public as
select
    p.id,
    p.username,
    p.full_name,
    p.email,
    p.phone,
    p.address,
    p.district_id,
    d.name as district_name,
    p.aadhaar_last4,
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

-- 9. STEP 2 RPC: username_available(u)
-- Caller: Anonymous / Anyone
-- Contract: Returns true if the username is free; returns only a boolean.
-- Validation: Format check: 4 to 20 letters, digits or underscore.
create or replace function username_available(u text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
    -- 1. Check format first: 4 to 20 chars, letters, digits, underscore
    if u is null or u !~ '^[A-Za-z0-9_]{4,20}$' then
        return false;
    end if;

    -- 2. Check if username is already taken in profiles (case-insensitive)
    return not exists (
        select 1
        from profiles
        where lower(username) = lower(u)
    );
end;
$$;

-- Grant execution permission to anonymous and authenticated users
grant execute on function username_available(text) to anon, authenticated, service_role;
