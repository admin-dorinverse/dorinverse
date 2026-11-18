-- ===========================================================================
-- Development only (owner, 2026-11-17): the app may read BSB footnotes without signing in, so the Bible reader
-- can show them before sign-in exists. Read only; nothing can be written this way.
--
-- Before launch this is replaced, like 20261117120000_bible_read_development: a person may read only the
-- footnotes of verses they have revealed (public.revealed_verse).
-- ===========================================================================

create policy "bsb_footnote: anyone may read (development)" on public.bsb_footnote
  for select to anon using (true);

grant select on public.bsb_footnote to anon;
