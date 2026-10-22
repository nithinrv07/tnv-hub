-- =====================================================================
-- TNV Hub Portal - Phase 1 Backend & Database Migration
-- Step 8: Strict Email Uniqueness & email_available RPC
-- Requirement: Only one account can be created per email address.
-- =====================================================================

-- 1. Ensure unique index on lower(email) in profiles table
create unique index if not exists idx_profiles_lower_email_unique 
on profiles (lower(trim(email)));

-- 2. Create email_available(e text) RPC
-- Caller: Anonymous (during registration) / Authenticated
-- Contract: Returns true only if email is valid in format and not taken by any account
create or replace function email_available(e text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
    clean_email text;
begin
    -- 1. Sanitize input
    if e is null then
        return false;
    end if;
    
    clean_email := lower(trim(e));

    -- 2. Format validation regex (standard RFC 5322 compliant pattern)
    if clean_email !~ '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$' then
        return false;
    end if;

    -- 3. Check if email is already registered in profiles
    return not exists (
        select 1
        from profiles
        where lower(trim(email)) = clean_email
    );
end;
$$;

-- Grant execution permissions
grant execute on function email_available(text) to anon, authenticated, service_role;

comment on function email_available(text) is 'Validates email format and ensures only one account can be created per email address.';
