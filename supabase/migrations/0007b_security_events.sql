-- =============================================================================
-- 0007b — Security Center (Phase B): security_events
-- Run in the Supabase SQL Editor. Idempotent + additive.
--
-- One table powers three views: Audit Log (all rows), Login History
-- (category='auth'), and Security Alerts (is_alert=true; unread = read_at null).
-- =============================================================================

create table if not exists public.security_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category text not null,      -- auth | invoice | client | payment | payment_method | report | security
  action text not null,        -- e.g. login, invoice.create, password.change, report.export
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

-- Update is allowed only to mark alerts read (read_at); no delete policy, so the
-- activity log can't be wiped from the client. (Note: with the anon key the app
-- can't make rows fully immutable — this is a personal activity view, not a
-- tamper-proof compliance log.)
drop policy if exists security_events_update_own on public.security_events;
create policy security_events_update_own on public.security_events
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- =============================================================================
-- Done. New table: security_events (RLS-protected, owner-scoped).
-- =============================================================================
