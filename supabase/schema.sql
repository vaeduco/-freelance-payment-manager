-- =============================================================================
-- Freelance Payment & Income Manager — Database schema
-- Run this in the Supabase SQL Editor (Dashboard -> SQL Editor -> New query).
-- It is idempotent: safe to run more than once.
-- =============================================================================

create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- Tables
-- -----------------------------------------------------------------------------

-- Per-user settings (created automatically on signup by a trigger below).
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  tax_rate numeric(5, 2) not null default 25 check (tax_rate >= 0 and tax_rate <= 100),
  currency text not null default 'USD',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  email text,
  company text,
  notes text,
  is_flagged boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  client_id uuid references public.clients (id) on delete set null,
  service_description text not null,
  amount numeric(12, 2) not null default 0 check (amount >= 0),
  status text not null default 'draft'
    check (status in ('draft', 'sent', 'paid', 'overdue')),
  issue_date date not null default current_date,
  due_date date not null,
  project_type text,
  rate_type text not null default 'fixed' check (rate_type in ('fixed', 'hourly')),
  tracked_hours numeric(10, 2) check (tracked_hours is null or tracked_hours >= 0),
  hourly_rate numeric(12, 2) check (hourly_rate is null or hourly_rate >= 0),
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  invoice_id uuid references public.invoices (id) on delete set null,
  client_id uuid references public.clients (id) on delete set null,
  amount numeric(12, 2) not null default 0 check (amount >= 0),
  payment_date date not null default current_date,
  project_type text,
  notes text,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Indexes
-- -----------------------------------------------------------------------------
create index if not exists idx_clients_user on public.clients (user_id);
create index if not exists idx_invoices_user on public.invoices (user_id);
create index if not exists idx_invoices_client on public.invoices (client_id);
create index if not exists idx_invoices_user_status on public.invoices (user_id, status);
create index if not exists idx_payments_user on public.payments (user_id);
create index if not exists idx_payments_client on public.payments (client_id);
create index if not exists idx_payments_user_date on public.payments (user_id, payment_date);

-- -----------------------------------------------------------------------------
-- updated_at maintenance
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated on public.profiles;
create trigger trg_profiles_updated
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists trg_clients_updated on public.clients;
create trigger trg_clients_updated
  before update on public.clients
  for each row execute function public.set_updated_at();

drop trigger if exists trg_invoices_updated on public.invoices;
create trigger trg_invoices_updated
  before update on public.invoices
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Auto-create a profile row whenever a new auth user signs up
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, nullif(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- Row Level Security — every row is scoped to its owner (auth.uid())
-- -----------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.clients  enable row level security;
alter table public.invoices enable row level security;
alter table public.payments enable row level security;

-- profiles ---------------------------------------------------------------
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select using (auth.uid() = id);

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- clients ----------------------------------------------------------------
drop policy if exists clients_select_own on public.clients;
create policy clients_select_own on public.clients
  for select using (auth.uid() = user_id);

drop policy if exists clients_insert_own on public.clients;
create policy clients_insert_own on public.clients
  for insert with check (auth.uid() = user_id);

drop policy if exists clients_update_own on public.clients;
create policy clients_update_own on public.clients
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists clients_delete_own on public.clients;
create policy clients_delete_own on public.clients
  for delete using (auth.uid() = user_id);

-- invoices ---------------------------------------------------------------
drop policy if exists invoices_select_own on public.invoices;
create policy invoices_select_own on public.invoices
  for select using (auth.uid() = user_id);

drop policy if exists invoices_insert_own on public.invoices;
create policy invoices_insert_own on public.invoices
  for insert with check (auth.uid() = user_id);

drop policy if exists invoices_update_own on public.invoices;
create policy invoices_update_own on public.invoices
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists invoices_delete_own on public.invoices;
create policy invoices_delete_own on public.invoices
  for delete using (auth.uid() = user_id);

-- payments ---------------------------------------------------------------
drop policy if exists payments_select_own on public.payments;
create policy payments_select_own on public.payments
  for select using (auth.uid() = user_id);

drop policy if exists payments_insert_own on public.payments;
create policy payments_insert_own on public.payments
  for insert with check (auth.uid() = user_id);

drop policy if exists payments_update_own on public.payments;
create policy payments_update_own on public.payments
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists payments_delete_own on public.payments;
create policy payments_delete_own on public.payments
  for delete using (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- Payment methods (how clients pay you) + links from invoices/payments
-- -----------------------------------------------------------------------------
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
create unique index if not exists uniq_payment_methods_one_default
  on public.payment_methods (user_id)
  where is_default;

alter table public.invoices
  add column if not exists payment_method_id uuid
    references public.payment_methods (id) on delete set null;
alter table public.payments
  add column if not exists payment_method_id uuid
    references public.payment_methods (id) on delete set null;
create index if not exists idx_payments_method
  on public.payments (payment_method_id);

drop trigger if exists trg_payment_methods_updated on public.payment_methods;
create trigger trg_payment_methods_updated
  before update on public.payment_methods
  for each row execute function public.set_updated_at();

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
-- Done. Tables: profiles, clients, invoices, payments, payment_methods
-- (all RLS-protected).
-- =============================================================================
