-- =============================================================================
-- 0011 — "Book a call" on the public shared invoice (Phase D)
-- Run in the Supabase SQL Editor. Idempotent (create or replace).
--
-- Extends open_shared_link to also return the invoice owner's booking_slug, so
-- the public /s/[token] invoice can show a "Book a call" button linking to
-- /book/[slug]. No new data exposed beyond the (public) booking handle.
-- =============================================================================

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

-- =============================================================================
-- Done (Phase D). open_shared_link now returns booking_slug for the "Book a call" CTA.
-- =============================================================================
