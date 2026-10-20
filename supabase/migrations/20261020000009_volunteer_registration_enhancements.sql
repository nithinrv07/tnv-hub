-- =====================================================================
-- TNV Hub Portal - Phase 1 Backend & Database Migration
-- Step 9: Volunteer Registration Enhancements
-- 1) Affiliation / Category dropdown options
-- 2) Profession / Designation free-text
-- 3) Previous Works / Experience (5-150 words or Nil)
-- 4) Assembly Constituencies per District & Panchayat
-- 5) Past Field Work categorized selections (text array)
-- 6) Wing to Join & Department
-- 7) Mode of Work (Online, Field, Both)
-- =====================================================================

-- 1. Add new columns to profiles table
alter table profiles
    add column if not exists affiliation text,
    add column if not exists assembly_constituency text,
    add column if not exists panchayat text,
    add column if not exists previous_experience text,
    add column if not exists past_field_work text[],
    add column if not exists wing_to_join text,
    add column if not exists department text,
    add column if not exists mode_of_work text;

-- 2. Update profiles_public view with new columns
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
    p.blood_group,
    p.occupation,
    p.address,
    p.pincode,
    p.district_id,
    d.name as district_name,
    p.assembly_constituency,
    p.panchayat,
    p.previous_experience,
    p.past_field_work,
    p.wing_to_join,
    p.department,
    p.mode_of_work,
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

comment on view profiles_public is 'Public view of volunteer profiles with full registration details, jurisdiction, and placement data.';
