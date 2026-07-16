-- =============================================================================
-- 0008 — User settings (Appearance & preferences)
-- Run in the Supabase SQL Editor. Idempotent + additive — safe to run over an
-- existing user_settings table (create is a no-op; missing columns are added;
-- RLS/policies/trigger are (re)applied).
--
-- One row per user. Owner-only RLS. Powers /settings/appearance and drives
-- theme / font size / density / dashboard widget order app-wide.
-- =============================================================================

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

-- Additive: guarantee every column exists even if the table predates this file.
alter table public.user_settings add column if not exists id uuid default gen_random_uuid();
alter table public.user_settings add column if not exists user_id uuid references auth.users (id) on delete cascade;
alter table public.user_settings add column if not exists theme text;
alter table public.user_settings add column if not exists font_size text;
alter table public.user_settings add column if not exists density text;
alter table public.user_settings add column if not exists sidebar_default text;
alter table public.user_settings add column if not exists date_format text;
alter table public.user_settings add column if not exists number_format text;
alter table public.user_settings add column if not exists default_currency text;
alter table public.user_settings add column if not exists show_both_currencies boolean;
alter table public.user_settings add column if not exists dashboard_widget_order text[];
alter table public.user_settings add column if not exists created_at timestamptz not null default now();
alter table public.user_settings add column if not exists updated_at timestamptz not null default now();

-- Sensible defaults on the preference columns (no-op if already set).
alter table public.user_settings alter column theme set default 'system';
alter table public.user_settings alter column font_size set default 'medium';
alter table public.user_settings alter column density set default 'comfortable';
alter table public.user_settings alter column sidebar_default set default 'expanded';
alter table public.user_settings alter column date_format set default 'MM/DD/YYYY';
alter table public.user_settings alter column number_format set default '1,000.00';
alter table public.user_settings alter column default_currency set default 'USD';
alter table public.user_settings alter column show_both_currencies set default false;
alter table public.user_settings alter column dashboard_widget_order
  set default array['income', 'needs_attention', 'recent_payments', 'client_breakdown'];

-- Exactly one settings row per user.
create unique index if not exists uniq_user_settings_user on public.user_settings (user_id);

drop trigger if exists trg_user_settings_updated on public.user_settings;
create trigger trg_user_settings_updated
  before update on public.user_settings
  for each row execute function public.set_updated_at();

-- RLS: owners fully manage their own row; nobody else can see or touch it.
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

-- =============================================================================
-- Done. user_settings (owner RLS, one row/user) powers Appearance settings.
-- =============================================================================
