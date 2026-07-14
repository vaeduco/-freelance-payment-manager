-- =============================================================================
-- 0005b — Private `logos` storage bucket + per-user object policies
--
-- STEP 1 (do this FIRST, in the dashboard — most reliable):
--   Storage → New bucket → Name: logos → Public bucket: OFF (private) → Create.
--   (Optional: set File size limit 2 MB; Allowed MIME types
--    image/png, image/jpeg, image/webp, image/svg+xml.)
--
-- STEP 2: run the four policies below in the SQL Editor.
--   If this errors with `must be owner of table objects`, your project doesn't
--   allow policy DDL on storage.objects from the SQL Editor — instead add them
--   via Storage → Policies → New policy on the `logos` bucket: one policy each
--   for SELECT, INSERT, UPDATE, DELETE, target role `authenticated`, using the
--   same expression:
--       (bucket_id = 'logos' and (storage.foldername(name))[1] = (select auth.uid())::text)
--
-- Path convention: every object lives under `<auth.uid()>/…`, so each user can
-- only read/write their own folder. Objects are NOT public-read; the app serves
-- them via short-lived signed URLs generated server-side.
-- =============================================================================

drop policy if exists "logos read own" on storage.objects;
create policy "logos read own" on storage.objects
  for select to authenticated
  using (bucket_id = 'logos'
         and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "logos insert own" on storage.objects;
create policy "logos insert own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'logos'
              and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "logos update own" on storage.objects;
create policy "logos update own" on storage.objects
  for update to authenticated
  using (bucket_id = 'logos'
         and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'logos'
              and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "logos delete own" on storage.objects;
create policy "logos delete own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'logos'
         and (storage.foldername(name))[1] = (select auth.uid())::text);
