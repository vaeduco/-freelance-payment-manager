-- =============================================================================
-- 0010 — Booking module (Phase B: public RPCs)
-- Run in the Supabase SQL Editor. Idempotent (create or replace).
--
-- The public /book/[slug] page reaches these SECURITY DEFINER functions with the
-- anon key (NO service role). They expose ONLY: the freelancer's display name +
-- timezone, available slot instants, and a gated booking write. Everything is
-- keyed by booking_slug; no other data is ever returned.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- get_booking_page — public identity for the header (no private data).
-- -----------------------------------------------------------------------------
create or replace function public.get_booking_page(p_slug text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  p record;
begin
  select
    coalesce(nullif(btrim(business_name), ''), nullif(btrim(full_name), ''), 'Freelancer') as name,
    coalesce(timezone, 'UTC') as tz
  into p
  from public.profiles
  where booking_slug = p_slug;

  if not found then
    return json_build_object('found', false);
  end if;
  return json_build_object('found', true, 'display_name', p.name, 'timezone', p.tz);
end;
$$;
grant execute on function public.get_booking_page(text) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- get_available_slots — bookable UTC instants across [p_from, p_to], generated
-- from active availability rules in the freelancer's tz (DST-correct via AT TIME
-- ZONE) and excluding past + already-confirmed times. Range is clamped.
-- -----------------------------------------------------------------------------
create or replace function public.get_available_slots(p_slug text, p_from date, p_to date)
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
    return json_build_object('found', false, 'slots', '[]'::json);
  end if;

  if p_from is null or p_from < current_date then p_from := current_date; end if;
  -- Bound how far ahead (also avoids date overflow when computing p_from + 62).
  if p_from > current_date + 62 then
    return json_build_object('found', true, 'timezone', tz, 'slots', '[]'::json);
  end if;
  if p_to is null or p_to > p_from + 62 then p_to := p_from + 62; end if;

  with days as (
    select d::date as day
    from generate_series(p_from, p_to, interval '1 day') as d
  ),
  rules as (
    select day_of_week, start_time, end_time, slot_duration_minutes
    from public.availability
    where user_id = target and is_active
  ),
  slots as (
    -- Step by integer minute offsets (generate_series has no interval overload):
    -- 0, slot, 2*slot, ... up to the last start that still fits before end_time.
    -- DISTINCT collapses DST spring-forward twins (a skipped local hour maps two
    -- offsets onto the same UTC instant).
    select distinct
      ((days.day + (r.start_time + make_interval(mins => gs.min_off))) at time zone tz) as slot_utc,
      r.slot_duration_minutes as duration
    from days
    join rules r on r.day_of_week = extract(dow from days.day)::int
    cross join lateral generate_series(
      0,
      (extract(epoch from (r.end_time - r.start_time)) / 60)::int - r.slot_duration_minutes,
      r.slot_duration_minutes
    ) as gs(min_off)
  )
  select coalesce(
    json_agg(
      json_build_object('start', slot_utc, 'duration', duration)
      order by slot_utc
    ),
    '[]'::json
  )
  into result
  from slots
  where slot_utc > now()
    and not exists (
      select 1 from public.bookings b
      where b.user_id = target and b.status = 'confirmed'
        and b.scheduled_at = slots.slot_utc
    );

  return json_build_object('found', true, 'timezone', tz, 'slots', result);
end;
$$;
grant execute on function public.get_available_slots(text, date, date) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- create_booking — the ONLY public write. Rejects anything that isn't a real,
-- future, correctly-aligned slot for this freelancer; auto-links an existing
-- client by email; the partial-unique index is the final double-booking guard.
-- -----------------------------------------------------------------------------
create or replace function public.create_booking(
  p_slug text,
  p_guest_name text,
  p_guest_email text,
  p_scheduled_at timestamptz,
  p_notes text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  target uuid;
  tz text;
  local_ts timestamp;
  dur integer;
  cid uuid;
begin
  if p_guest_name is null or length(btrim(p_guest_name)) = 0 then
    return json_build_object('status', 'bad_input', 'message', 'Please enter your name.');
  end if;
  if p_guest_email is null or p_guest_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    return json_build_object('status', 'bad_input', 'message', 'Please enter a valid email.');
  end if;
  if p_scheduled_at is null then
    return json_build_object('status', 'invalid_slot');
  end if;
  -- Canonicalize to a whole minute: a sub-second offset must not slip past the
  -- alignment check yet be stored as a distinct instant (that would defeat both
  -- the double-booking unique guard and the get_available_slots exclusion).
  p_scheduled_at := date_trunc('minute', p_scheduled_at);

  select id, coalesce(timezone, 'UTC') into target, tz
  from public.profiles where booking_slug = p_slug;
  if target is null then
    return json_build_object('status', 'not_found');
  end if;

  if p_scheduled_at <= now() or p_scheduled_at > now() + interval '62 days' then
    return json_build_object('status', 'invalid_slot');
  end if;

  -- The requested instant, seen as wall-clock in the freelancer's timezone.
  local_ts := p_scheduled_at at time zone tz;

  -- Must land exactly on a slot boundary of an active rule for that weekday.
  -- Compared in seconds-from-start (no time-of-day wraparound near midnight),
  -- matching how get_available_slots steps the offsets.
  select a.slot_duration_minutes into dur
  from public.availability a
  where a.user_id = target and a.is_active
    and a.day_of_week = extract(dow from local_ts)::int
    and local_ts::time >= a.start_time
    and mod(
      extract(epoch from (local_ts::time - a.start_time))::int,
      a.slot_duration_minutes * 60
    ) = 0
    and extract(epoch from (local_ts::time - a.start_time)) + a.slot_duration_minutes * 60
        <= extract(epoch from (a.end_time - a.start_time))
  limit 1;

  if not found then
    return json_build_object('status', 'invalid_slot');
  end if;

  -- Auto-link to an existing (non-archived) client with the same email.
  select id into cid
  from public.clients
  where user_id = target and lower(email) = lower(btrim(p_guest_email)) and not is_archived
  limit 1;

  begin
    insert into public.bookings (
      user_id, client_id, guest_name, guest_email, scheduled_at,
      duration_minutes, status, notes
    ) values (
      target, cid, btrim(p_guest_name), lower(btrim(p_guest_email)), p_scheduled_at,
      dur, 'confirmed', nullif(btrim(coalesce(p_notes, '')), '')
    );
  exception when unique_violation then
    return json_build_object('status', 'taken');
  end;

  return json_build_object('status', 'ok', 'scheduled_at', p_scheduled_at, 'duration', dur);
end;
$$;
grant execute on function public.create_booking(text, text, text, timestamptz, text) to anon, authenticated;

-- =============================================================================
-- Done (Phase B). Public booking flow: get_booking_page / get_available_slots /
-- create_booking — all slug-gated, no service role, no data leakage.
-- =============================================================================
