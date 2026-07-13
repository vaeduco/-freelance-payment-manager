-- =============================================================================
-- Migration: Client archive flag
-- Run this in the Supabase SQL Editor (Dashboard -> SQL Editor -> New query).
-- Idempotent + additive: existing clients default to not-archived.
-- =============================================================================

alter table public.clients
  add column if not exists is_archived boolean not null default false;

create index if not exists idx_clients_user_archived
  on public.clients (user_id, is_archived);

-- =============================================================================
-- Done. clients gains is_archived (default false). Archiving is a flag — a
-- client's invoices/payments are untouched.
-- =============================================================================
