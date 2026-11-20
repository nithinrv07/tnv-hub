-- 20261103000001_certificates.sql
-- Dedicated tables for Event Certificate Templates & Distribution

create table if not exists certificate_templates (
    id text primary key,
    event_id text not null unique references events(id) on delete cascade,
    image_url text not null,
    name_position jsonb not null default '{"x": 50, "y": 50, "fontSize": 36, "color": "#1E4620"}'::jsonb,
    qr_position jsonb not null default '{"x": 50, "y": 80, "size": 120}'::jsonb,
    status text not null default 'DRAFT' check (status in ('DRAFT', 'PUBLISHED')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    published_at timestamptz
);

create index if not exists idx_cert_templates_event on certificate_templates(event_id);
create index if not exists idx_cert_templates_status on certificate_templates(status);

alter table certificate_templates enable row level security;

-- Policies:
drop policy if exists "Admins can manage all certificate templates" on certificate_templates;
create policy "Admins can manage all certificate templates"
    on certificate_templates
    for all
    using (is_admin() or coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role')
    with check (is_admin() or coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role');

drop policy if exists "Volunteers can view published certificate templates" on certificate_templates;
create policy "Volunteers can view published certificate templates"
    on certificate_templates
    for select
    using (status = 'PUBLISHED' or is_admin() or coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role');
