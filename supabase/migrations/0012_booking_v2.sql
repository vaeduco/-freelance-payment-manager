-- =============================================================================
-- 0012 — Booking module v2 (request/approve). DESTRUCTIVE + idempotent.
-- Run in the Supabase SQL Editor.
--
-- Replaces the Calendly-style module (weekly availability + auto slots + instant
-- confirm) with a request-based one: the freelancer marks specific dates as
-- available; guests propose a date + time range; the freelancer approves or
-- declines. Drops the old availability + bookings tables and their RPCs.
-- Public reads/writes go through slug-gated SECURITY DEFINER RPCs (no service role).
-- =============================================================================

-- Drop the old public RPCs + the previous create_booking signature.
drop function if exists public.get_available_slots(text, date, date);
drop function if exists public.replace_availability(jsonb);
drop function if exists public.create_booking(text, text, text, timestamptz, text);

-- Drop the old tables (weekly rules + instant-confirm bookings).
drop table if exists public.availability cascade;
drop table if exists public.bookings cascade;

-- -----------------------------------------------------------------------------
-- available_dates — specific calendar dates the freelancer is open on.
-- -----------------------------------------------------------------------------
create table if not exists public.available_dates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  created_at timestamptz not null default now(),
  unique (user_id, date)
);
create index if not exists idx_available_dates_user on public.available_dates (user_id, date);

alter table public.available_dates enable row level security;
drop policy if exists available_dates_select_own on public.available_dates;
create policy available_dates_select_own on public.available_dates
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists available_dates_insert_own on public.available_dates;
create policy available_dates_insert_own on public.available_dates
  for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists available_dates_delete_own on public.available_dates;
create policy available_dates_delete_own on public.available_dates
  for delete to authenticated using ((select auth.uid()) = user_id);

-- -----------------------------------------------------------------------------
-- bookings — request-based. Created publicly (status 'pending') via RPC;
-- managed by the owner. 'completed' extends the spec's states for feature 3.
-- -----------------------------------------------------------------------------
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  client_id uuid references public.clients (id) on delete set null,
  guest_name text not null,
  guest_email text not null,
  requested_date date not null,
  requested_start_time time not null,
  requested_end_time time not null,
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'declined', 'cancelled', 'completed')),
  notes text,
  created_at timestamptz not null default now(),
  check (requested_end_time > requested_start_time)
);
create index if not exists idx_bookings_user on public.bookings (user_id, requested_date);

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
-- get_available_dates — public: the freelancer's open dates in [from, to]
-- (never past). No PII. get_booking_page (name + tz) is reused from 0010.
-- -----------------------------------------------------------------------------
create or replace function public.get_available_dates(p_slug text, p_from date, p_to date)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  target uuid;
  tz text;
  result json;
begin
  select id, coalesce(timezone, 'UTC') into target, tz
  from public.profiles where booking_slug = p_slug;
  if target is null then
    return json_build_object('found', false, 'dates', '[]'::json);
  end if;

  if p_from is null or p_from < current_date then p_from := current_date; end if;
  if p_from > current_date + 366 then
    return json_build_object('found', true, 'timezone', tz, 'dates', '[]'::json);
  end if;
  if p_to is null or p_to > p_from + 366 then p_to := p_from + 366; end if;

  select coalesce(json_agg(d.date order by d.date), '[]'::json) into result
  from public.available_dates d
  where d.user_id = target and d.date between p_from and p_to;

  return json_build_object('found', true, 'timezone', tz, 'dates', result);
end;
$$;
grant execute on function public.get_available_dates(text, date, date) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- create_booking — public write. Requires the date to be marked available and
-- not past, and a valid time range; inserts a 'pending' request; auto-links a
-- client by email. Multiple pending requests are allowed (owner triages).
-- -----------------------------------------------------------------------------
create or replace function public.create_booking(
  p_slug text,
  p_guest_name text,
  p_guest_email text,
  p_requested_date date,
  p_start time,
  p_end time,
  p_notes text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  target uuid;
  cid uuid;
begin
  if p_guest_name is null or length(btrim(p_guest_name)) = 0 then
    return json_build_object('status', 'bad_input', 'message', 'Please enter your name.');
  end if;
  if p_guest_email is null or p_guest_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    return json_build_object('status', 'bad_input', 'message', 'Please enter a valid email.');
  end if;
  if p_requested_date is null or p_start is null or p_end is null or p_end <= p_start then
    return json_build_object('status', 'invalid_request');
  end if;

  select id into target from public.profiles where booking_slug = p_slug;
  if target is null then
    return json_build_object('status', 'not_found');
  end if;

  if p_requested_date < current_date then
    return json_build_object('status', 'invalid_request');
  end if;
  if not exists (
    select 1 from public.available_dates d
    where d.user_id = target and d.date = p_requested_date
  ) then
    return json_build_object('status', 'date_unavailable');
  end if;

  select id into cid from public.clients
  where user_id = target and lower(email) = lower(btrim(p_guest_email)) and not is_archived
  limit 1;

  insert into public.bookings (
    user_id, client_id, guest_name, guest_email,
    requested_date, requested_start_time, requested_end_time, status, notes
  ) values (
    target, cid, btrim(p_guest_name), lower(btrim(p_guest_email)),
    p_requested_date, p_start, p_end, 'pending', nullif(btrim(coalesce(p_notes, '')), '')
  );

  return json_build_object('status', 'ok');
end;
$$;
grant execute on function public.create_booking(text, text, text, date, time, time, text) to anon, authenticated;

-- =============================================================================
-- Done. Request-based booking: available_dates + pending bookings + the two
-- public RPCs above (get_booking_page reused from 0010). No service role.
-- =============================================================================
