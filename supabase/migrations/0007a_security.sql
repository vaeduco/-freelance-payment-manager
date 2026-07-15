-- =============================================================================
-- 0007a — Security Center (Phase A)
-- Run in the Supabase SQL Editor. Idempotent + additive.
--
-- Adds profiles.password_checked_at — set when the user checks their password
-- against Have I Been Pwned and it's clean; feeds the Security Score.
-- (2FA/MFA needs no schema — Supabase manages auth.mfa_factors.)
-- =============================================================================

alter table public.profiles
  add column if not exists password_checked_at timestamptz;

-- =============================================================================
-- Done. profiles gains password_checked_at.
-- =============================================================================
