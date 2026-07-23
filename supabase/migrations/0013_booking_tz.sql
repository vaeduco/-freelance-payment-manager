-- =============================================================================
-- 0013 — Timezone-aware bookings. Idempotent + data-preserving.
-- Run in the Supabase SQL Editor.
--
-- Stores requested times as UTC timestamptz (requested_start_at/_end_at) plus the
-- client's detected IANA timezone, replacing the plain date + start/end time.
-- Existing rows are backfilled from the old date+time, interpreted in the
-- freelancer's timezone. Conversions use Postgres AT TIME ZONE (DST-safe).
-- =============================================================================

-- profiles.timezone already exists (booking module). New default -> Asia/Manila;
-- existing profiles keep whatever they've set.
alter table public.profiles alter column timezone set default 'Asia/Manila';

-- New UTC timestamp columns + the client's timezone.
alter table public.bookings add column if not exists requested_start_at timestamptz;
alter table public.bookings add column if not exists requested_end_at timestamptz;
alter table public.bookings add column if not exists client_timezone text;

-- Backfill from the old date+time (old times were the freelancer's local time).
-- Guarded so a re-run (after the old columns are dropped below) no-ops instead
-- of erroring — keeps this migration genuinely idempotent.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'bookings'
      and column_name = 'requested_date'
  ) then
    update public.bookings b
    set requested_start_at = ((b.requested_date + b.requested_start_time) at time zone coalesce(p.timezone, 'UTC')),
        requested_end_at   = ((b.requested_date + b.requested_end_time)   at time zone coalesce(p.timezone, 'UTC'))
    from public.profiles p
    where p.id = b.user_id
      and b.requested_start_at is null;
  end if;
end $$;

alter table public.bookings alter column requested_start_at set not null;
alter table public.bookings alter column requested_end_at set not null;

-- Drop the old date/time columns (their inline time-order check drops with them).
alter table public.bookings drop column if exists requested_date;
alter table public.bookings drop column if exists requested_start_time;
alter table public.bookings drop column if exists requested_end_time;

alter table public.bookings drop constraint if exists bookings_time_order;
alter table public.bookings add constraint bookings_time_order check (requested_end_at > requested_start_at);

create index if not exists idx_bookings_user_start on public.bookings (user_id, requested_start_at);

-- -----------------------------------------------------------------------------
-- create_booking (new signature): accepts the guest's picked date/time + their
-- detected timezone, converts to UTC in-DB (AT TIME ZONE, DST-safe), validates
-- (marked date, valid tz, future, end>start), stores UTC + client_timezone.
-- -----------------------------------------------------------------------------
drop function if exists public.create_booking(text, text, text, date, time, time, text);
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

  select id into target from public.profiles where booking_slug = p_slug;
  if target is null then return json_build_object('status', 'not_found'); end if;

  -- The guest picked a marked calendar date (validated as-clicked).
  if not exists (
    select 1 from public.available_dates d where d.user_id = target and d.date = p_requested_date
  ) then
    return json_build_object('status', 'date_unavailable');
  end if;

  -- Wall-clock in the guest's timezone -> UTC instants.
  start_at := (p_requested_date + p_start) at time zone p_client_timezone;
  end_at := (p_requested_date + p_end) at time zone p_client_timezone;
  if start_at <= now() then
    return json_build_object('status', 'invalid_request');
  end if;

  select id into cid from public.clients
  where user_id = target and lower(email) = lower(btrim(p_guest_email)) and not is_archived
  limit 1;

  insert into public.bookings (
    user_id, client_id, guest_name, guest_email,
    requested_start_at, requested_end_at, client_timezone, status, notes
  ) values (
    target, cid, btrim(p_guest_name), lower(btrim(p_guest_email)),
    start_at, end_at, p_client_timezone, 'pending', nullif(btrim(coalesce(p_notes, '')), '')
  );

  return json_build_object('status', 'ok');
end;
$$;
grant execute on function public.create_booking(text, text, text, date, time, time, text, text) to anon, authenticated;

-- =============================================================================
-- Done. bookings now stores UTC timestamps + client_timezone; create_booking
-- converts the guest's local date/time to UTC in-DB.
-- =============================================================================
