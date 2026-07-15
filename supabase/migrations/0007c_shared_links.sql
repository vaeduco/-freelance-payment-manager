-- =============================================================================
-- 0007c — Secure invoice sharing
-- Run in the Supabase SQL Editor. Idempotent + additive. (pgcrypto is already
-- enabled by the base schema — used here for bcrypt password hashing.)
--
-- A shared_links row is a capability: an unguessable token that opens ONE
-- invoice, optionally gated by a password, an expiry, and a max view count, and
-- revocable at any time. Owners manage links under RLS; the public read path is
-- three SECURITY DEFINER RPCs (token is the capability, so anon can call them).
-- =============================================================================

-- pgcrypto provides crypt()/gen_salt() for bcrypt password hashing. Install it
-- into the `extensions` schema (Supabase's convention) if it isn't already —
-- the RPCs below include `extensions` in their search_path. (If it's already
-- installed elsewhere, this no-ops and the public entry in the path covers it.)
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.shared_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  token uuid not null default gen_random_uuid(),
  password_hash text,              -- bcrypt (pgcrypto); null = no password
  expires_at timestamptz,          -- null = never expires
  max_views integer check (max_views is null or max_views >= 1), -- null = unlimited
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

-- RLS: owners manage their own links (select/update/delete). No INSERT policy —
-- creation goes through create_shared_link() so the password is hashed server-side.
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

-- -----------------------------------------------------------------------------
-- create_shared_link — owner-only. Verifies the invoice belongs to the caller,
-- hashes the password with bcrypt, and upserts one link per invoice (stable
-- token; reconfiguring resets revoked + view_count).
-- -----------------------------------------------------------------------------
create or replace function public.create_shared_link(
  p_invoice_id uuid,
  p_password text,
  p_expires_at timestamptz,
  p_max_views integer
)
returns json
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  uid uuid := auth.uid();
  row public.shared_links;
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = 'insufficient_privilege';
  end if;
  if not exists (
    select 1 from public.invoices i where i.id = p_invoice_id and i.user_id = uid
  ) then
    raise exception 'invoice not found' using errcode = 'check_violation';
  end if;

  insert into public.shared_links (
    user_id, invoice_id, token, password_hash, expires_at, max_views, revoked, view_count
  )
  values (
    uid, p_invoice_id, gen_random_uuid(),
    case when p_password is null or length(p_password) = 0
         then null else crypt(p_password, gen_salt('bf')) end,
    p_expires_at,
    case when p_max_views is null or p_max_views < 1 then null else p_max_views end,
    false, 0
  )
  on conflict (invoice_id) do update set
    password_hash = case when p_password is null or length(p_password) = 0
                         then null else crypt(p_password, gen_salt('bf')) end,
    expires_at = excluded.expires_at,
    max_views = excluded.max_views,
    revoked = false,
    view_count = 0,
    updated_at = now()
  returning * into row;

  return json_build_object(
    'token', row.token,
    'has_password', row.password_hash is not null,
    'expires_at', row.expires_at,
    'max_views', row.max_views,
    'view_count', row.view_count,
    'revoked', row.revoked
  );
end;
$$;
grant execute on function public.create_shared_link(uuid, text, timestamptz, integer) to authenticated;

-- -----------------------------------------------------------------------------
-- peek_shared_link — anon. Reports whether the link is usable and whether a
-- password is required, WITHOUT returning any invoice data or incrementing views.
-- -----------------------------------------------------------------------------
create or replace function public.peek_shared_link(p_token uuid)
returns json
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  link public.shared_links;
  st text;
begin
  select * into link from public.shared_links where token = p_token;
  if not found then
    return json_build_object('status', 'not_found', 'requires_password', false);
  end if;
  if link.revoked then st := 'revoked';
  elsif link.expires_at is not null and link.expires_at < now() then st := 'expired';
  elsif link.max_views is not null and link.view_count >= link.max_views then st := 'limit';
  else st := 'ok';
  end if;
  return json_build_object('status', st, 'requires_password', link.password_hash is not null);
end;
$$;
grant execute on function public.peek_shared_link(uuid) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- open_shared_link — anon. Enforces revoked/expiry/max_views + password, then
-- increments view_count and returns the invoice for rendering. Returns a status
-- string on any failure (never the invoice unless status='ok').
-- -----------------------------------------------------------------------------
create or replace function public.open_shared_link(p_token uuid, p_password text)
returns json
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  link public.shared_links;
  inv public.invoices;
  seq integer;
begin
  select * into link from public.shared_links where token = p_token;
  if not found then return json_build_object('status', 'not_found'); end if;
  if link.revoked then return json_build_object('status', 'revoked'); end if;
  if link.expires_at is not null and link.expires_at < now() then
    return json_build_object('status', 'expired');
  end if;
  if link.password_hash is not null then
    if p_password is null or crypt(p_password, link.password_hash) <> link.password_hash then
      return json_build_object('status', 'bad_password');
    end if;
  end if;

  -- Atomically consume one view, enforcing max_views without a check-then-act
  -- race: the conditional UPDATE row-locks and re-evaluates the cap, so
  -- concurrent opens can never exceed the limit. 0 rows affected -> over limit.
  update public.shared_links set view_count = view_count + 1
    where id = link.id and (max_views is null or view_count < max_views);
  if not found then return json_build_object('status', 'limit'); end if;

  select * into inv from public.invoices where id = link.invoice_id;
  if not found then return json_build_object('status', 'not_found'); end if;

  select count(*) into seq
  from public.invoices i2
  where i2.user_id = inv.user_id
    and (i2.issue_date < inv.issue_date
      or (i2.issue_date = inv.issue_date and i2.created_at <= inv.created_at));

  return json_build_object(
    'status', 'ok',
    'invoice', json_build_object(
      'id', inv.id,
      'service_description', inv.service_description,
      'amount', inv.amount,
      'status', inv.status,
      'issue_date', inv.issue_date,
      'due_date', inv.due_date,
      'project_type', inv.project_type,
      'rate_type', inv.rate_type,
      'tracked_hours', inv.tracked_hours,
      'hourly_rate', inv.hourly_rate,
      'invoice_seq', seq,
      'client', (select json_build_object('name', c.name, 'company', c.company)
                 from public.clients c where c.id = inv.client_id),
      'payment_method', (select json_build_object('name', pm.name, 'account_name', pm.account_name,
                                                  'details', pm.details, 'payment_link', pm.payment_link)
                         from public.payment_methods pm where pm.id = inv.payment_method_id),
      'business_name', (select p.business_name from public.profiles p where p.id = inv.user_id),
      'currency', coalesce((select p.currency from public.profiles p where p.id = inv.user_id), 'USD')
    )
  );
end;
$$;
grant execute on function public.open_shared_link(uuid, text) to anon, authenticated;

-- =============================================================================
-- Done. shared_links (owner RLS) + create/peek/open RPCs power /s/[token].
-- =============================================================================
