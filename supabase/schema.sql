-- =============================================================================
-- Freelance Payment & Income Manager — Database schema
-- Run this in the Supabase SQL Editor (Dashboard -> SQL Editor -> New query).
-- It is idempotent: safe to run more than once.
-- =============================================================================

create extension if not exists "pgcrypto" with schema extensions;

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
  password_checked_at timestamptz,      -- last clean HIBP breach check (0007a)
  booking_slug text,                    -- public booking handle (0009); partial-unique below
  timezone text not null default 'UTC', -- IANA tz anchoring availability (0009)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists uniq_profiles_booking_slug
  on public.profiles (booking_slug) where booking_slug is not null;

-- Branding / onboarding columns (added in migration 0005; here for fresh installs).
alter table public.profiles
  add column if not exists business_name text,
  add column if not exists logo_path text,
  add column if not exists payment_terms_days integer not null default 14
    check (payment_terms_days >= 0),
  add column if not exists onboarded_at timestamptz,
  add column if not exists password_checked_at timestamptz;

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
-- Security activity log (0007b) — powers Audit Log, Login History, and Alerts.
-- -----------------------------------------------------------------------------
create table if not exists public.security_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category text not null,
  action text not null,
  summary text not null,
  is_alert boolean not null default false,
  read_at timestamptz,
  ip text,
  location text,
  device text,
  user_agent text,
  metadata jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_security_events_user_created
  on public.security_events (user_id, created_at desc);
create index if not exists idx_security_events_user_unread
  on public.security_events (user_id) where is_alert and read_at is null;
create index if not exists idx_security_events_user_category
  on public.security_events (user_id, category, created_at desc);

alter table public.security_events enable row level security;
drop policy if exists security_events_select_own on public.security_events;
create policy security_events_select_own on public.security_events
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists security_events_insert_own on public.security_events;
create policy security_events_insert_own on public.security_events
  for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists security_events_update_own on public.security_events;
create policy security_events_update_own on public.security_events
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- -----------------------------------------------------------------------------
-- Secure invoice sharing (0007c): shared_links + create/peek/open RPCs.
-- -----------------------------------------------------------------------------
create table if not exists public.shared_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  token uuid not null default gen_random_uuid(),
  password_hash text,
  expires_at timestamptz,
  max_views integer check (max_views is null or max_views >= 1),
  view_count integer not null default 0,
  revoked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists uniq_shared_links_token on public.shared_links (token);
create unique index if not exists uniq_shared_links_invoice on public.shared_links (invoice_id);
create index if not exists idx_shared_links_user on public.shared_links (user_id);

drop trigger if exists trg_shared_links_updated on public.shared_links;
create trigger trg_shared_links_updated
  before update on public.shared_links
  for each row execute function public.set_updated_at();

alter table public.shared_links enable row level security;
drop policy if exists shared_links_select_own on public.shared_links;
create policy shared_links_select_own on public.shared_links
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists shared_links_update_own on public.shared_links;
create policy shared_links_update_own on public.shared_links
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists shared_links_delete_own on public.shared_links;
create policy shared_links_delete_own on public.shared_links
  for delete to authenticated using ((select auth.uid()) = user_id);

create or replace function public.create_shared_link(
  p_invoice_id uuid, p_password text, p_expires_at timestamptz, p_max_views integer
) returns json language plpgsql security definer set search_path = public, extensions as $$
declare uid uuid := auth.uid(); row public.shared_links;
begin
  if uid is null then raise exception 'not authenticated' using errcode = 'insufficient_privilege'; end if;
  if not exists (select 1 from public.invoices i where i.id = p_invoice_id and i.user_id = uid) then
    raise exception 'invoice not found' using errcode = 'check_violation';
  end if;
  insert into public.shared_links (user_id, invoice_id, token, password_hash, expires_at, max_views, revoked, view_count)
  values (uid, p_invoice_id, gen_random_uuid(),
    case when p_password is null or length(p_password) = 0 then null else crypt(p_password, gen_salt('bf')) end,
    p_expires_at,
    case when p_max_views is null or p_max_views < 1 then null else p_max_views end, false, 0)
  on conflict (invoice_id) do update set
    password_hash = case when p_password is null or length(p_password) = 0 then null else crypt(p_password, gen_salt('bf')) end,
    expires_at = excluded.expires_at, max_views = excluded.max_views, revoked = false, view_count = 0, updated_at = now()
  returning * into row;
  return json_build_object('token', row.token, 'has_password', row.password_hash is not null,
    'expires_at', row.expires_at, 'max_views', row.max_views, 'view_count', row.view_count, 'revoked', row.revoked);
end; $$;
grant execute on function public.create_shared_link(uuid, text, timestamptz, integer) to authenticated;

create or replace function public.peek_shared_link(p_token uuid)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare link public.shared_links; st text;
begin
  select * into link from public.shared_links where token = p_token;
  if not found then return json_build_object('status', 'not_found', 'requires_password', false); end if;
  if link.revoked then st := 'revoked';
  elsif link.expires_at is not null and link.expires_at < now() then st := 'expired';
  elsif link.max_views is not null and link.view_count >= link.max_views then st := 'limit';
  else st := 'ok'; end if;
  return json_build_object('status', st, 'requires_password', link.password_hash is not null);
end; $$;
grant execute on function public.peek_shared_link(uuid) to anon, authenticated;

create or replace function public.open_shared_link(p_token uuid, p_password text)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare link public.shared_links; inv public.invoices; seq integer;
begin
  select * into link from public.shared_links where token = p_token;
  if not found then return json_build_object('status', 'not_found'); end if;
  if link.revoked then return json_build_object('status', 'revoked'); end if;
  if link.expires_at is not null and link.expires_at < now() then return json_build_object('status', 'expired'); end if;
  if link.password_hash is not null then
    if p_password is null or crypt(p_password, link.password_hash) <> link.password_hash then
      return json_build_object('status', 'bad_password');
    end if;
  end if;
  -- Atomic view consumption enforces max_views without a race (0 rows -> limit).
  update public.shared_links set view_count = view_count + 1
    where id = link.id and (max_views is null or view_count < max_views);
  if not found then return json_build_object('status', 'limit'); end if;
  select * into inv from public.invoices where id = link.invoice_id;
  if not found then return json_build_object('status', 'not_found'); end if;
  select count(*) into seq from public.invoices i2 where i2.user_id = inv.user_id
    and (i2.issue_date < inv.issue_date or (i2.issue_date = inv.issue_date and i2.created_at <= inv.created_at));
  return json_build_object('status', 'ok', 'invoice', json_build_object(
    'id', inv.id, 'service_description', inv.service_description, 'amount', inv.amount, 'status', inv.status,
    'issue_date', inv.issue_date, 'due_date', inv.due_date, 'project_type', inv.project_type,
    'rate_type', inv.rate_type, 'tracked_hours', inv.tracked_hours, 'hourly_rate', inv.hourly_rate, 'invoice_seq', seq,
    'client', (select json_build_object('name', c.name, 'company', c.company) from public.clients c where c.id = inv.client_id),
    'payment_method', (select json_build_object('name', pm.name, 'account_name', pm.account_name, 'details', pm.details, 'payment_link', pm.payment_link)
                       from public.payment_methods pm where pm.id = inv.payment_method_id),
    'business_name', (select p.business_name from public.profiles p where p.id = inv.user_id),
    'booking_slug', (select p.booking_slug from public.profiles p where p.id = inv.user_id),
    'currency', coalesce((select p.currency from public.profiles p where p.id = inv.user_id), 'USD')));
end; $$;
grant execute on function public.open_shared_link(uuid, text) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- Storage: PRIVATE `logos` bucket + per-user object policies.
-- NOT included inline here: `create policy on storage.objects` can fail with
-- "must be owner of table objects", which would roll back this whole script.
-- Set storage up separately via supabase/migrations/0005b_logos_storage.sql
-- (create the bucket in the Storage UI, then add the 4 policies).
-- -----------------------------------------------------------------------------

-- -----------------------------------------------------------------------------
-- user_settings — one row per user (Appearance & preferences). See 0008.
-- -----------------------------------------------------------------------------
create table if not exists public.user_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  theme text not null default 'system',
  font_size text not null default 'medium',
  density text not null default 'comfortable',
  sidebar_default text not null default 'expanded',
  date_format text not null default 'MM/DD/YYYY',
  number_format text not null default '1,000.00',
  default_currency text not null default 'USD',
  show_both_currencies boolean not null default false,
  dashboard_widget_order text[] not null
    default array['income', 'needs_attention', 'recent_payments', 'client_breakdown'],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists uniq_user_settings_user on public.user_settings (user_id);

drop trigger if exists trg_user_settings_updated on public.user_settings;
create trigger trg_user_settings_updated
  before update on public.user_settings
  for each row execute function public.set_updated_at();

alter table public.user_settings enable row level security;
drop policy if exists user_settings_select_own on public.user_settings;
create policy user_settings_select_own on public.user_settings
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists user_settings_insert_own on public.user_settings;
create policy user_settings_insert_own on public.user_settings
  for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists user_settings_update_own on public.user_settings;
create policy user_settings_update_own on public.user_settings
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- -----------------------------------------------------------------------------
-- Booking module v2 (0012): request/approve. Owner-only RLS; the public
-- /book/[slug] page reads/writes via SECURITY DEFINER RPCs, no service role.
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

-- Public booking RPCs — SECURITY DEFINER, slug-gated, anon-callable.
create or replace function public.get_booking_page(p_slug text)
returns json language plpgsql security definer set search_path = public as $$
declare p record;
begin
  select
    coalesce(nullif(btrim(business_name), ''), nullif(btrim(full_name), ''), 'Freelancer') as name,
    coalesce(timezone, 'UTC') as tz
  into p from public.profiles where booking_slug = p_slug;
  if not found then return json_build_object('found', false); end if;
  return json_build_object('found', true, 'display_name', p.name, 'timezone', p.tz);
end; $$;
grant execute on function public.get_booking_page(text) to anon, authenticated;

create or replace function public.get_available_dates(p_slug text, p_from date, p_to date)
returns json language plpgsql security definer set search_path = public as $$
declare target uuid; tz text; result json;
begin
  select id, coalesce(timezone, 'UTC') into target, tz
  from public.profiles where booking_slug = p_slug;
  if target is null then return json_build_object('found', false, 'dates', '[]'::json); end if;
  if p_from is null or p_from < current_date then p_from := current_date; end if;
  if p_from > current_date + 366 then return json_build_object('found', true, 'timezone', tz, 'dates', '[]'::json); end if;
  if p_to is null or p_to > p_from + 366 then p_to := p_from + 366; end if;
  select coalesce(json_agg(d.date order by d.date), '[]'::json) into result
  from public.available_dates d
  where d.user_id = target and d.date between p_from and p_to;
  return json_build_object('found', true, 'timezone', tz, 'dates', result);
end; $$;
grant execute on function public.get_available_dates(text, date, date) to anon, authenticated;

create or replace function public.create_booking(
  p_slug text, p_guest_name text, p_guest_email text,
  p_requested_date date, p_start time, p_end time, p_notes text
) returns json language plpgsql security definer set search_path = public as $$
declare target uuid; cid uuid;
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
  if target is null then return json_build_object('status', 'not_found'); end if;
  if p_requested_date < current_date then return json_build_object('status', 'invalid_request'); end if;
  if not exists (
    select 1 from public.available_dates d where d.user_id = target and d.date = p_requested_date
  ) then
    return json_build_object('status', 'date_unavailable');
  end if;
  select id into cid from public.clients
  where user_id = target and lower(email) = lower(btrim(p_guest_email)) and not is_archived limit 1;
  insert into public.bookings (
    user_id, client_id, guest_name, guest_email,
    requested_date, requested_start_time, requested_end_time, status, notes
  ) values (
    target, cid, btrim(p_guest_name), lower(btrim(p_guest_email)),
    p_requested_date, p_start, p_end, 'pending', nullif(btrim(coalesce(p_notes, '')), '')
  );
  return json_build_object('status', 'ok');
end; $$;
grant execute on function public.create_booking(text, text, text, date, time, time, text) to anon, authenticated;

-- =============================================================================
-- Done. Tables: profiles, clients, invoices, payments, payment_methods,
-- user_settings, available_dates, bookings (all RLS-protected, scoped TO
-- authenticated). Client-owner trigger on invoices + payments. Public booking
-- RPCs: get_booking_page / get_available_dates / create_booking (0012).
-- Logo storage: see 0005b_logos_storage.sql.
-- =============================================================================
