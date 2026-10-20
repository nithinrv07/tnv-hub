-- =====================================================================
-- TNV Hub Portal - Phase 1 Backend & Database Migration
-- Step 1: Reference Table - Districts
-- Spec: TNV_Hub_Backend_Database_Spec (1).pdf (Sections 4.1, 4.2, 5, 13)
-- Journey: TNV_End_to_End_Journey.pdf (Part A, Step 1)
-- =====================================================================

-- 1. Create districts table
create table if not exists districts (
    id serial primary key,
    name text unique not null
);

-- 2. Enable Row-Level Security (RLS)
-- Deny by default, allow public read
alter table districts enable row level security;

-- 3. RLS Policy: Readable by everyone (applicants, visitors, admins)
drop policy if exists "Districts are viewable by everyone" on districts;
create policy "Districts are viewable by everyone"
    on districts
    for select
    using (true);

-- 4. Seed Data: All 38 Tamil Nadu districts
insert into districts (name) values
    ('Ariyalur'),
    ('Chengalpattu'),
    ('Chennai'),
    ('Coimbatore'),
    ('Cuddalore'),
    ('Dharmapuri'),
    ('Dindigul'),
    ('Erode'),
    ('Kallakurichi'),
    ('Kanchipuram'),
    ('Kanyakumari'),
    ('Karur'),
    ('Krishnagiri'),
    ('Madurai'),
    ('Mayiladuthurai'),
    ('Nagapattinam'),
    ('Namakkal'),
    ('Nilgiris'),
    ('Perambalur'),
    ('Pudukkottai'),
    ('Ramanathapuram'),
    ('Ranipet'),
    ('Salem'),
    ('Sivaganga'),
    ('Tenkasi'),
    ('Thanjavur'),
    ('Theni'),
    ('Thoothukudi'),
    ('Tiruchirappalli'),
    ('Tirunelveli'),
    ('Tirupathur'),
    ('Tiruppur'),
    ('Tiruvallur'),
    ('Tiruvannamalai'),
    ('Tiruvarur'),
    ('Vellore'),
    ('Viluppuram'),
    ('Virudhunagar')
on conflict (name) do nothing;
