-- ===========================================================================
-- Development only (owner, 2026-11-18): the app may read the collectible cookies (instructions, the Ten
-- Commandments pack, prayers and prophecy halves), their verses, and the approved prophecy links without signing
-- in, so the Prophecy, Instructions and Prayers pages can be built before sign-in exists. Read only.
--
-- Before launch this is replaced: a person may read only the cookies they have collected.
-- ===========================================================================

create policy "sample_cookie: anyone may read (development)" on public.sample_cookie
  for select to anon using (true);
create policy "sample_cookie_line: anyone may read (development)" on public.sample_cookie_line
  for select to anon using (true);
create policy "sample_cookie_verse: anyone may read (development)" on public.sample_cookie_verse
  for select to anon using (true);
create policy "jesus_prophecy_link: anyone may read approved (development)" on public.jesus_prophecy_link
  for select to anon using (approved);

grant select on public.sample_cookie, public.sample_cookie_line, public.sample_cookie_verse, public.jesus_prophecy_link to anon;
