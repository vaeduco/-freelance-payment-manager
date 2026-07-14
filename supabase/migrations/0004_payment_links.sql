-- =============================================================================
-- 0004 — Payment links
-- Adds an optional payment link/number to each payment method (PayPal.me URL,
-- Wise link, GCash number/link, …) so invoices can show a "Pay via [Method]"
-- button. Additive + idempotent — safe to run more than once.
-- =============================================================================

alter table public.payment_methods
  add column if not exists payment_link text;
