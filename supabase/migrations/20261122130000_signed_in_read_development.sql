-- Signed-in people can read the same content as signed-out people while the app is in development (2026-11-22).
-- The *_read_development migrations only let the anon role read the Bible, lessons, cards and cookies. Once
-- sign-in arrived, a signed-in phone asks as the authenticated role and was refused, so new lessons stopped
-- loading. Each development read rule and grant below now covers both roles; all go away at hookup.

-- From 20261117120000_bible_read_development.sql
alter policy "book: anyone may read (development)" on public.book to anon, authenticated;
alter policy "chapter: anyone may read (development)" on public.chapter to anon, authenticated;
alter policy "verse: anyone may read (development)" on public.verse to anon, authenticated;
alter policy "verse_text: anyone may read (development)" on public.verse_text to anon, authenticated;
grant select on public.book, public.chapter, public.verse, public.verse_text to authenticated;

-- From 20261117130000_footnote_read_development.sql
alter policy "bsb_footnote: anyone may read (development)" on public.bsb_footnote to anon, authenticated;
grant select on public.bsb_footnote to authenticated;

-- From 20261118120000_character_read_development.sql
alter policy "character_card: anyone may read published (development)" on public.character_card to anon, authenticated;
alter policy "character_card_verse: anyone may read (development)" on public.character_card_verse to anon, authenticated;
alter policy "character_card_place: anyone may read (development)" on public.character_card_place to anon, authenticated;
alter policy "character_connection: anyone may read published (development)" on public.character_connection to anon, authenticated;
alter policy "place: anyone may read names (development)" on public.place to anon, authenticated;
alter policy "bible_character: anyone may read lookups (development)" on public.bible_character to anon, authenticated;
grant select on public.character_card, public.character_card_verse, public.character_card_place, public.character_connection to authenticated;
grant select (id, lookup, name) on public.place to authenticated;
grant select (id, lookup, name) on public.bible_character to authenticated;

-- From 20261118130000_place_read_development.sql
alter policy "place_card: anyone may read (development)" on public.place_card to anon, authenticated;
alter policy "place_card_place: anyone may read (development)" on public.place_card_place to anon, authenticated;
alter policy "place_card_moment: anyone may read (development)" on public.place_card_moment to anon, authenticated;
alter policy "place_card_moment_verse: anyone may read (development)" on public.place_card_moment_verse to anon, authenticated;
alter policy "verse_place: anyone may read (development)" on public.verse_place to anon, authenticated;
grant select on public.place_card, public.place_card_place, public.place_card_moment, public.place_card_moment_verse, public.verse_place to authenticated;

-- From 20261118150000_cookie_read_development.sql
alter policy "sample_cookie: anyone may read (development)" on public.sample_cookie to anon, authenticated;
alter policy "sample_cookie_line: anyone may read (development)" on public.sample_cookie_line to anon, authenticated;
alter policy "sample_cookie_verse: anyone may read (development)" on public.sample_cookie_verse to anon, authenticated;
alter policy "jesus_prophecy_link: anyone may read approved (development)" on public.jesus_prophecy_link to anon, authenticated;
grant select on public.sample_cookie, public.sample_cookie_line, public.sample_cookie_verse, public.jesus_prophecy_link to authenticated;

-- From 20261118160000_lesson_read_development.sql
alter policy "passage: anyone may read (development)" on public.passage to anon, authenticated;
alter policy "passage_included: anyone may read (development)" on public.passage_included to anon, authenticated;
alter policy "passage_stop: anyone may read (development)" on public.passage_stop to anon, authenticated;
alter policy "passage_card: anyone may read (development)" on public.passage_card to anon, authenticated;
alter policy "card_verse: anyone may read (development)" on public.card_verse to anon, authenticated;
alter policy "card_answer: anyone may read (development)" on public.card_answer to anon, authenticated;
alter policy "lesson_word: anyone may read (development)" on public.lesson_word to anon, authenticated;
alter policy "lesson_word_meaning: anyone may read (development)" on public.lesson_word_meaning to anon, authenticated;
alter policy "card_word: anyone may read (development)" on public.card_word to anon, authenticated;
alter policy "lesson_idiom: anyone may read (development)" on public.lesson_idiom to anon, authenticated;
alter policy "lesson_idiom_meaning: anyone may read (development)" on public.lesson_idiom_meaning to anon, authenticated;
alter policy "lesson_idiom_verse: anyone may read (development)" on public.lesson_idiom_verse to anon, authenticated;
alter policy "card_idiom: anyone may read (development)" on public.card_idiom to anon, authenticated;
grant select on public.passage, public.passage_included, public.passage_stop, public.passage_card, public.card_verse, public.card_answer, public.lesson_word, public.lesson_word_meaning, public.card_word, public.lesson_idiom, public.lesson_idiom_meaning, public.lesson_idiom_verse, public.card_idiom to authenticated;

-- From 20261120120000_kitchen_read_development.sql
alter policy "burnt_line: anyone may read (development)" on public.burnt_line to anon, authenticated;
alter policy "burnt_line_wrong: anyone may read (development)" on public.burnt_line_wrong to anon, authenticated;
alter policy "big_idea_paragraph: anyone may read (development)" on public.big_idea_paragraph to anon, authenticated;
grant select on public.burnt_line, public.burnt_line_wrong, public.big_idea_paragraph to authenticated;

-- From 20261121120000_trivia_read_development.sql
alter policy "trivia_question: anyone may read (development)" on public.trivia_question to anon, authenticated;
alter policy "trivia_answer: anyone may read (development)" on public.trivia_answer to anon, authenticated;
alter policy "trivia_question_verse: anyone may read (development)" on public.trivia_question_verse to anon, authenticated;
grant select on public.trivia_question, public.trivia_answer, public.trivia_question_verse to authenticated;

