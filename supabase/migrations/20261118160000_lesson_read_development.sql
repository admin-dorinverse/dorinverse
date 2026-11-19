-- ===========================================================================
-- Development only (owner, 2026-11-18): the app may read the lessons (passages, stops, story and choice cards,
-- answers with their explanations, and the words and idioms explained on cards) without signing in, so the
-- lessons can be played before sign-in and the server exist. Read only.
--
-- Before launch this is replaced: answers stay on the server, which checks each answer and sends back
-- right or wrong with the explanation; the phone never holds a card's answers ahead of time.
-- ===========================================================================

create policy "passage: anyone may read (development)" on public.passage
  for select to anon using (true);
create policy "passage_included: anyone may read (development)" on public.passage_included
  for select to anon using (true);
create policy "passage_stop: anyone may read (development)" on public.passage_stop
  for select to anon using (true);
create policy "passage_card: anyone may read (development)" on public.passage_card
  for select to anon using (true);
create policy "card_verse: anyone may read (development)" on public.card_verse
  for select to anon using (true);
create policy "card_answer: anyone may read (development)" on public.card_answer
  for select to anon using (true);
create policy "lesson_word: anyone may read (development)" on public.lesson_word
  for select to anon using (true);
create policy "lesson_word_meaning: anyone may read (development)" on public.lesson_word_meaning
  for select to anon using (true);
create policy "card_word: anyone may read (development)" on public.card_word
  for select to anon using (true);
create policy "lesson_idiom: anyone may read (development)" on public.lesson_idiom
  for select to anon using (true);
create policy "lesson_idiom_meaning: anyone may read (development)" on public.lesson_idiom_meaning
  for select to anon using (true);
create policy "lesson_idiom_verse: anyone may read (development)" on public.lesson_idiom_verse
  for select to anon using (true);
create policy "card_idiom: anyone may read (development)" on public.card_idiom
  for select to anon using (true);

grant select on public.passage, public.passage_included, public.passage_stop, public.passage_card, public.card_verse, public.card_answer, public.lesson_word, public.lesson_word_meaning, public.card_word, public.lesson_idiom, public.lesson_idiom_meaning, public.lesson_idiom_verse, public.card_idiom to anon;
