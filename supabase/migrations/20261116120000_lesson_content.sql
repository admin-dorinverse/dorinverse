-- The finished lesson data (scripts/dough-maker/output/ and data/) as tables. Filled by
-- scripts/dough-maker/load-db.mjs, which is safe to run again: every table has a natural key taken from the
-- files (passage number, stop, card, word, idiom number, place lookup, ...), and the load updates rows in
-- place and removes rows no longer in the files.
--
-- How it links:
--   passage -> passage_stop -> passage_card -> card_verse (the verses the card tells)
--                                           -> card_answer (choice cards: answers + explanations)
--                                           -> card_word / card_idiom (pop-ups, with the one meaning that fits)
--   passage -> burnt_line, big_idea_paragraph, trivia_question (-> trivia_answer, trivia_question_verse)
--   sample_cookie -> sample_cookie_verse: every verse the cookie's subject is told in (owner ruling
--   2026-11-16: the app decides whether to show it on a card, from the card's verses and whether the player
--   has earned it). A place cookie points at place_card; a character cookie at character_card.
--
-- The older lesson tables (cookie_lesson, question, word, idiom, ...) are left as they are.

-- Loader staging schema: each run the loader recreates stage.<table> (like public.<table>), fills it in
-- chunks, then merges everything in one transaction.
create schema if not exists stage;
revoke all on schema stage from public, anon, authenticated;

-- ---- Lessons ------------------------------------------------------------------------------------------

create table public.passage (
  id             integer primary key check (id > 0),
  folder         text not null unique check (btrim(folder) <> ''),   -- output folder, e.g. "0001 Genesis 1.1-2.3"
  title          text not null check (btrim(title) <> ''),
  start_ref      text not null,
  end_ref        text not null,
  from_verse_id  uuid not null references public.verse (id) on delete restrict,
  to_verse_id    uuid not null references public.verse (id) on delete restrict,
  type           text not null check (type in ('Narrative', 'Sermons', 'Poetry & Wisdom', 'Prophetic', 'Parables', 'Letters')),
  story_group    text,
  story_position text          -- e.g. "1 of 3"
);
comment on table public.passage is 'The 1,558 lessons, from output/passages.json.';

-- A sermon or parable told inside a passage (passages.json "included")
create table public.passage_included (
  passage_id    integer not null references public.passage (id) on delete cascade,
  position      smallint not null check (position >= 1),
  kind          text not null check (kind in ('sermon', 'parable')),
  start_ref     text not null,
  end_ref       text not null,
  from_verse_id uuid not null references public.verse (id) on delete restrict,
  to_verse_id   uuid not null references public.verse (id) on delete restrict,
  primary key (passage_id, position)
);

create table public.passage_stop (
  passage_id    integer not null references public.passage (id) on delete cascade,
  stop          smallint not null check (stop >= 1),
  verses        text not null,
  from_verse_id uuid not null references public.verse (id) on delete restrict,
  to_verse_id   uuid not null references public.verse (id) on delete restrict,
  primary key (passage_id, stop)
);

-- Prep walkthrough cards. Card numbers restart in each stop.
create table public.passage_card (
  passage_id    integer not null,
  stop          smallint not null,
  card          smallint not null check (card >= 1),
  kind          text not null check (kind in ('story', 'choice')),
  verses        text not null,
  text          text,          -- story card
  question      text,          -- choice card
  question_type text check (question_type in ('multiple_choice', 'true_false', 'fill_blank')),
  primary key (passage_id, stop, card),
  foreign key (passage_id, stop) references public.passage_stop (passage_id, stop) on delete cascade,
  check (case kind when 'story' then text is not null and question is null and question_type is null
                   else text is null and question is not null and question_type is not null end)
);

create table public.card_verse (
  passage_id integer not null,
  stop       smallint not null,
  card       smallint not null,
  verse_id   uuid not null references public.verse (id) on delete restrict,
  primary key (passage_id, stop, card, verse_id),
  foreign key (passage_id, stop, card) references public.passage_card (passage_id, stop, card) on delete cascade
);
create index card_verse_verse on public.card_verse (verse_id);

-- Answers on choice cards, with their explanations (output/answers/)
create table public.card_answer (
  passage_id  integer not null,
  stop        smallint not null,
  card        smallint not null,
  position    smallint not null check (position >= 1),
  text        text not null check (btrim(text) <> ''),
  correct     boolean not null,
  blank       smallint check (blank in (1, 2)),   -- two-blank fill in the blank: the blank this right word fills
  explanation text not null check (btrim(explanation) <> ''),
  primary key (passage_id, stop, card, position),
  check (blank is null or correct),
  foreign key (passage_id, stop, card) references public.passage_card (passage_id, stop, card) on delete cascade
);
-- One right answer per card, or per blank on a two-blank card. Deferred, so a reload can move the right answer.
alter table public.card_answer add constraint card_answer_one_correct
  exclude using btree (passage_id with =, stop with =, card with =, (coalesce(blank, 0)) with =) where (correct)
  deferrable initially deferred;

create table public.burnt_line (
  passage_id integer not null references public.passage (id) on delete cascade,
  line       smallint not null check (line >= 1),
  verses     text not null,
  text       text not null check (btrim(text) <> ''),
  burnt      boolean not null,
  primary key (passage_id, line)
);
-- What is wrong in a burnt line, and the true words (the correction the app shows)
create table public.burnt_line_wrong (
  passage_id integer not null,
  line       smallint not null,
  position   smallint not null check (position >= 1),
  wrong      text not null check (btrim(wrong) <> ''),
  true_text  text not null check (btrim(true_text) <> ''),
  verse         text not null,          -- the verse that has the true words (once a short range)
  from_verse_id uuid not null references public.verse (id) on delete restrict,
  to_verse_id   uuid not null references public.verse (id) on delete restrict,
  primary key (passage_id, line, position),
  foreign key (passage_id, line) references public.burnt_line (passage_id, line) on delete cascade
);
create table public.burnt_line_verse (
  passage_id integer not null,
  line       smallint not null,
  verse_id   uuid not null references public.verse (id) on delete restrict,
  primary key (passage_id, line, verse_id),
  foreign key (passage_id, line) references public.burnt_line (passage_id, line) on delete cascade
);
create index burnt_line_verse_verse on public.burnt_line_verse (verse_id);

create table public.big_idea_paragraph (
  passage_id integer not null references public.passage (id) on delete cascade,
  paragraph  smallint not null check (paragraph >= 1),
  text       text not null check (btrim(text) <> ''),
  primary key (passage_id, paragraph)
);

-- ---- Definitions (Bible words) and idioms -------------------------------------------------------------

create table public.lesson_word (
  word  text primary key check (btrim(word) <> ''),
  forms text[] not null default '{}'
);
create table public.lesson_word_meaning (
  word       text not null references public.lesson_word (word) on delete cascade on update cascade,
  meaning_no smallint not null check (meaning_no >= 1),
  meaning    text not null check (btrim(meaning) <> ''),
  sources    text[] not null,
  primary key (word, meaning_no)
);
create table public.card_word (
  passage_id integer not null,
  stop       smallint not null,
  card       smallint not null,
  word       text not null,
  meaning_no smallint not null,
  primary key (passage_id, stop, card, word),
  foreign key (passage_id, stop, card) references public.passage_card (passage_id, stop, card) on delete cascade,
  foreign key (word, meaning_no) references public.lesson_word_meaning (word, meaning_no) on delete cascade on update cascade
);
create index card_word_word on public.card_word (word, meaning_no);

create table public.lesson_idiom (
  id      integer primary key,          -- the idiom's id in data/idioms.json and output/idioms/idioms.json
  idiom   text not null check (btrim(idiom) <> ''),
  debated boolean not null
);
create table public.lesson_idiom_meaning (
  idiom_id   integer not null references public.lesson_idiom (id) on delete cascade,
  meaning_no smallint not null check (meaning_no >= 1),
  meaning    text not null check (btrim(meaning) <> ''),
  sources    text[] not null,
  primary key (idiom_id, meaning_no)
);
create table public.lesson_idiom_verse (
  idiom_id integer not null references public.lesson_idiom (id) on delete cascade,
  verse_id uuid not null references public.verse (id) on delete restrict,
  primary key (idiom_id, verse_id)
);
create index lesson_idiom_verse_verse on public.lesson_idiom_verse (verse_id);
create table public.card_idiom (
  passage_id integer not null,
  stop       smallint not null,
  card       smallint not null,
  idiom_id   integer not null,
  meaning_no smallint not null,
  primary key (passage_id, stop, card, idiom_id),
  foreign key (passage_id, stop, card) references public.passage_card (passage_id, stop, card) on delete cascade,
  foreign key (idiom_id, meaning_no) references public.lesson_idiom_meaning (idiom_id, meaning_no) on delete cascade
);
create index card_idiom_idiom on public.card_idiom (idiom_id, meaning_no);

-- ---- Place cards --------------------------------------------------------------------------------------

create table public.place_card (
  lookup            text primary key,      -- place-cards.json lookup, e.g. "jerusalems_637"
  name              text not null check (btrim(name) <> ''),
  kind              text,
  kind_from         text,
  line              text not null check (btrim(line) <> ''),
  sources           text[] not null,
  -- photo (data/place-images/images.json); all null = no photo, the app shows the default image
  image_path        text,                  -- object path in the place-images storage bucket
  image_author      text,
  image_credit      text,
  image_credit_url  text,
  image_license     text,
  image_description text,
  image_source_url  text,
  image_file_url    text,
  image_from        text,
  image_openbible_place text,
  image_openbible_id    text,
  image_satellite   boolean,
  check ((image_path is null) = (image_license is null))
);
create table public.place_card_place (
  lookup   text not null references public.place_card (lookup) on delete cascade,
  place_id uuid not null references public.place (id) on delete restrict,
  primary key (lookup, place_id)
);
create index place_card_place_place on public.place_card_place (place_id);
create table public.place_card_moment (
  lookup   text not null references public.place_card (lookup) on delete cascade,
  position smallint not null check (position >= 1),
  title    text not null check (btrim(title) <> ''),
  text     text not null check (btrim(text) <> ''),
  passage  text not null,
  primary key (lookup, position)
);
create table public.place_card_moment_verse (
  lookup   text not null,
  position smallint not null,
  verse_id uuid not null references public.verse (id) on delete restrict,
  primary key (lookup, position, verse_id),
  foreign key (lookup, position) references public.place_card_moment (lookup, position) on delete cascade
);
create index place_card_moment_verse_verse on public.place_card_moment_verse (verse_id);

-- ---- Sample Table cookies -----------------------------------------------------------------------------

create table public.sample_cookie (
  key                text primary key,     -- e.g. "place:jerusalems_637", "prayer:Genesis 24:12-14", "prophecy:1:fulfillment:Acts 3:25"
  type               text not null check (type in ('ten_commandments', 'instruction', 'prayer', 'prophecy', 'character', 'place')),
  reference          text,                 -- instruction, prayer, prophecy
  instruction        text,
  who                text,                 -- instruction, prayer
  reason             text,
  what_just_happened text,
  key_line           text,
  prayed_at          text,                 -- prayer: the verse the prayer starts in
  -- where the Sample Table rules placed it (sample-table.json); the app may show it on any card telling its verses
  passage_id         integer,
  stop               smallint,
  card               smallint,
  placed_by          text,
  prophecy_link_id   uuid references public.jesus_prophecy_link (id) on delete restrict,
  prophecy_link_no   integer,              -- the link's id in data/prophecy-links.json
  half               text check (half in ('promise', 'fulfillment')),
  quote              text,
  bible_character_id uuid references public.character_card (bible_character_id) on delete restrict,
  place_lookup       text references public.place_card (lookup) on delete restrict,
  foreign key (passage_id, stop, card) references public.passage_card (passage_id, stop, card) on delete restrict,
  check ((passage_id is null) = (card is null) and (stop is null) = (card is null)),
  check (case type
    when 'instruction' then instruction is not null and reference is not null
    when 'prayer'      then reference is not null and key_line is not null
    when 'prophecy'    then prophecy_link_id is not null and half is not null and quote is not null and reference is not null
    when 'character'   then bible_character_id is not null
    when 'place'       then place_lookup is not null
    else true end),
  check ((type = 'character') = (bible_character_id is not null)),
  check ((type = 'place') = (place_lookup is not null))
);
create unique index sample_cookie_one_per_character on public.sample_cookie (bible_character_id) where bible_character_id is not null;
create unique index sample_cookie_one_per_place on public.sample_cookie (place_lookup) where place_lookup is not null;

-- The Ten Commandments pack: its ten lines
create table public.sample_cookie_line (
  key       text not null references public.sample_cookie (key) on delete cascade,
  position  smallint not null check (position >= 1),
  text      text not null check (btrim(text) <> ''),
  reference text not null,
  primary key (key, position)
);

-- Every verse a cookie's subject is told in
create table public.sample_cookie_verse (
  key      text not null references public.sample_cookie (key) on delete cascade,
  verse_id uuid not null references public.verse (id) on delete restrict,
  primary key (key, verse_id)
);
create index sample_cookie_verse_verse on public.sample_cookie_verse (verse_id);

-- ---- Trivia -------------------------------------------------------------------------------------------

create table public.trivia_question (
  passage_id integer not null references public.passage (id) on delete cascade,
  number     smallint not null check (number >= 1),   -- order within the passage in trivia.json
  from_stop  smallint not null,
  from_card  smallint not null,
  type       text not null check (type in ('multiple_choice', 'true_false')),
  verses     text not null,
  question   text not null check (btrim(question) <> ''),
  primary key (passage_id, number),
  foreign key (passage_id, from_stop, from_card) references public.passage_card (passage_id, stop, card) on delete cascade
);
create table public.trivia_answer (
  passage_id integer not null,
  number     smallint not null,
  position   smallint not null check (position >= 1),
  text       text not null check (btrim(text) <> ''),
  correct    boolean not null,
  primary key (passage_id, number, position),
  foreign key (passage_id, number) references public.trivia_question (passage_id, number) on delete cascade
);
alter table public.trivia_answer add constraint trivia_answer_one_correct
  exclude using btree (passage_id with =, number with =) where (correct) deferrable initially deferred;
create table public.trivia_question_verse (
  passage_id integer not null,
  number     smallint not null,
  verse_id   uuid not null references public.verse (id) on delete restrict,
  primary key (passage_id, number, verse_id),
  foreign key (passage_id, number) references public.trivia_question (passage_id, number) on delete cascade
);
create index trivia_question_verse_verse on public.trivia_question_verse (verse_id);

-- ---- BSB footnotes ------------------------------------------------------------------------------------

create table public.bsb_footnote (
  verse_id uuid not null references public.verse (id) on delete restrict,
  position smallint not null check (position >= 1),   -- order among the verse's notes in bsb-footnotes.json
  after    text not null,                             -- the words the note follows
  text     text not null check (btrim(text) <> ''),
  primary key (verse_id, position)
);

-- ---- Access -------------------------------------------------------------------------------------------
-- Lesson content (B4): no player select; app functions will serve it. Admin may read and write.
-- Place cards are Sample Table cookies, so they follow the same rule. BSB footnotes are Bible reference text:
-- any player may read; nobody but the server writes (R24), like verse and place.
do $$
declare t text;
begin
  foreach t in array array['passage','passage_included','passage_stop','passage_card','card_verse','card_answer',
                           'burnt_line','burnt_line_verse','big_idea_paragraph','lesson_word','lesson_word_meaning',
                           'card_word','lesson_idiom','lesson_idiom_meaning','lesson_idiom_verse','card_idiom',
                           'place_card','place_card_place','place_card_moment','place_card_moment_verse',
                           'sample_cookie','sample_cookie_line','sample_cookie_verse','burnt_line_wrong',
                           'trivia_question','trivia_answer','trivia_question_verse'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "%s: admin only" on public.%I for all to authenticated using (private.is_content_admin()) with check (private.is_content_admin())', t, t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;
alter table public.bsb_footnote enable row level security;
create policy "bsb_footnote: any player may read" on public.bsb_footnote for select to authenticated using (true);
grant select on public.bsb_footnote to authenticated;

-- Place photos: public bucket (the credit is shown with the photo in the app)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('place-images', 'place-images', true, 5242880, '{image/jpeg}')
  on conflict (id) do nothing;
