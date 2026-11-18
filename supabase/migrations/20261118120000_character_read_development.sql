-- ===========================================================================
-- Development only (owner, 2026-11-18): the app may read published character cards, their verses, places and
-- connections without signing in, so the Characters pages can be built before sign-in exists. Read only.
-- Places and the people list share only their id, lookup and name.
--
-- Before launch this is replaced: a person may read only the cards of characters they have collected.
-- ===========================================================================

create policy "character_card: anyone may read published (development)" on public.character_card
  for select to anon using (status = 'published');
create policy "character_card_verse: anyone may read (development)" on public.character_card_verse
  for select to anon using (true);
create policy "character_card_place: anyone may read (development)" on public.character_card_place
  for select to anon using (true);
create policy "character_connection: anyone may read published (development)" on public.character_connection
  for select to anon using (status = 'published');
create policy "place: anyone may read names (development)" on public.place
  for select to anon using (true);
create policy "bible_character: anyone may read lookups (development)" on public.bible_character
  for select to anon using (true);

grant select on public.character_card, public.character_card_verse, public.character_card_place, public.character_connection to anon;
grant select (id, lookup, name) on public.place to anon;
grant select (id, lookup, name) on public.bible_character to anon;
