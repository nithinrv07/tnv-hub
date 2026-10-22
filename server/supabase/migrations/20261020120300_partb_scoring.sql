-- =====================================================================
-- TNV Hub Portal - Phase 1 Backend & Database Migration
-- Part B: Step 10 / Task T7 - Interview Questions, Scores & save_scores RPC
-- Spec: TNV_Hub_Backend_Database_Spec (1).pdf (Sections 4.2, 4.4, 5, 7, 10)
-- Journey: TNV_End_to_End_Journey.pdf (Part B, Step 10)
-- =====================================================================

-- 1. Create interview_questions table
create table if not exists interview_questions (
    id serial primary key,
    position int not null unique,
    text text not null,
    active boolean not null default true,
    created_at timestamptz not null default now()
);

-- Enable Row Level Security on interview_questions
alter table interview_questions enable row level security;

-- Admin-only policy (applicants cannot read or write questions)
drop policy if exists "Admins can view interview questions" on interview_questions;
create policy "Admins can view interview questions"
    on interview_questions
    for select
    using (is_admin());

drop policy if exists "Admins can manage interview questions" on interview_questions;
create policy "Admins can manage interview questions"
    on interview_questions
    for all
    using (is_admin())
    with check (is_admin());

-- 2. Create interview_scores table
create table if not exists interview_scores (
    profile_id uuid not null references profiles(id) on delete cascade,
    question_id int not null references interview_questions(id) on delete cascade,
    score numeric(3,1) not null,
    note text,
    scored_by uuid references profiles(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    primary key (profile_id, question_id),
    constraint chk_score check (score in (0, 0.5, 1))
);

-- Enable Row Level Security on interview_scores
alter table interview_scores enable row level security;

-- Admin-only policy for scores
drop policy if exists "Admins can view interview scores" on interview_scores;
create policy "Admins can view interview scores"
    on interview_scores
    for select
    using (is_admin());

drop policy if exists "Admins can manage interview scores" on interview_scores;
create policy "Admins can manage interview scores"
    on interview_scores
    for all
    using (is_admin())
    with check (is_admin());

-- 3. RPC: save_scores(p_profile_id, scores)
-- Caller: Admin
-- Contract: Upserts scores for an applicant.
-- Rules: Score must be exactly 0, 0.5, or 1. Question must be active. scored_by is auth.uid().
drop function if exists save_scores(uuid, jsonb);
create or replace function save_scores(
    p_profile_id uuid,
    scores jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_admin_id uuid;
    v_item jsonb;
    v_question_id int;
    v_score numeric(3,1);
    v_note text;
    v_is_active boolean;
    v_total_score numeric(4,1);
    v_scored_count int;
    v_active_count int;
begin
    -- 1. Check caller is an admin
    if not is_admin() and coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' and current_user not in ('postgres', 'supabase_admin') then
        raise exception 'Access denied: Admin role required to record scores';
    end if;

    -- 2. Identify scoring admin
    v_admin_id := auth.uid();
    if v_admin_id is null then
        select id into v_admin_id from profiles where role in ('master_admin', 'dept_admin') limit 1;
        if v_admin_id is null then
            v_admin_id := p_profile_id;
        end if;
    end if;

    -- 3. Check applicant profile exists
    if not exists (select 1 from profiles where id = p_profile_id) then
        raise exception 'Applicant profile % does not exist', p_profile_id;
    end if;

    -- 4. Validate input is a JSON array
    if jsonb_typeof(scores) <> 'array' then
        raise exception 'Scores input must be a JSON array of score objects';
    end if;

    -- 5. Iterate through score objects and validate each
    for v_item in select * from jsonb_array_elements(scores)
    loop
        v_question_id := (v_item->>'question_id')::int;
        if v_question_id is null then
            raise exception 'Each score object must include question_id';
        end if;

        -- Check score value: strictly 0, 0.5, or 1
        begin
            v_score := (v_item->>'score')::numeric(3,1);
        exception when others then
            raise exception 'Invalid score value: %. Score must be 0, 0.5, or 1', (v_item->>'score');
        end;

        if v_score not in (0, 0.5, 1) then
            raise exception 'Score value % is invalid. Score must be strictly 0, 0.5, or 1', v_score;
        end if;

        v_note := v_item->>'note';

        -- Verify question exists and is active
        select active into v_is_active
        from interview_questions
        where id = v_question_id;

        if v_is_active is null then
            raise exception 'Interview question % does not exist', v_question_id;
        end if;

        if not v_is_active then
            raise exception 'Interview question % is inactive and cannot be scored', v_question_id;
        end if;

        -- Upsert score (unambiguous column vs param names)
        insert into interview_scores (
            profile_id,
            question_id,
            score,
            note,
            scored_by,
            updated_at
        ) values (
            p_profile_id,
            v_question_id,
            v_score,
            v_note,
            v_admin_id,
            now()
        )
        on conflict (profile_id, question_id)
        do update set
            score = excluded.score,
            note = excluded.note,
            scored_by = excluded.scored_by,
            updated_at = now();
    end loop;

    -- 6. Compute running totals
    select coalesce(sum(s.score), 0), count(*)
    into v_total_score, v_scored_count
    from interview_scores s
    join interview_questions q on q.id = s.question_id
    where s.profile_id = p_profile_id
      and q.active = true;

    select count(*)
    into v_active_count
    from interview_questions
    where active = true;

    return jsonb_build_object(
        'success', true,
        'profile_id', p_profile_id,
        'total_score', v_total_score,
        'scored_count', v_scored_count,
        'active_questions_count', v_active_count,
        'is_complete', (v_scored_count >= v_active_count and v_active_count > 0)
    );
end;
$$;

grant execute on function save_scores(uuid, jsonb) to authenticated, service_role;

