-- =====================================================================
-- TNV Hub Portal - Phase 1 Backend & Database Migration
-- Step 4: Payments Table, Receipt Sequence, and Functions
-- Spec: TNV_Hub_Backend_Database_Spec (1).pdf (Sections 4.1, 4.4, 6.2, 10, 12)
-- Journey: TNV_End_to_End_Journey.pdf (Part A, Step 4)
-- =====================================================================

-- 1. Create receipt number sequence
create sequence if not exists receipt_no_seq start with 1 increment by 1;

-- 2. Helper function to generate standardized receipt number
-- Format: TNV-R-<year>-<running_number> (e.g. TNV-R-2026-0001)
create or replace function generate_receipt_no()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
    current_year text;
    seq_val bigint;
begin
    current_year := to_char(now(), 'YYYY');
    seq_val := nextval('receipt_no_seq');
    return 'TNV-R-' || current_year || '-' || lpad(seq_val::text, 4, '0');
end;
$$;

-- 3. Create payments table
create table if not exists payments (
    id uuid primary key default gen_random_uuid(),
    profile_id uuid not null references profiles(id) on delete cascade,
    amount_inr int not null check (amount_inr = 365),
    status pay_status not null,
    gateway_ref text,
    receipt_no text unique,
    paid_at timestamptz default now()
);

-- 4. Enable Row Level Security (RLS) on payments
alter table payments enable row level security;

-- 5. Payments RLS Policies
-- Owner reads own payment records
drop policy if exists "Users can view own payments" on payments;
create policy "Users can view own payments"
    on payments
    for select
    using (auth.uid() = profile_id);

-- Admins read all payments
drop policy if exists "Admins can view all payments" on payments;
create policy "Admins can view all payments"
    on payments
    for select
    using (is_admin());

-- Notice: No public insert or update policy on payments.
-- Only the Edge Function (service_role) writes to payments.

-- 6. Grant execute on receipt generator to service_role and postgres
grant execute on function generate_receipt_no() to service_role, postgres;
