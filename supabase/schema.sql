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
  business_name text,
  logo_path text,                       -- storage object KEY in the `logos` bucket, never a URL
  tax_rate numeric(5, 2) not null default 25 check (tax_rate >= 0 and tax_rate <= 100),
  currency text not null default 'USD',
  payment_terms_days integer not null default 14 check (payment_terms_days >= 0),
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Branding / onboarding columns (added in migration 0005; here for fresh installs).
alter table public.profiles
  add column if not exists business_name text,
  add column if not exists logo_path text,
  add column if not exists payment_terms_days integer not null default 14
    check (payment_terms_days >= 0),
  add column if not exists onboarded_at timestamptz;

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  email text,
  company text,
  notes text,
  is_flagged boolean not null default false,
  is_archived boolean not null default false,
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
create index if not exists idx_clients_user_archived on public.clients (user_id, is_archived);
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

-- NOTE: all policies are scoped `to authenticated` and use `(select auth.uid())`
-- (evaluated once per query, not per row) — hardened in migration 0005.

-- profiles (scoped by id) ------------------------------------------------
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select to authenticated using ((select auth.uid()) = id);

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
  for insert to authenticated with check ((select auth.uid()) = id);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- clients ----------------------------------------------------------------
drop policy if exists clients_select_own on public.clients;
create policy clients_select_own on public.clients
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists clients_insert_own on public.clients;
create policy clients_insert_own on public.clients
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists clients_update_own on public.clients;
create policy clients_update_own on public.clients
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists clients_delete_own on public.clients;
create policy clients_delete_own on public.clients
  for delete to authenticated using ((select auth.uid()) = user_id);

-- invoices ---------------------------------------------------------------
drop policy if exists invoices_select_own on public.invoices;
create policy invoices_select_own on public.invoices
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists invoices_insert_own on public.invoices;
create policy invoices_insert_own on public.invoices
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists invoices_update_own on public.invoices;
create policy invoices_update_own on public.invoices
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists invoices_delete_own on public.invoices;
create policy invoices_delete_own on public.invoices
  for delete to authenticated using ((select auth.uid()) = user_id);

-- payments ---------------------------------------------------------------
drop policy if exists payments_select_own on public.payments;
create policy payments_select_own on public.payments
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists payments_insert_own on public.payments;
create policy payments_insert_own on public.payments
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists payments_update_own on public.payments;
create policy payments_update_own on public.payments
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists payments_delete_own on public.payments;
create policy payments_delete_own on public.payments
  for delete to authenticated using ((select auth.uid()) = user_id);

-- invoices/payments: client_id must belong to the same owner (defense-in-depth).
create or replace function public.enforce_client_ownership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.client_id is not null
     and not exists (
       select 1 from public.clients c
       where c.id = new.client_id
         and c.user_id = new.user_id
     ) then
    raise exception 'client_id % does not belong to the row owner', new.client_id
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_invoices_client_owner on public.invoices;
create trigger trg_invoices_client_owner
  before insert or update of client_id, user_id on public.invoices
  for each row execute function public.enforce_client_ownership();

drop trigger if exists trg_payments_client_owner on public.payments;
create trigger trg_payments_client_owner
  before insert or update of client_id, user_id on public.payments
  for each row execute function public.enforce_client_ownership();

-- -----------------------------------------------------------------------------
-- Payment methods (how clients pay you) + links from invoices/payments
-- -----------------------------------------------------------------------------
create table if not exists public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  account_name text,
  details text,
  payment_link text,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Optional pay link/number (added in migration 0004; here for fresh installs).
alter table public.payment_methods
  add column if not exists payment_link text;

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
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists payment_methods_insert_own on public.payment_methods;
create policy payment_methods_insert_own on public.payment_methods
  for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists payment_methods_update_own on public.payment_methods;
create policy payment_methods_update_own on public.payment_methods
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists payment_methods_delete_own on public.payment_methods;
create policy payment_methods_delete_own on public.payment_methods
  for delete to authenticated using ((select auth.uid()) = user_id);

-- -----------------------------------------------------------------------------
-- Storage: PRIVATE `logos` bucket + per-user object policies.
-- NOT included inline here: `create policy on storage.objects` can fail with
-- "must be owner of table objects", which would roll back this whole script.
-- Set storage up separately via supabase/migrations/0005b_logos_storage.sql
-- (create the bucket in the Storage UI, then add the 4 policies).
-- -----------------------------------------------------------------------------

-- =============================================================================
-- Done. Tables: profiles, clients, invoices, payments, payment_methods
-- (all RLS-protected, scoped TO authenticated). Client-owner trigger on
-- invoices + payments. Logo storage: see 0005b_logos_storage.sql.
-- =============================================================================
