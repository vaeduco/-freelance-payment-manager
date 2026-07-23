-- =============================================================================
-- 0014 — Max bookings per day. Idempotent + additive.
-- Run in the Supabase SQL Editor.
--
-- Adds profiles.max_bookings_per_day and re-introduces bookings.requested_date
-- (the freelancer-calendar date a booking is for — the link to available_dates;
-- the exact time stays in requested_start_at). The public availability RPC hides
-- full dates and create_booking enforces the cap atomically (per-date row lock).
-- =============================================================================

alter table public.profiles
  add column if not exists max_bookings_per_day integer not null default 1
  check (max_bookings_per_day between 1 and 50);

-- The booked calendar date (matches an available_dates.date). Backfilled from
-- the stored UTC instant, read back in the booking's own timezone.
alter table public.bookings add column if not exists requested_date date;
update public.bookings b
set requested_date = (b.requested_start_at at time zone coalesce(b.client_timezone, p.timezone, 'UTC'))::date
from public.profiles p
where p.id = b.user_id and b.requested_date is null;
alter table public.bookings alter column requested_date set not null;

-- Cap-count index: pending/confirmed bookings per (user, date).
create index if not exists idx_bookings_cap
  on public.bookings (user_id, requested_date)
  where status in ('pending', 'confirmed');

-- -----------------------------------------------------------------------------
-- get_available_dates — now hides dates whose pending+confirmed count has hit
-- the freelancer's max_bookings_per_day.
-- -----------------------------------------------------------------------------
create or replace function public.get_available_dates(p_slug text, p_from date, p_to date)
returns json language plpgsql security definer set search_path = public as $$
declare target uuid; tz text; cap integer; result json;
begin
  select id, coalesce(timezone, 'UTC'), coalesce(max_bookings_per_day, 1)
  into target, tz, cap
  from public.profiles where booking_slug = p_slug;
  if target is null then return json_build_object('found', false, 'dates', '[]'::json); end if;
  if p_from is null or p_from < current_date then p_from := current_date; end if;
  if p_from > current_date + 366 then return json_build_object('found', true, 'timezone', tz, 'dates', '[]'::json); end if;
  if p_to is null or p_to > p_from + 366 then p_to := p_from + 366; end if;

  select coalesce(json_agg(d.date order by d.date), '[]'::json) into result
  from public.available_dates d
  where d.user_id = target and d.date between p_from and p_to
    and (
      select count(*) from public.bookings b
      where b.user_id = target and b.requested_date = d.date
        and b.status in ('pending', 'confirmed')
    ) < cap;

  return json_build_object('found', true, 'timezone', tz, 'dates', result);
end; $$;
grant execute on function public.get_available_dates(text, date, date) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- create_booking — enforces the daily cap. Locks the date's availability row
-- (FOR UPDATE) so concurrent requests serialize and the count-then-insert is
-- atomic; returns 'date_full' when the cap is already reached.
-- -----------------------------------------------------------------------------
create or replace function public.create_booking(
  p_slug text, p_guest_name text, p_guest_email text,
  p_requested_date date, p_start time, p_end time, p_client_timezone text, p_notes text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  target uuid;
  cid uuid;
  cap integer;
  cnt integer;
  start_at timestamptz;
  end_at timestamptz;
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
  if p_client_timezone is null
     or not exists (select 1 from pg_timezone_names where name = p_client_timezone) then
    return json_build_object('status', 'bad_input', 'message', 'Unrecognized timezone.');
  end if;

  select id, coalesce(max_bookings_per_day, 1) into target, cap
  from public.profiles where booking_slug = p_slug;
  if target is null then return json_build_object('status', 'not_found'); end if;

  -- Validate + LOCK the date's availability row: concurrent create_booking calls
  -- for the same date serialize here, making the cap check + insert atomic.
  perform 1 from public.available_dates d
  where d.user_id = target and d.date = p_requested_date for update;
  if not found then return json_build_object('status', 'date_unavailable'); end if;

  start_at := (p_requested_date + p_start) at time zone p_client_timezone;
  end_at := (p_requested_date + p_end) at time zone p_client_timezone;
  if start_at <= now() then return json_build_object('status', 'invalid_request'); end if;

  select count(*) into cnt from public.bookings b
  where b.user_id = target and b.requested_date = p_requested_date
    and b.status in ('pending', 'confirmed');
  if cnt >= cap then return json_build_object('status', 'date_full'); end if;

  select id into cid from public.clients
  where user_id = target and lower(email) = lower(btrim(p_guest_email)) and not is_archived
  limit 1;

  insert into public.bookings (
    user_id, client_id, guest_name, guest_email,
    requested_date, requested_start_at, requested_end_at, client_timezone, status, notes
  ) values (
    target, cid, btrim(p_guest_name), lower(btrim(p_guest_email)),
    p_requested_date, start_at, end_at, p_client_timezone, 'pending', nullif(btrim(coalesce(p_notes, '')), '')
  );

  return json_build_object('status', 'ok');
end;
$$;
grant execute on function public.create_booking(text, text, text, date, time, time, text, text) to anon, authenticated;

-- =============================================================================
-- Done. Daily cap: profiles.max_bookings_per_day + per-date enforcement.
-- =============================================================================
