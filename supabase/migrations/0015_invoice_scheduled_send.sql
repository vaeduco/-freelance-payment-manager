-- =============================================================================
-- 0015 — Scheduled-send placeholder for invoices. Idempotent + additive.
-- Run in the Supabase SQL Editor.
--
-- Adds invoices.scheduled_send_at so an invoice can be marked as scheduled for a
-- future date (surfaced by the dashboard Calendar widget). This is the data
-- structure only — no auto-send logic runs off it yet.
-- =============================================================================

alter table public.invoices add column if not exists scheduled_send_at timestamptz;
create index if not exists idx_invoices_scheduled
  on public.invoices (user_id, scheduled_send_at)
  where scheduled_send_at is not null;

-- =============================================================================
-- Done. invoices.scheduled_send_at (nullable) — placeholder, no send job.
-- =============================================================================
