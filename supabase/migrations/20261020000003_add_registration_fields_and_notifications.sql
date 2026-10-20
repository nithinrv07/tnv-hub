-- =====================================================================
-- TNV Hub Portal - Phase 1 Backend & Database Migration
-- Step 3: Supplementary Profile Columns & Notifications Table
-- Spec: TNV_Hub_Backend_Database_Spec (1).pdf (Sections 4.3, 4.4, 6.1)
-- Journey: TNV_End_to_End_Journey.pdf (Part A, Step 3)
-- Forms: Personal, Demographic, Professional, Residential Address
-- =====================================================================

-- 1. Create notifications table if not exists
create table if not exists notifications (
    id uuid primary key default gen_random_uuid(),
    kind text not null,
    profile_id uuid references profiles(id) on delete cascade,
    read boolean default false,
    created_at timestamptz default now()
);

-- Enable RLS on notifications
alter table notifications enable row level security;

-- Admin-only policy for notifications (applicants get no access)
drop policy if exists "Admins can view and manage notifications" on notifications;
create policy "Admins can view and manage notifications"
    on notifications
    for all
    using (is_admin())
    with check (is_admin());

-- 2. Add supplementary fields from registration form images to profiles
alter table profiles
    add column if not exists dob text,
    add column if not exists gender text,
    add column if not exists marital_status text,
    add column if not exists father_or_husband_name text,
    add column if not exists category text,
    add column if not exists blood_group text,
    add column if not exists occupation text,
    add column if not exists pincode text check (pincode is null or pincode ~ '^[0-9]{6}$'),
    add column if not exists preferred_designation text;

-- 3. Update profiles_public view to include supplementary fields (Aadhaar full number remains excluded)
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
    p.category,
    p.blood_group,
    p.occupation,
    p.address,
    p.pincode,
    p.district_id,
    d.name as district_name,
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
