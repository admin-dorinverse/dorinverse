-- ===========================================================================
-- Development only (owner, 2026-11-18): the app may read place cards, their places and moments, and which
-- verses name each place, without signing in, so the Places pages can be built before sign-in exists. Read only.
--
-- Before launch this is replaced: a person may read only the cards of places they have collected.
-- ===========================================================================

create policy "place_card: anyone may read (development)" on public.place_card
  for select to anon using (true);
create policy "place_card_place: anyone may read (development)" on public.place_card_place
  for select to anon using (true);
create policy "place_card_moment: anyone may read (development)" on public.place_card_moment
  for select to anon using (true);
create policy "place_card_moment_verse: anyone may read (development)" on public.place_card_moment_verse
  for select to anon using (true);
create policy "verse_place: anyone may read (development)" on public.verse_place
  for select to anon using (true);

grant select on public.place_card, public.place_card_place, public.place_card_moment, public.place_card_moment_verse, public.verse_place to anon;
