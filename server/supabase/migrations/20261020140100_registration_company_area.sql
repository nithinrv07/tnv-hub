-- Migration: Add company_area column to profiles and update views
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS company_area text;

-- Make blood_group column standard text
ALTER TABLE profiles ALTER COLUMN blood_group DROP DEFAULT;

-- Update profiles_public view to include company_area
DROP VIEW IF EXISTS profiles_public CASCADE;
CREATE OR REPLACE VIEW profiles_public AS
SELECT 
  p.id,
  p.full_name,
  p.username,
  p.email,
  p.phone,
  p.district_id,
  d.name as district_name,
  p.assembly_constituency,
  p.panchayat,
  p.category,
  p.affiliation,
  p.organization_name,
  p.work_study_status,
  p.employer_name,
  p.company_area,
  p.occupation,
  p.blood_group,
  p.status,
  p.role,
  w.name as wing_name,
  p.wing_to_join,
  p.department,
  p.mode_of_work,
  p.previous_experience,
  p.past_field_work,
  p.membership_paid,
  p.tnv_id,
  p.photo_path,
  p.aadhaar_last4,
  p.created_at
FROM profiles p
LEFT JOIN districts d ON d.id = p.district_id
LEFT JOIN wings w ON w.id = p.wing_id;
