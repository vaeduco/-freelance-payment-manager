-- =============================================================================
-- 0005 — Multi-user hardening + branding
-- Run this in the Supabase SQL Editor (Dashboard -> SQL Editor -> New query).
-- Idempotent + additive: safe to run more than once; no existing data changes.
--
-- Adds: profile branding/onboarding columns; hardens every RLS policy
-- (scoped TO authenticated, cached (select auth.uid())); a client-ownership
-- trigger on invoices/payments.
--
-- STORAGE is set up SEPARATELY in 0005b_logos_storage.sql — creating policies on
-- storage.objects can fail with "must be owner of table objects", which (because
-- the SQL Editor runs a script as one transaction) would roll back EVERYTHING in
-- this file. Keeping storage out guarantees this migration applies cleanly.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Profile branding / onboarding columns
-- -----------------------------------------------------------------------------
alter table public.profiles
  add column if not exists business_name text,
  add column if not exists logo_path text,                       -- storage object KEY, never a URL
  add column if not exists payment_terms_days integer not null default 14
    check (payment_terms_days >= 0),
  add column if not exists onboarded_at timestamptz;

-- Backfill: existing users who already have data shouldn't be forced through
-- onboarding. Re-run safe — a brand-new signup has no data yet, so it stays
-- null (onboarding still shows) even if this migration is run again later.
update public.profiles p set onboarded_at = now()
where onboarded_at is null
  and (
    exists (select 1 from public.clients c where c.user_id = p.id)
    or exists (select 1 from public.invoices i where i.user_id = p.id)
    or exists (select 1 from public.payments pm where pm.user_id = p.id)
  );

-- -----------------------------------------------------------------------------
-- 2. RLS hardening — recreate every policy scoped `to authenticated` and using
--    `(select auth.uid())` (evaluated once per query, not per row). Semantics
--    are unchanged; RLS stays enabled throughout (each drop/create is atomic).
-- -----------------------------------------------------------------------------

-- profiles (scoped by id) -----------------------------------------------------
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

-- clients ---------------------------------------------------------------------
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

-- invoices --------------------------------------------------------------------
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

-- payments --------------------------------------------------------------------
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

-- payment_methods -------------------------------------------------------------
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
-- 3. Defense-in-depth: an invoice's / payment's client_id must belong to the
--    same owner. The FK only checks existence, so without this a user who knew
--    another user's client_id could attach a row to it. SECURITY DEFINER +
--    pinned search_path keeps the check independent of the clients RLS.
-- -----------------------------------------------------------------------------
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

-- =============================================================================
-- Done. profiles gains business_name, logo_path, payment_terms_days,
-- onboarded_at. All policies scoped TO authenticated with cached auth.uid().
-- Client-owner trigger on invoices + payments.
-- NEXT: run 0005b_logos_storage.sql for the private logo bucket + policies.
-- =============================================================================
