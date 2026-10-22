-- =====================================================================
-- TNV Hub Portal - Phase 1 Backend & Database Migration
-- Step 3: Registration Dropdown Options RPC
-- Clean English options: No Hindi text, No fee/money mentions
-- =====================================================================

create or replace function get_registration_options()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
    select jsonb_build_object(
        'categories', jsonb_build_array(
            'General',
            'OBC',
            'SC',
            'ST',
            'Minority'
        ),
        'blood_groups', jsonb_build_array(
            'A+',
            'A-',
            'B+',
            'B-',
            'AB+',
            'AB-',
            'O+',
            'O-'
        ),
        'genders', jsonb_build_array(
            'Male',
            'Female',
            'Other'
        ),
        'marital_statuses', jsonb_build_array(
            'Single',
            'Married',
            'Divorced',
            'Widowed'
        ),
        'occupations', jsonb_build_array(
            'Student',
            'Government Employee',
            'Private Employee',
            'Business Owner / Entrepreneur',
            'Farmer',
            'Homemaker',
            'Daily Wage Worker',
            'Self-Employed',
            'Unemployed',
            'Retired',
            'Teacher / Professor',
            'Doctor / Healthcare Worker',
            'Engineer / IT Professional',
            'Social Worker / NGO Worker',
            'Police / Armed Forces',
            'Artist / Creative Professional',
            'Driver / Transport Worker',
            'Labourer',
            'Other'
        ),
        'designations', jsonb_build_array(
            'Active Member',
            'General Member',
            'Event Coordinator',
            'Social Worker',
            'District Coordinator',
            'Block Coordinator',
            'District President',
            'Branch Manager',
            'HR Manager',
            'Member',
            'Volunteer'
        )
    );
$$;

-- Grant execution to anyone loading the registration page
grant execute on function get_registration_options() to anon, authenticated, service_role;
