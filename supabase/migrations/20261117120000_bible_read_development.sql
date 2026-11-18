-- ===========================================================================
-- Development only (owner, 2026-11-17): the app may read the Bible's outline and text without signing in,
-- so the Bible reader can be built before sign-in exists. Read only; nothing can be written this way.
--
-- Before launch this is replaced: a person may read only the words of verses they have revealed
-- (public.revealed_verse), and covered verses send only their word lengths.
-- ===========================================================================

create policy "book: anyone may read (development)" on public.book
  for select to anon using (true);
create policy "chapter: anyone may read (development)" on public.chapter
  for select to anon using (true);
create policy "verse: anyone may read (development)" on public.verse
  for select to anon using (true);
create policy "verse_text: anyone may read (development)" on public.verse_text
  for select to anon using (true);

grant select on public.book, public.chapter, public.verse, public.verse_text to anon;
