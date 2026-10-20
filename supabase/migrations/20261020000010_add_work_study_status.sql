-- Migration 10: Add work_study_status column and update profiles_public view
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS work_study_status text;

CREATE OR REPLACE VIEW profiles_public AS
SELECT 
  id,
  full_name,
  username,
  email,
  phone,
  district_id,
  district_name,
  assembly_constituency,
  panchayat,
  category,
  affiliation,
  work_study_status,
  occupation,
  blood_group,
  status,
  role,
  wing_name,
  wing_to_join,
  department,
  mode_of_work,
  previous_experience,
  past_field_work,
  membership_paid,
  receipt_no,
  tnv_id,
  photo_path,
  aadhaar_last4,
  created_at
FROM profiles;
