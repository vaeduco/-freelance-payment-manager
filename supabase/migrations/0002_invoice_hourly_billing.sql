-- =============================================================================
-- Migration: Hourly billing on invoices
-- Run this in the Supabase SQL Editor (Dashboard -> SQL Editor -> New query).
-- Idempotent + additive: existing invoices default to 'fixed' and are unaffected.
-- =============================================================================

alter table public.invoices
  add column if not exists rate_type text not null default 'fixed'
    check (rate_type in ('fixed', 'hourly'));

alter table public.invoices
  add column if not exists tracked_hours numeric(10, 2)
    check (tracked_hours is null or tracked_hours >= 0);

alter table public.invoices
  add column if not exists hourly_rate numeric(12, 2)
    check (hourly_rate is null or hourly_rate >= 0);

-- =============================================================================
-- Done. invoices gains: rate_type ('fixed'|'hourly', default 'fixed'),
-- tracked_hours, hourly_rate (both nullable). Amount stays the source of truth
-- for totals/income; for hourly invoices amount = tracked_hours * hourly_rate.
-- =============================================================================
