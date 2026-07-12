-- =============================================================================
-- Migration: Payment Methods
-- Run this in the Supabase SQL Editor (Dashboard -> SQL Editor -> New query).
-- Idempotent: safe to run more than once. Additive only — existing data is
-- untouched (new columns are nullable with ON DELETE SET NULL).
-- =============================================================================

create table if not exists public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  account_name text,
  details text,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_payment_methods_user
  on public.payment_methods (user_id);

-- At most one default payment method per user.
create unique index if not exists uniq_payment_methods_one_default
  on public.payment_methods (user_id)
  where is_default;

-- Link invoices and payments to a payment method (nullable).
alter table public.invoices
  add column if not exists payment_method_id uuid
    references public.payment_methods (id) on delete set null;

alter table public.payments
  add column if not exists payment_method_id uuid
    references public.payment_methods (id) on delete set null;

create index if not exists idx_payments_method
  on public.payments (payment_method_id);

-- keep updated_at fresh (function created by the base schema)
drop trigger if exists trg_payment_methods_updated on public.payment_methods;
create trigger trg_payment_methods_updated
  before update on public.payment_methods
  for each row execute function public.set_updated_at();

-- Row Level Security — scoped to the owner.
alter table public.payment_methods enable row level security;

drop policy if exists payment_methods_select_own on public.payment_methods;
create policy payment_methods_select_own on public.payment_methods
  for select using (auth.uid() = user_id);

drop policy if exists payment_methods_insert_own on public.payment_methods;
create policy payment_methods_insert_own on public.payment_methods
  for insert with check (auth.uid() = user_id);

drop policy if exists payment_methods_update_own on public.payment_methods;
create policy payment_methods_update_own on public.payment_methods
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists payment_methods_delete_own on public.payment_methods;
create policy payment_methods_delete_own on public.payment_methods
  for delete using (auth.uid() = user_id);

-- =============================================================================
-- Done. New table: payment_methods (RLS-protected). New nullable columns:
-- invoices.payment_method_id, payments.payment_method_id.
-- =============================================================================
