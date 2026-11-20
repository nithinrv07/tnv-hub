-- 20261102000001_tasks_and_events.sql
-- Dedicated tables for Tasks, Events, and Event Registrations

-- 1. Tasks
create table if not exists tasks (
    id text primary key,
    title text not null,
    description text not null,
    priority text not null check (priority in ('LOW', 'MEDIUM', 'HIGH')),
    deadline timestamptz not null,
    status text not null default 'TODO' check (status in ('TODO', 'IN_PROGRESS', 'COMPLETED')),
    creator_id uuid references auth.users(id) on delete set null,
    creator_name text,
    creator_role text,
    assignee_id uuid references auth.users(id) on delete cascade,
    assignee_name text,
    assignee_district text,
    assignee_wing text,
    assignee_email text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    completed_at timestamptz
);

create index if not exists idx_tasks_assignee_id on tasks(assignee_id);
create index if not exists idx_tasks_creator_id on tasks(creator_id);
create index if not exists idx_tasks_status on tasks(status);

alter table tasks enable row level security;

drop policy if exists "Admins have full access to tasks" on tasks;
create policy "Admins have full access to tasks"
    on tasks
    for all
    using (is_admin() or coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role')
    with check (is_admin() or coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role');

drop policy if exists "Volunteers can view their assigned tasks" on tasks;
create policy "Volunteers can view their assigned tasks"
    on tasks
    for select
    using (auth.uid() = assignee_id);

drop policy if exists "Volunteers can update status of their assigned tasks" on tasks;
create policy "Volunteers can update status of their assigned tasks"
    on tasks
    for update
    using (auth.uid() = assignee_id)
    with check (auth.uid() = assignee_id);

-- 2. Events
create table if not exists events (
    id text primary key,
    title text not null,
    description text not null,
    district text,
    venue text not null,
    wing text,
    start_date date not null,
    end_date date not null,
    start_time text not null,
    end_time text not null,
    capacity integer not null default 100 check (capacity > 0),
    status text not null default 'Draft' check (status in ('Draft', 'Published', 'Ongoing', 'Completed', 'Cancelled')),
    organizer_name text,
    organizer_contact text,
    banner_url text,
    tags text[] default '{}',
    registered_count integer not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_events_status on events(status);
create index if not exists idx_events_start_date on events(start_date);
create index if not exists idx_events_district on events(district);

alter table events enable row level security;

drop policy if exists "Anyone can view published or ongoing events" on events;
create policy "Anyone can view published or ongoing events"
    on events
    for select
    using (status in ('Published', 'Ongoing') or is_admin() or coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role');

drop policy if exists "Admins have full write access to events" on events;
create policy "Admins have full write access to events"
    on events
    for all
    using (is_admin() or coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role')
    with check (is_admin() or coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role');

-- 3. Event Registrations
create table if not exists event_registrations (
    id text primary key,
    event_id text not null references events(id) on delete cascade,
    user_id uuid references auth.users(id) on delete cascade,
    volunteer_name text,
    volunteer_email text,
    volunteer_phone text,
    district text,
    wing text,
    status text not null default 'REGISTERED' check (status in ('REGISTERED', 'ATTENDED', 'CANCELLED')),
    registered_at timestamptz not null default now(),
    constraint unique_event_volunteer unique (event_id, user_id)
);

create index if not exists idx_event_reg_event on event_registrations(event_id);
create index if not exists idx_event_reg_user on event_registrations(user_id);

alter table event_registrations enable row level security;

drop policy if exists "Admins can view and manage all event registrations" on event_registrations;
create policy "Admins can view and manage all event registrations"
    on event_registrations
    for all
    using (is_admin() or coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role')
    with check (is_admin() or coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role');

drop policy if exists "Volunteers can view their own registrations" on event_registrations;
create policy "Volunteers can view their own registrations"
    on event_registrations
    for select
    using (auth.uid() = user_id);

drop policy if exists "Volunteers can register themselves for events" on event_registrations;
create policy "Volunteers can register themselves for events"
    on event_registrations
    for insert
    with check (auth.uid() = user_id);
