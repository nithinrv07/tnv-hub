-- Members who live outside India register with an international phone number
-- (+ country code) and a passport instead of Aadhaar. The passport number is
-- stored encrypted in aadhaar_enc, and the member's extras record id_type.
-- Run this once in the Supabase SQL editor before accepting overseas members.

alter table profiles drop constraint if exists profiles_phone_check;
alter table profiles
  add constraint profiles_phone_check
  check (phone ~ '^([6-9][0-9]{9}|\+[1-9][0-9]{6,14})$');
