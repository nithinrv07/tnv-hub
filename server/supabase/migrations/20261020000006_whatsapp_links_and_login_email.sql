-- =====================================================================
-- TNV Hub Portal - Phase 1 Backend & Database Migration
-- Step 5: WhatsApp Links, my_links() RPC, and login_email_for() RPC
-- Spec: TNV_Hub_Backend_Database_Spec (1).pdf (Sections 3.4, 4.4, 5, 7, 8)
-- Journey: TNV_End_to_End_Journey.pdf (Step 5 & Step 6)
-- =====================================================================

-- 1. Create whatsapp_links table
create table if not exists whatsapp_links (
    id serial primary key,
    kind text not null check (kind in ('district', 'wing', 'sector', 'announcements', 'social')),
    district_id int references districts(id),
    wing_id int references wings(id),
    sector_id int references sectors(id),
    label text not null,
    url text not null
);

-- 2. Enable Row Level Security (RLS)
alter table whatsapp_links enable row level security;

-- 3. RLS Policy: Approved users can read links; Pending users get ZERO rows!
drop policy if exists "Approved members can view whatsapp links" on whatsapp_links;
create policy "Approved members can view whatsapp links"
    on whatsapp_links
    for select
    using (
        exists (
            select 1 from profiles
            where id = auth.uid() and status = 'approved'
        )
        or is_admin()
    );

-- 4. RPC: my_links()
-- Rule: Returns zero rows for a pending user!
-- For approved users: returns own district link, wing link, sector links, announcements, social
create or replace function my_links()
returns table (
    id int,
    kind text,
    label text,
    url text
)
language plpgsql
security definer
set search_path = public
as $$
declare
    v_status app_status;
    v_district_id int;
    v_wing_id int;
begin
    -- Look up caller's profile
    select status, district_id, wing_id into v_status, v_district_id, v_wing_id
    from profiles
    where profiles.id = auth.uid();

    -- Strict Rule: If profile is not found or not approved, return ZERO rows
    if v_status is null or v_status <> 'approved' then
        return;
    end if;

    -- Return only appropriate links for this approved member
    return query
    select w.id, w.kind, w.label, w.url
    from whatsapp_links w
    where (w.kind = 'district' and w.district_id = v_district_id)
       or (w.kind = 'wing' and w.wing_id = v_wing_id)
       or (w.kind in ('sector', 'announcements', 'social'))
    order by w.id asc;
end;
$$;

grant execute on function my_links() to authenticated, service_role;

-- 5. RPC: login_email_for(username)
-- Resolves username to email for Supabase Auth sign in.
-- Never reveals error specifics.
create or replace function login_email_for(username text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
    v_email text;
begin
    if username is null or username = '' then
        return null;
    end if;

    select email into v_email
    from profiles
    where lower(profiles.username) = lower(login_email_for.username);

    return v_email;
end;
$$;

grant execute on function login_email_for(text) to anon, authenticated, service_role;

-- 6. Seed sample WhatsApp links (Chennai, Coimbatore, Madurai, Announcements, Social)
insert into whatsapp_links (kind, district_id, wing_id, label, url) values
    ('district', 3, null, 'Chennai District Volunteer WhatsApp Group', 'https://chat.whatsapp.com/mock-tnv-chennai'),
    ('district', 4, null, 'Coimbatore District Volunteer WhatsApp Group', 'https://chat.whatsapp.com/mock-tnv-coimbatore'),
    ('district', 14, null, 'Madurai District Volunteer WhatsApp Group', 'https://chat.whatsapp.com/mock-tnv-madurai'),
    ('announcements', null, null, 'TNV Official Announcements Channel', 'https://chat.whatsapp.com/mock-tnv-announcements'),
    ('social', null, null, 'TNV Social Initiatives Group', 'https://chat.whatsapp.com/mock-tnv-social')
on conflict do nothing;
