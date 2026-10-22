-- =====================================================================
-- TNV Hub Portal - Phase 1 Backend & Database Migration
-- Step 12: Part C - Dashboard Unlocks & TNV ID Generator
-- Spec: TNV_Hub_Backend_Database_Spec (1).pdf (Sections 4.3, 6.3, 10, 12)
-- Journey: TNV_End_to_End_Journey.pdf (Part C, Steps 12-15)
-- =====================================================================

-- 1. Create running sequence for TNV Member ID
create sequence if not exists tnv_id_seq start with 1 increment by 1;

-- 2. Function to generate TNV Member ID (Placeholder format: TNV-<district_code>-<running_number>)
create or replace function generate_tnv_id(p_district_id int)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
    v_district_name text;
    v_district_code text;
    v_seq bigint;
begin
    -- Look up district name
    select name into v_district_name
    from districts
    where id = p_district_id;

    if v_district_name is null then
        v_district_code := 'TN';
    else
        v_district_code := upper(substring(v_district_name from 1 for 3));
    end if;

    v_seq := nextval('tnv_id_seq');
    return 'TNV-' || v_district_code || '-' || lpad(v_seq::text, 4, '0');
end;
$$;

grant execute on function generate_tnv_id(int) to service_role, postgres;

-- 3. Edge / RPC Helper: approve_applicant_record
-- Atomically transitions profile status to 'approved', sets role, generates TNV ID, and assigns wing
create or replace function approve_applicant_record(
    p_profile_id uuid,
    p_role app_role default 'volunteer',
    p_wing_id int default 1
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_district_id int;
    v_tnv_id text;
    v_full_name text;
    v_username text;
begin
    -- Verify profile exists
    select district_id, full_name, username
    into v_district_id, v_full_name, v_username
    from profiles
    where id = p_profile_id;

    if v_district_id is null then
        raise exception 'Profile % not found', p_profile_id;
    end if;

    -- Generate official TNV ID
    v_tnv_id := generate_tnv_id(v_district_id);

    -- Update profile atomically (using service_role privileges)
    update profiles
    set status = 'approved',
        role = p_role,
        wing_id = p_wing_id,
        tnv_id = v_tnv_id
    where id = p_profile_id;

    return jsonb_build_object(
        'profile_id', p_profile_id,
        'status', 'approved',
        'role', p_role,
        'tnv_id', v_tnv_id,
        'full_name', v_full_name,
        'username', v_username
    );
end;
$$;

grant execute on function approve_applicant_record(uuid, app_role, int) to service_role, postgres;
