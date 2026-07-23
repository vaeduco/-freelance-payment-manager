-- =============================================================================
-- 0009 — Booking / scheduling module (Phase A: schema)
-- Run in the Supabase SQL Editor. Idempotent + additive.
--
-- Adds a public booking handle + timezone to profiles, and the availability
-- (weekly rules) + bookings tables. Owner-only RLS on both; the PUBLIC booking
-- page never touches these directly — Phase B adds SECURITY DEFINER RPCs
-- (gated by the slug) for public reads/writes, so no service role is needed.
-- =============================================================================

-- Public booking handle + freelancer timezone (anchors availability; guests see
-- slots converted to their own tz). timezone is an IANA name, e.g. 'America/Los_Angeles'.
alter table public.profiles add column if not exists booking_slug text;
alter table public.profiles add column if not exists timezone text not null default 'UTC';
create unique index if not exists uniq_profiles_booking_slug
  on public.profiles (booking_slug) where booking_slug is not null;

-- -----------------------------------------------------------------------------
-- availability — weekly recurring rules in the freelancer's timezone.
-- -----------------------------------------------------------------------------
create table if not exists public.availability (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  day_of_week integer not null check (day_of_week between 0 and 6), -- 0 = Sunday
  start_time time not null,
  end_time time not null,
  slot_duration_minutes integer not null default 30
    check (slot_duration_minutes between 5 and 480),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_time > start_time)
);
create index if not exists idx_availability_user on public.availability (user_id);

drop trigger if exists trg_availability_updated on public.availability;
create trigger trg_availability_updated
  before update on public.availability
  for each row execute function public.set_updated_at();

alter table public.availability enable row level security;
drop policy if exists availability_select_own on public.availability;
create policy availability_select_own on public.availability
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists availability_insert_own on public.availability;
create policy availability_insert_own on public.availability
  for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists availability_update_own on public.availability;
create policy availability_update_own on public.availability
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists availability_delete_own on public.availability;
create policy availability_delete_own on public.availability
  for delete to authenticated using ((select auth.uid()) = user_id);

-- -----------------------------------------------------------------------------
-- bookings — a scheduled call. Created publicly via an RPC (Phase B); managed
-- by the owner here. client_id auto-links to an existing client (by email) when
-- possible; guest_* always captures who booked.
-- -----------------------------------------------------------------------------
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  client_id uuid references public.clients (id) on delete set null,
  guest_name text not null,
  guest_email text not null,
  scheduled_at timestamptz not null,
  duration_minutes integer not null check (duration_minutes between 5 and 480),
  status text not null default 'confirmed'
    check (status in ('confirmed', 'cancelled', 'completed')),
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists idx_bookings_user_time on public.bookings (user_id, scheduled_at);
-- Double-booking guard: at most one CONFIRMED booking per freelancer per instant.
create unique index if not exists uniq_bookings_confirmed_slot
  on public.bookings (user_id, scheduled_at) where status = 'confirmed';

alter table public.bookings enable row level security;
drop policy if exists bookings_select_own on public.bookings;
create policy bookings_select_own on public.bookings
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists bookings_insert_own on public.bookings;
create policy bookings_insert_own on public.bookings
  for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists bookings_update_own on public.bookings;
create policy bookings_update_own on public.bookings
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists bookings_delete_own on public.bookings;
create policy bookings_delete_own on public.bookings
  for delete to authenticated using ((select auth.uid()) = user_id);

-- -----------------------------------------------------------------------------
-- replace_availability — atomically swap the caller's whole weekly schedule in
-- ONE transaction, so a failed insert can't leave the user with zero rows.
-- SECURITY INVOKER: RLS still scopes every row to the caller (auth.uid()).
-- -----------------------------------------------------------------------------
create or replace function public.replace_availability(p_rules jsonb)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = 'insufficient_privilege';
  end if;
  delete from public.availability where user_id = uid;
  insert into public.availability (
    user_id, day_of_week, start_time, end_time, slot_duration_minutes, is_active
  )
  select
    uid,
    (r->>'day_of_week')::integer,
    (r->>'start_time')::time,
    (r->>'end_time')::time,
    (r->>'slot_duration_minutes')::integer,
    coalesce((r->>'is_active')::boolean, true)
  from jsonb_array_elements(coalesce(p_rules, '[]'::jsonb)) as r;
end;
$$;
grant execute on function public.replace_availability(jsonb) to authenticated;

-- =============================================================================
-- Done (Phase A). Public read/write RPCs come in 0010 (Phase B).
-- =============================================================================
