-- =============================================================================
-- Bible Journey — Supabase schema draft (Stage 6)
-- Source of truth: map v2.2 (2026-10-24), Stage 4 doc sections 7–8 (R1–R25,
-- S1–S4, owner rulings 09:17), Stage 5 doc as amended (A1–A18, B1–B10).
-- Naming: snake_case of the map's plain names, spelled as map v2.2 draws them (the map is the
-- Stage 3 standard; where it writes "since", "at", "approved" or "order", so does this file).
-- Enumerated values are text columns with a CHECK, spelled as on the map.
-- Question Rules 3.3: every hard rule (Sections 0–10) that the rows can show is enforced here;
-- each check names the rule it serves. All option rows of one question are written in one
-- transaction: the option shape check is deferred to commit. private.checklist_lines needs a
-- new branch when the rules gain a version.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 0. Extensions and schemas
-- ---------------------------------------------------------------------------
create extension if not exists pgcrypto   with schema extensions;  -- gen_random_bytes, pgp_sym_encrypt
create extension if not exists btree_gist with schema extensions;  -- exclusion constraints on (uuid, range)

create schema if not exists private;   -- helpers, internal functions, definer views; never exposed by the API

-- 4.Q4, 3.2, 3.1: a word is a whitespace-separated token holding a letter, digit or underscore ("___" counts as one word).
-- Created here because the question and question_option CHECKs below call it.
create or replace function private.word_count(p text) returns integer
language sql immutable set search_path = '' as $$
  select count(*)::integer from regexp_split_to_table(coalesce(p, ''), '\s+') t where t ~ '[[:alnum:]_]'
$$;

-- The API exposes only `public`. Default grants are revoked at the end of this
-- file and re-granted table by table (Stage 5 section 6, roles row).

-- ---------------------------------------------------------------------------
-- 1. App settings (one row per key; owner-editable from the dashboard)
-- ---------------------------------------------------------------------------
create table public.app_setting (
  key         text primary key,
  value       text not null,
  description text not null
);

insert into public.app_setting (key, value, description) values
  ('bake_reset_hour_chicago',   '0',  'Hour (0-23, America/Chicago) at which the bake day rolls over for everyone'),
  ('daily_bakes_free',          '3',  'Daily bakes for a free player'),
  ('unfinished_cap_free',       '3',  'Unfinished lessons a free player may hold open (Resume Eligible rows with finished_at empty)'),
  ('unfinished_cap_plus',       '15', 'Unfinished lessons a Plus or complimentary player may hold open'),
  ('lesson_opens_per_hour',     '60', 'Rate limit on open_cookie_lesson per profile per hour'),
  ('lesson_opens_per_day',      '400','Rate limit on open_cookie_lesson per profile per Chicago day (bake day)'),
  ('rate_flag_ban_days',        '7',  'Length of the automatic ban after a second rate flag within rate_flag_window_days'),
  ('rate_flag_window_days',     '7',  'Window in which a second flagged window triggers the ban request'),
  ('plus_trial_days',            '7',  'Length of the one free Plus trial'),
  ('chips_first_completion',    '10', 'Chips earned for a first-time cookie lesson completion'),
  ('chips_replay_completion',   '2',  'Chips earned for a replay completion'),
  ('claim_attempt_limit_hour',  '10', 'Failed gift claim attempts per token per hour before the token is refused'),
  ('gift_contact_retention_days','90','Days after sent_at before an unclaimed gift''s recipient name and contact are cleared');

-- ---------------------------------------------------------------------------
-- 2. Account (map p.2)
-- ---------------------------------------------------------------------------
create table public.profile (
  id              uuid primary key references auth.users (id) on delete cascade,
  display_name    text not null check (length(display_name) between 1 and 40),
  avatar_kind     text not null default 'built' check (avatar_kind in ('built','photo')),
  avatar_settings jsonb not null default '{}'::jsonb check (pg_column_size(avatar_settings) <= 4096),
  joined_at       timestamptz not null default now(),
  is_system       boolean not null default false
);
comment on table public.profile is 'The public card. One per auth user; the id IS auth.users.id. Private columns live in profile_private (A1).';

create table public.profile_private (
  profile_id        uuid primary key references public.profile (id) on delete cascade,
  timezone          text not null default 'UTC',
  timezone_source   text not null default 'device' check (timezone_source in ('device','confirmed')),
  avatar_photo_path text,
  last_seen_at      timestamptz,
  deletion_requested_at timestamptz     -- set by prepare_account_deletion; every write and function refuses after this
);
comment on table public.profile_private is 'Owner-only columns (A1). timezone is display and reminders only; bakes use Chicago time (owner ruling G21).';

create table public.settings (
  profile_id         uuid primary key references public.profile (id) on delete cascade,
  translation_code   text not null default 'KJV',          -- FK added after translation exists
  sound_on           boolean not null default true,
  reminder_slot      text check (reminder_slot in ('morning','lunch','evening')),
  review_days        jsonb not null default '[true,true,true,true,true,true,true]'::jsonb,
  daily_minutes_goal integer check (daily_minutes_goal > 0),
  weekly_verse_goal  integer check (weekly_verse_goal >= 0)
);

create table public.day_streak (
  profile_id      uuid primary key references public.profile (id) on delete cascade,
  current_streak  integer not null default 0 check (current_streak >= 0),
  best_streak     integer not null default 0 check (best_streak >= 0),
  last_active_day date,
  repairs_used    integer not null default 0 check (repairs_used >= 0)   -- R20
);

create table public.purchase (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid not null references public.profile (id) on delete restrict,   -- re-pointed to the tombstone on deletion (R1); never cascades
  item_type    text not null check (item_type in ('chip pack','plus','gift card','day pass','bake')),
  amount_usd   numeric(10,2) not null check (amount_usd >= 0),
  store        text not null check (store in ('apple','google')),
  store_receipt text not null unique,                              -- R3
  purchased_at timestamptz not null default now()
);
comment on table public.purchase is 'Real-money events. Rows are never deleted (R3). Written only by record_purchase with the secret key.';

create table public.plan (
  id                    uuid primary key default gen_random_uuid(),
  profile_id            uuid not null references public.profile (id) on delete cascade,
  plan_kind             text not null check (plan_kind in ('free','plus','complimentary')),
  started_at            timestamptz not null default now(),
  ends_at               timestamptz check (ends_at is null or ends_at > started_at),   -- G20
  trial_ends_at         timestamptz,
  source                text not null check (source in ('store','promo','granted')),
  granted_by_profile_id uuid references public.profile (id) on delete set null,          -- R23
  granted_note          text,
  purchase_id           uuid unique references public.purchase (id) on delete set null,  -- R12
  -- R6: periods of one kind never overlap for one profile; different kinds may
  constraint plan_no_overlap exclude using gist (
    profile_id with =, plan_kind with =,
    tstzrange(started_at, coalesce(ends_at, 'infinity'::timestamptz), '[)') with &&
  )
);

create table public.push_token (
  profile_id   uuid not null references public.profile (id) on delete cascade,
  device_token text not null,
  platform     text not null check (platform in ('ios','android','web')),
  updated_at   timestamptz not null default now(),
  primary key (profile_id, device_token),
  unique (device_token)
);

create table public.block (
  blocker_id uuid not null references public.profile (id) on delete cascade,
  blocked_id uuid not null references public.profile (id) on delete cascade,
  blocked_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

-- ---------------------------------------------------------------------------
-- 3. Bible reference layer (map p.3–5). Loaded from the Theographic JSON by a
--    server job; read-only in the app; every delete is block (R24).
--    Each table keeps our own uuid plus source_id = the Airtable record id.
-- ---------------------------------------------------------------------------
create table public.book (
  id            uuid primary key default gen_random_uuid(),
  source_id     text not null unique,
  "order"       integer not null unique check ("order" between 1 and 66),
  name          text not null,
  abbreviation  text not null unique,
  division      text,
  testament     text not null check (testament in ('OT','NT')),
  chapter_count integer not null,
  verse_count   integer not null
);

create table public.chapter (
  id             uuid primary key default gen_random_uuid(),
  source_id      text not null unique,
  book_id        uuid not null references public.book (id) on delete restrict,
  chapter_number integer not null check (chapter_number > 0),
  verse_count    integer not null,
  unique (book_id, chapter_number),
  unique (id, book_id)                      -- target for the Verse composite FK (R11)
);

create table public.verse (
  id           uuid primary key default gen_random_uuid(),
  source_id    text not null unique,
  book_id      uuid not null references public.book (id) on delete restrict,
  chapter_id   uuid not null references public.chapter (id) on delete restrict,
  verse_number integer not null check (verse_number > 0),
  sequence     integer not null unique check (sequence between 1 and 31102),   -- R13
  osis_ref     text not null unique,
  text         text not null,                                                  -- KJV only (R13)
  unique (chapter_id, verse_number),
  unique (id, book_id),                      -- target for same-book checks
  -- R11: chapter must belong to the book named on the verse
  foreign key (chapter_id, book_id) references public.chapter (id, book_id) on delete restrict
);
comment on table public.verse is '31,102 KJV verses; the unit everything points at. Other translations live only in memory_verse_text.';

-- 1.8, 7.Po5: KJV psalm titles live in their own table, not in verse text
create table public.psalm_heading (                                                                               -- 1.8, 7.Po5
  chapter_id uuid primary key references public.chapter (id) on delete restrict,                                 -- one heading per psalm; reading layer: deletes block (R24)
  text       text not null check (btrim(text) <> '')                                                             -- 1.8: the title the KJV prints above the psalm
);
comment on table public.psalm_heading is
  'KJV psalm titles (1.8, 7.Po5). One row per psalm that has a title, keyed by its Psalms chapter. Reading layer: loaded by a server job, read-only in the app. Readable by the content admin only: the reveal does not show it.';
-- 1.3, 1.8, 4.Q12: verse text is the verse only. The verse loader stores every psalm title here, not in the verse:
-- Psalm 132:1 in particular is stored as verse text without "A Song of degrees.", and that title goes into
-- psalm_heading for Psalm 132. Habakkuk 3:19 keeps its closing "To the chief singer on my stringed instruments."

create table public.place (
  id           uuid primary key default gen_random_uuid(),
  source_id    text not null unique,
  lookup       text not null unique,
  name         text not null,
  feature_type text,
  latitude     numeric,
  longitude    numeric,
  verse_count  integer not null default 0
);

create table public.bible_character (
  id             uuid primary key default gen_random_uuid(),
  source_id      text not null unique,
  lookup         text not null unique,
  name           text not null,
  display_title  text,
  gender         text,
  birth_year     integer,
  death_year     integer,
  birth_place_id uuid references public.place (id) on delete set null,
  death_place_id uuid references public.place (id) on delete set null,
  father_id      uuid references public.bible_character (id) on delete set null,
  mother_id      uuid references public.bible_character (id) on delete set null,
  verse_count    integer not null default 0,
  check (father_id is distinct from id),
  check (mother_id is distinct from id)
);

create table public.bible_character_partner (
  bible_character_id uuid not null references public.bible_character (id) on delete restrict,
  partner_id         uuid not null references public.bible_character (id) on delete restrict,
  primary key (bible_character_id, partner_id),
  check (bible_character_id < partner_id)   -- a pair stored once, lower id first
);

create table public.verse_bible_character (
  verse_id           uuid not null references public.verse (id) on delete restrict,
  bible_character_id uuid not null references public.bible_character (id) on delete restrict,
  primary key (verse_id, bible_character_id)
);

create table public.verse_place (
  verse_id uuid not null references public.verse (id) on delete restrict,
  place_id uuid not null references public.place (id) on delete restrict,
  primary key (verse_id, place_id)
);

create table public.event (
  id         uuid primary key default gen_random_uuid(),
  source_id  text not null unique,
  title      text not null,
  start_year integer,
  duration   text,
  sort_key   integer
);

create table public.event_verse (
  event_id uuid not null references public.event (id) on delete restrict,
  verse_id uuid not null references public.verse (id) on delete restrict,
  primary key (event_id, verse_id)
);

create table public.event_bible_character (
  event_id           uuid not null references public.event (id) on delete restrict,
  bible_character_id uuid not null references public.bible_character (id) on delete restrict,
  primary key (event_id, bible_character_id)
);

create table public.people_group (
  id        uuid primary key default gen_random_uuid(),
  source_id text not null unique,
  name      text not null
);

create table public.group_member (
  group_id           uuid not null references public.people_group (id) on delete restrict,
  bible_character_id uuid not null references public.bible_character (id) on delete restrict,
  primary key (group_id, bible_character_id)
);

create table public.dictionary_entry (
  id                 uuid primary key default gen_random_uuid(),
  source_id          text not null unique,
  term               text not null,
  text               text not null,
  match_type         text check (match_type in ('character','place','multi','none')),
  bible_character_id uuid references public.bible_character (id) on delete set null,
  place_id           uuid references public.place (id) on delete set null
);
comment on table public.dictionary_entry is 'Easton''s. Planning aid only; never shown in a lesson; readable by the content admin only.';

-- ---------------------------------------------------------------------------
-- 4. Lesson content (map p.6–7). Written by the content admin only.
-- ---------------------------------------------------------------------------
create table public.recipe (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  "order"     integer not null unique,
  shelf       text not null check (shelf in ('Narrative','Language','Devotion','Teachings')),
  description text,
  emblem      text,
  -- 2.2: the 11 recipes, spelled as the rules spell them; recipe-specific checks key on these names
  constraint recipe_name_is_a_rules_recipe check (name in
    ('Stories','Words','Idioms','Verses','Poems','Wisdom','Prophets','Jesus Prophecies','Revelation','Parables','Letters'))
);
-- Recipe rows are owner data and are inserted outside this file.

create table public.cookie_dough_flavor (
  id          uuid primary key default gen_random_uuid(),
  recipe_id   uuid not null references public.recipe (id) on delete restrict,
  name        text not null,
  "order"     integer not null,
  description text,
  status      text not null default 'draft' check (status in ('draft','reviewed','approved','published')),
  approved_by uuid references public.profile (id) on delete set null,          -- R2
  approved_at timestamptz,
  version     integer not null default 1 check (version >= 1),
  retired_at  timestamptz,
  unique (recipe_id, "order"),
  check (status not in ('approved','published') or approved_at is not null)   -- R2
);

create table public.cookie_lesson (
  id                     uuid primary key default gen_random_uuid(),
  cookie_dough_flavor_id uuid not null references public.cookie_dough_flavor (id) on delete cascade,
  "order"                integer not null,
  title                  text not null,
  goal                   text,                                                                 -- Question Rules v3 §0: the one sentence the lesson teaches
  status                 text not null default 'draft' check (status in ('draft','reviewed','approved')),   -- v3: the ladder one level down
  intro                  text,
  meaning                text,
  reference_text         text,
  scene_intro            text,
  verse_intro            text,
  edited_at              timestamptz,
  retired_at             timestamptz,
  focus_verse_id         uuid references public.verse (id) on delete restrict,                 -- 7.V3, 6.6, 8.1
  rules_version          text not null check (rules_version ~ '^[0-9]+\.[0-9]+$'),            -- header, 8.1, 10.37: the Question Rules version the lesson was written to
  unique (cookie_dough_flavor_id, "order"),
  constraint cookie_lesson_reference_en_dash check (reference_text !~ '[0-9]-[0-9]')            -- 2.12: ranges use an en dash
);

create table public.lesson_passage (
  id               uuid primary key default gen_random_uuid(),
  cookie_lesson_id uuid not null references public.cookie_lesson (id) on delete cascade,
  label            text check (label in ('Prophecy','Fulfillment')),                            -- 6.6, 8.2
  from_verse_id    uuid not null references public.verse (id) on delete restrict,
  to_verse_id      uuid not null references public.verse (id) on delete restrict,
  parallel         boolean not null default false                                              -- 2.17, 8.2
);
create unique index lesson_passage_distinct on public.lesson_passage (cookie_lesson_id, from_verse_id, to_verse_id);   -- 7.W4, 7.I4: one row per distinct verse

create table public.question (
  id               uuid primary key default gen_random_uuid(),
  cookie_lesson_id uuid not null references public.cookie_lesson (id) on delete cascade,
  "order"          integer not null,
  type             text not null check (type in ('mc','tf','fill','wordbank','order','match')),   -- v3: image-mc removed
  story            text,
  prompt           text not null,
  answer           boolean,        -- tf only; every other type grades by Question Option.is_correct (v3)
  why              text,           -- never reaches a player before answering
  status           text not null default 'draft' check (status in ('draft','reviewed','approved')),
  clue             text not null check (clue in ('frame','setup','earlier','discovery')),   -- 10.3: no default; every question has a clue the writer chose
  repeat_of        uuid references public.question (id) on delete set null,
  edited_at        timestamptz,
  retired_at       timestamptz,
  replaces_question_id uuid references public.question (id) on delete restrict,           -- 3.10: a replacement draft names the live question it will retire when approved
  part             text not null check (part in ('scene','verse','plain','say','mean','apply')),   -- 8.3, 7.Wi2, 7.V5–7.V8 (no default: the writer sets it on every row; per-recipe values in question_row_check)
  shape            text check (shape in ('meaning','sentence sense','opposite','tf','who','misuse',
                     'reverse','fill','wordbank','match','pick sentence','finish')),          -- 7.W7, 7.I7, 8.3
  check (repeat_of is distinct from id),
  check ((type = 'tf') = (answer is not null)),
  constraint question_order_from_1 check ("order" >= 1),                                     -- 8.3
  constraint question_repeat_is_earlier check (repeat_of is null or clue = 'earlier'),       -- 4.Q6, 2.6
  constraint question_put_in_order_late check (type <> 'order' or "order" >= 4),            -- 4.Q10
  constraint question_no_ellipsis
    check (prompt !~ '^\s*(\.\.\.|…)' and prompt !~ '(\.\.\.|…)\s*$'),                       -- 4.Q3
  constraint question_mc_stem_is_question
    check (type <> 'mc' or btrim(prompt) ~ case when shape = 'finish' then '[:?]["”’'']?$' else '\?["”’'']?$' end),   -- 4.Q3, 7.I7 (finish: colon or question)
  constraint question_shape_type check (shape is null or type = case shape
    when 'tf' then 'tf' when 'fill' then 'fill' when 'wordbank' then 'wordbank' when 'match' then 'match' else 'mc' end),   -- 7.W7, 7.I7
  constraint question_lengths check (
    private.word_count(prompt) <= case when shape = 'meaning' then 25 else 20 end
    and private.word_count(story) <= 20)                                                     -- 4.Q4, 7.S1
);
comment on table public.question is 'One row per question (Question Rules v3). Options, order items and match items are Question Option rows; cited verses are Question Verse rows. Graded by option id, never by text or position.';
comment on column public.question.replaces_question_id is
  '3.10: set on a replacement draft; the question it replaces stays live until this one is approved, which retires it and re-points repeat_of.';
-- 3.10: the old question and its pending replacement share an order; only one live, non-pending row per order
create unique index question_live_order on public.question (cookie_lesson_id, "order")
  where retired_at is null and (replaces_question_id is null or status = 'approved');
create unique index question_one_pending_replacement on public.question (replaces_question_id)
  where retired_at is null and status <> 'approved';

create table public.question_option (
  id                      uuid primary key default gen_random_uuid(),
  question_id             uuid not null references public.question (id) on delete cascade,
  text                    text not null,
  position                integer not null check (position >= 0),      -- where it shows, 0 first; for match right-side rows this is the scramble
  is_correct              boolean,                                       -- mc, fill, tf: exactly one true per question
  blank                   integer check (blank between 1 and 3),        -- wordbank: which blank this word fills; empty on an extra word
  order_question_sequence integer check (order_question_sequence >= 1), -- order: the true order, 1 first
  side                    text check (side in ('left','right')),        -- match
  pair                    integer,                                      -- match: left and right rows that belong together share a number
  explanation             text,                                         -- 6.2: Dorin's note for this option, correct ones included
  constraint question_option_text_present check (btrim(text) <> ''),             -- 8.4
  constraint question_option_length check (private.word_count(text) <= 12)       -- 4.Q4
);
create unique index question_option_position on public.question_option (question_id, coalesce(side, ''), position);   -- match sides are two columns, each with its own order
comment on table public.question_option is
  'One row per answer choice (tf: True at position 0, False at position 1), word-bank word, order item or match item. The player never sees is_correct, blank, order_question_sequence, pair or explanation before answering.';
comment on column public.question_option.explanation is
  'Question Rules 3.3 6.2: Dorin''s note for this option, on every option of every type, correct ones included. Left empty until the Dorin explanation project fills it.';
-- 10.32, 6.2: "explanation empty on every option" is not enforced here; the checker tests it (it is temporary by its own wording).

create table public.question_verse (
  question_id uuid not null references public.question (id) on delete cascade,
  verse_id    uuid not null references public.verse (id) on delete restrict,
  primary key (question_id, verse_id)
);
comment on table public.question_verse is 'The verses the true answer is drawn from, one row per verse (a range is expanded on load). Distractors are checked against Lesson Passage, not here.';

create table public.lesson_check (
  id               uuid primary key default gen_random_uuid(),
  cookie_lesson_id uuid not null references public.cookie_lesson (id) on delete cascade,
  "check"          text not null,                                       -- 8.6: the Section 10 line number, e.g. "10.14"
  pass             boolean not null,
  note             text,
  checked_by       text not null check (checked_by in ('writer','checker','owner')),
  checked_at       timestamptz not null default now(),
  constraint lesson_check_line_number check ("check" ~ '^10\.[1-9][0-9]?$'),                                      -- 8.6
  constraint lesson_check_fail_has_note check (pass or nullif(btrim(note), '') is not null),                      -- 3.8
  constraint lesson_check_owner_has_note check (checked_by <> 'owner' or nullif(btrim(note), '') is not null)     -- 8.6
);
comment on table public.lesson_check is 'One row per checklist line per lesson. Writing pipeline only; content admin reads and writes; no player ever reads it.';
comment on column public.lesson_check."check" is '8.6: the Section 10 line number, e.g. "10.14"';

create table public.flavor_bible_character (
  cookie_dough_flavor_id uuid not null references public.cookie_dough_flavor (id) on delete cascade,
  bible_character_id     uuid not null references public.bible_character (id) on delete restrict,
  primary key (cookie_dough_flavor_id, bible_character_id)
);

create table public.flavor_place (
  cookie_dough_flavor_id uuid not null references public.cookie_dough_flavor (id) on delete cascade,
  place_id               uuid not null references public.place (id) on delete restrict,
  primary key (cookie_dough_flavor_id, place_id)
);

-- ---------------------------------------------------------------------------
-- 5. Master lists (map p.8). Retired by approved/enabled = false, never deleted (R18).
-- ---------------------------------------------------------------------------
create table public.translation (
  code         text primary key,
  name         text not null,
  licence_note text,
  enabled      boolean not null default false
);

alter table public.settings
  add constraint settings_translation_code_fkey
  foreign key (translation_code) references public.translation (code) on delete restrict;

create table public.memory_verse (
  id                     uuid primary key default gen_random_uuid(),
  verse_id               uuid not null unique references public.verse (id) on delete restrict,
  cookie_dough_flavor_id uuid references public.cookie_dough_flavor (id) on delete restrict,   -- optional (ruling G8)
  "order"                integer,
  approved               boolean not null default false
);

create table public.memory_verse_text (
  memory_verse_id  uuid not null references public.memory_verse (id) on delete cascade,
  translation_code text not null references public.translation (code) on delete restrict,
  text             text not null,
  primary key (memory_verse_id, translation_code)
);

create table public.word (
  id                     uuid primary key default gen_random_uuid(),
  word                   text not null,
  meaning                text,            -- plain English, written from the Easton's entry (v3); Easton's text itself never reaches a lesson
  anchor_verse_id        uuid not null references public.verse (id) on delete restrict,
  cookie_dough_flavor_id uuid not null references public.cookie_dough_flavor (id) on delete restrict,   -- required (ruling G8)
  dictionary_entry_id    uuid references public.dictionary_entry (id) on delete set null,   -- required once approved (trigger, v3)
  approved               boolean not null default false,
  form                   text not null check (form in ('noun','verb','adjective','adverb'))   -- 3.1, 8.5
);
-- 1.1, 1.11: no example sentence column on word or idiom; no rule names one, and it would be a path for unchecked text into lessons

create table public.word_verse (
  word_id  uuid not null references public.word (id) on delete cascade,
  verse_id uuid not null references public.verse (id) on delete restrict,
  primary key (word_id, verse_id)
);

create table public.idiom (
  id                     uuid primary key default gen_random_uuid(),
  phrase                 text not null,
  meaning                text,
  cookie_dough_flavor_id uuid not null references public.cookie_dough_flavor (id) on delete restrict,   -- required (ruling G9)
  approved               boolean not null default false,
  form                   text not null
    check (form in ('noun phrase','verb phrase','prepositional phrase','clause'))         -- 3.2, 8.5
);

create table public.idiom_verse (
  idiom_id        uuid not null references public.idiom (id) on delete cascade,
  verse_id        uuid not null references public.verse (id) on delete restrict,
  kept            boolean not null default true,
  reason_left_out text,
  primary key (idiom_id, verse_id),
  constraint idiom_verse_reason_when_left_out
    check (kept or nullif(btrim(reason_left_out), '') is not null)                         -- 3.2: a verse left out says why
);

-- Question Word and Question Idiom (8.3): the terms a Words or Idioms question tests. Lesson content,
-- written by the content admin; created here because they reference word and idiom.
create table public.question_word (                                                                               -- 7.W7, 8.3, 8.5
  question_id uuid not null references public.question (id) on delete cascade,
  word_id     uuid not null references public.word (id) on delete restrict,
  primary key (question_id, word_id)
);
create table public.question_idiom (                                                                              -- 7.I7, 8.3, 8.5
  question_id uuid not null references public.question (id) on delete cascade,
  idiom_id    uuid not null references public.idiom (id) on delete restrict,
  primary key (question_id, idiom_id)
);
comment on table public.question_word  is '8.3, 7.W7: one row per word a Words question tests (one per blank for a word bank, four for the match).';
comment on table public.question_idiom is '8.3, 7.I7: one row per idiom an Idioms question tests (four for the match).';

create table public.jesus_prophecy_link (
  id                   uuid primary key default gen_random_uuid(),
  prophecy_verse_id    uuid not null references public.verse (id) on delete restrict,
  fulfillment_verse_id uuid not null references public.verse (id) on delete restrict,
  support              text not null check (support in ('stated in NT','proposed')),
  stated_in_verse_id   uuid references public.verse (id) on delete set null,
  proposed_from        text,
  approved             boolean not null default false,
  unique (prophecy_verse_id, fulfillment_verse_id),
  check (support <> 'stated in NT' or stated_in_verse_id is not null),
  constraint jesus_prophecy_link_proposed_from
    check (support <> 'proposed' or nullif(btrim(proposed_from), '') is not null)          -- 3.4: a proposed link names what it was proposed from
);

-- ---------------------------------------------------------------------------
-- 6. Catalogues and Bakery TV (map p.9)
-- ---------------------------------------------------------------------------
create table public.look_catalogue (
  id             uuid primary key default gen_random_uuid(),
  kind           text not null check (kind in ('shop','box')),
  category       text not null,
  name           text not null,
  emblem         text,
  price_in_chips integer not null default 0 check (price_in_chips >= 0),   -- R20
  plus_only      boolean not null default false,
  enabled        boolean not null default true,                            -- R18 retirement flag
  unique (kind, category, name)
);

create table public.price (
  id             uuid primary key default gen_random_uuid(),
  item           text not null check (item in ('chip pack','bake','bake x3','day pass','streak repair')),
  amount         integer not null check (amount > 0),
  price_in_chips integer check (price_in_chips is null or price_in_chips >= 0),
  price_in_usd   numeric(10,2) check (price_in_usd is null or price_in_usd >= 0),
  enabled        boolean not null default true,
  unique (item, amount)                                                    -- R9
);

create table public.badge (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  icon       text,
  rule_type  text not null check (rule_type in ('streak days','cookies done','verses revealed','boxes made','games won')),
  rule_value integer not null check (rule_value > 0),
  enabled    boolean not null default true
);

create table public.tv_program (
  id               uuid primary key default gen_random_uuid(),
  youtube_video_id text not null unique,
  title            text not null,
  duration_seconds integer check (duration_seconds > 0),
  thumbnail_url    text,
  embeddable       boolean not null default true,
  allowed          boolean not null default false,     -- owner picked
  available        boolean not null default true,      -- still served by YouTube
  fetched_at       timestamptz not null default now(),
  last_checked_at  timestamptz
);

create table public.tv_pattern (
  id               uuid primary key default gen_random_uuid(),
  weekday          integer not null check (weekday between 0 and 6),
  start_time       time not null,                       -- Chicago wall clock
  duration_minutes integer not null check (duration_minutes > 0),
  program_id       uuid not null references public.tv_program (id) on delete restrict
);

create table public.tv_schedule (
  id         uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.tv_program (id) on delete restrict,
  start_at   timestamptz not null,
  end_at     timestamptz not null,
  check (end_at > start_at),
  constraint tv_schedule_no_overlap exclude using gist (tstzrange(start_at, end_at, '[)') with &&)   -- R14
);
comment on table public.tv_schedule is 'Materialised slots written by a server job from tv_pattern (R14). Never edited by hand.';
-- ---------------------------------------------------------------------------
-- 7. Player state — progress and reveals (map p.10). Write-denied (R4).
-- ---------------------------------------------------------------------------
create table public.dough_progress (
  profile_id             uuid not null references public.profile (id) on delete cascade,
  cookie_dough_flavor_id uuid not null references public.cookie_dough_flavor (id) on delete restrict,
  status                 text not null default 'in progress' check (status in ('in progress','done')),   -- R25
  started_at             timestamptz not null default now(),
  completed_at           timestamptz,
  primary key (profile_id, cookie_dough_flavor_id)
);

create table public.cookie_completion (
  id               uuid primary key default gen_random_uuid(),
  profile_id       uuid not null references public.profile (id) on delete cascade,
  cookie_lesson_id uuid not null references public.cookie_lesson (id) on delete restrict,
  completed_at     timestamptz not null default now(),
  is_replay        boolean not null default false,
  seconds_taken    integer check (seconds_taken is null or seconds_taken >= 0),
  correct_count    integer not null check (correct_count >= 0),
  question_count   integer not null check (question_count >= 0),
  resume_eligible_id uuid unique,                                              -- one attempt yields at most one completion (review F3)
  check (correct_count <= question_count)                                     -- R20
);
-- R8: one first-time completion per player per lesson; replays may repeat
create unique index cookie_completion_first_time
  on public.cookie_completion (profile_id, cookie_lesson_id) where is_replay = false;

create table public.flavor_finish (
  profile_id             uuid not null references public.profile (id) on delete cascade,
  cookie_dough_flavor_id uuid not null references public.cookie_dough_flavor (id) on delete restrict,
  all_cookies_done_at    timestamptz,
  tasted_at              timestamptz,     -- video watched
  boxed_at               timestamptz,     -- cache of the box row (R10)
  primary key (profile_id, cookie_dough_flavor_id),
  check (tasted_at is null or (all_cookies_done_at is not null and tasted_at >= all_cookies_done_at)),   -- G17
  check (boxed_at is null or (tasted_at is not null and boxed_at >= tasted_at))
);

create table public.revealed_verse (
  profile_id       uuid not null references public.profile (id) on delete cascade,
  verse_id         uuid not null references public.verse (id) on delete restrict,
  revealed_at      timestamptz not null default now(),
  cookie_lesson_id uuid not null references public.cookie_lesson (id) on delete restrict,   -- required (R7)
  primary key (profile_id, verse_id)
);

-- ---------------------------------------------------------------------------
-- 8. Player state — bakes, chips, purchases, looks, badges (map p.11)
-- ---------------------------------------------------------------------------
create table public.resume_eligible (
  id               uuid primary key default gen_random_uuid(),
  profile_id       uuid not null references public.profile (id) on delete cascade,
  cookie_lesson_id uuid not null references public.cookie_lesson (id) on delete restrict,
  source           text check (source in ('daily','bonus','chips','ad','day pass','plus')),   -- empty until the first answer charges the bake
  spent_at         timestamptz,                                                                -- set on the first answer (owner ruling G7)
  bake_day         date,                                                                       -- Chicago date of the charge
  opened_at        timestamptz not null default now(),
  resume_point     jsonb check (resume_point is null or pg_column_size(resume_point) <= 8192),
  finished_at      timestamptz,
  check ((source is null) = (spent_at is null)),
  check ((bake_day is null) = (spent_at is null))
);
comment on table public.resume_eligible is 'The bake record: one row per lesson opened. source/spent_at/bake_day are filled by the first answer (bake charged on first answer, not on open). finished_at empty = resumable (the oven label). At most N unfinished per profile (app_setting unfinished_cap_*).';
-- One unfinished row per player per lesson: reopening resumes it, answers stay answered (B10)
create unique index resume_eligible_one_open_per_lesson
  on public.resume_eligible (profile_id, cookie_lesson_id) where finished_at is null;
create index resume_eligible_daily_count
  on public.resume_eligible (profile_id, bake_day) where source = 'daily';
alter table public.cookie_completion
  add constraint cookie_completion_resume_eligible_id_fkey foreign key (resume_eligible_id) references public.resume_eligible (id) on delete set null;

-- Append-only record of every open, for the rate limit (review F4): rows never leave this table
create table public.lesson_open_log (
  id               bigint generated always as identity primary key,
  profile_id       uuid not null references public.profile (id) on delete cascade,
  cookie_lesson_id uuid not null references public.cookie_lesson (id) on delete cascade,
  opened_at        timestamptz not null default now(),
  bake_day         date not null      -- set by open_cookie_lesson from private.chicago_today()
);
create index lesson_open_log_profile_time on public.lesson_open_log (profile_id, opened_at);
create index lesson_open_log_profile_day  on public.lesson_open_log (profile_id, bake_day);

create table public.bake_grant (
  id                     uuid primary key default gen_random_uuid(),
  profile_id             uuid not null references public.profile (id) on delete cascade,
  kind                   text not null check (kind in ('bonus','day pass','ad')),
  granted_at             timestamptz not null default now(),
  expires_at             timestamptz,
  used_by_resume_eligible_id uuid unique references public.resume_eligible (id) on delete set null
);

create table public.lesson_answer (
  resume_eligible_id uuid not null references public.resume_eligible (id) on delete cascade,
  question_id        uuid not null references public.question (id) on delete cascade,
  profile_id         uuid not null references public.profile (id) on delete cascade,
  answer             jsonb not null check (pg_column_size(answer) <= 4096),
  is_correct         boolean not null,
  answered_at        timestamptz not null default now(),
  primary key (resume_eligible_id, question_id)
);
comment on table public.lesson_answer is 'A7 / B10: one answer per question per attempt. Because only one unfinished attempt per lesson exists (resume_eligible_one_open_per_lesson), an answered question cannot be re-answered until the lesson is finished; replays open a new attempt.';

create table public.chip_ledger (
  id                   uuid primary key default gen_random_uuid(),
  profile_id           uuid not null references public.profile (id) on delete restrict,   -- re-pointed to the tombstone on deletion (R1)
  amount               integer not null check (amount <> 0),                    -- signed (R20)
  reason               text not null,
  happened_at          timestamptz not null default now(),
  cookie_completion_id uuid unique references public.cookie_completion (id) on delete set null,   -- R8, A14
  purchase_id          uuid unique references public.purchase (id) on delete set null              -- R12
);
create index chip_ledger_profile on public.chip_ledger (profile_id);

create table public.owned_look (
  profile_id  uuid not null references public.profile (id) on delete cascade,
  look_id     uuid not null references public.look_catalogue (id) on delete restrict,
  acquired_at timestamptz not null default now(),
  primary key (profile_id, look_id)
);

create table public.active_look (
  profile_id uuid not null references public.profile (id) on delete cascade,
  category   text not null,
  look_id    uuid not null references public.look_catalogue (id) on delete restrict,
  primary key (profile_id, category)
);

create table public.earned_badge (
  profile_id uuid not null references public.profile (id) on delete cascade,
  badge_id   uuid not null references public.badge (id) on delete restrict,
  earned_at  timestamptz not null default now(),
  primary key (profile_id, badge_id)
);

-- ---------------------------------------------------------------------------
-- 9. Player state — keepsake boxes and gifts (map p.12, A1, A17, A18)
-- ---------------------------------------------------------------------------
create table public.keepsake_box (
  id                               uuid primary key default gen_random_uuid(),
  profile_id                       uuid not null references public.profile (id) on delete cascade,   -- sent gift boxes are re-pointed to the tombstone first (R1); earned boxes and drafts cascade
  recipe_id                        uuid not null references public.recipe (id) on delete restrict,
  earned_by_cookie_dough_flavor_id uuid references public.cookie_dough_flavor (id) on delete restrict,
  is_gift                          boolean not null default false,
  verse_id                         uuid not null references public.verse (id) on delete restrict,
  emblem                           text check (length(emblem) <= 80),
  name_shown                       text check (length(name_shown) <= 80),
  date_shown                       text check (length(date_shown) <= 80),
  stamp_shown                      text check (length(stamp_shown) <= 80),
  look                             jsonb not null default '{}'::jsonb check (pg_column_size(look) <= 2048),   -- color, finish, ribbon, paper, glow, aura, shape, trail (G15 trigger)
  is_public                        boolean not null default false,       -- R15
  created_at                       timestamptz not null default now(),
  crumbs_count                     integer not null default 0 check (crumbs_count >= 0),   -- cache kept by trigger (G10)
  check (is_gift or earned_by_cookie_dough_flavor_id is not null)        -- G2 half; the other half is a deferred trigger (R2)
);
-- R10: one earned box per player per flavor
create unique index keepsake_box_one_per_flavor
  on public.keepsake_box (profile_id, earned_by_cookie_dough_flavor_id) where is_gift = false;
create index keepsake_box_public on public.keepsake_box (created_at) where is_public;

create table public.gift_box_details (
  box_id               uuid primary key references public.keepsake_box (id) on delete cascade,
  box_type             text not null check (box_type in ('classic','capsule','prayer','celebration','week','memorial')),
  unlock_date          date,                       -- capsule: unlock; celebration: anniversary; week: week start
  dedication_name      text check (length(dedication_name) <= 80),
  dedication_reason    text check (length(dedication_reason) <= 200),
  note                 text check (length(note) <= 2000),
  with_names           jsonb check (with_names is null or pg_column_size(with_names) <= 2048),
  signature_file_path  text,
  photo_file_path      text,
  voice_note_file_path text,
  sent_to_profile_id   uuid references public.profile (id) on delete restrict,   -- re-pointed to the tombstone (R1); never cleared
  sent_at              timestamptz,
  check (box_type <> 'capsule' or unlock_date is not null)
);

create table public.gift_delivery (
  box_id            uuid primary key references public.gift_box_details (box_id) on delete cascade,
  recipient_name    text check (length(recipient_name) <= 80),
  recipient_contact text check (length(recipient_contact) <= 200),
  claim_token_hash  text unique,     -- sha256 of the token; the token itself is returned once by send_gift_box and never stored
  claimed_at        timestamptz
);
comment on table public.gift_delivery is 'A1: sender-only columns split off Gift Box Details. the token is 32 url-safe chars (A6), stored only as a hash; recipient name and contact cleared 90 days after sent_at if unclaimed (R17).';

create table public.box_element_position (
  box_id   uuid not null references public.keepsake_box (id) on delete cascade,
  element  text not null check (element in ('verse','emblem','name','date','stamp','dedication','note','signature','photo','voice','with_names')),
  face     text not null check (face in ('lid','front','back','left','right')),
  position jsonb not null check (pg_column_size(position) <= 1024),
  primary key (box_id, element)
);

create table public.box_crumb (
  box_id     uuid not null references public.keepsake_box (id) on delete cascade,
  profile_id uuid not null references public.profile (id) on delete restrict,   -- re-pointed to the tombstone (R1)
  at         timestamptz not null default now()
);
-- A10: one crumb per player per box, except any number from the tombstone
create unique index box_crumb_one_per_player
  on public.box_crumb (box_id, profile_id)
  where profile_id <> '00000000-0000-0000-0000-000000000001'::uuid;
create index box_crumb_box on public.box_crumb (box_id);

create table public.gift_card (
  box_id      uuid primary key references public.keepsake_box (id) on delete cascade,
  brand       text not null,
  amount_usd  numeric(10,2) not null check (amount_usd >= 0),
  paid        boolean not null default false,
  purchase_id uuid unique references public.purchase (id) on delete set null   -- R12; always empty at launch (ruling 5)
);

create table public.gift_card_secret (
  box_id          uuid primary key references public.gift_card (box_id) on delete cascade,
  code_ciphertext bytea not null,
  revealed_at     timestamptz
);
comment on table public.gift_card_secret is 'A1/S3: the encrypted code. No player policy; only attach_gift_card and reveal_gift_card touch it.';

-- ---------------------------------------------------------------------------
-- 10. Player state — social, games, TV (map p.13, D3, A3)
-- ---------------------------------------------------------------------------
create table public.follow (
  follower_id uuid not null references public.profile (id) on delete cascade,
  followed_id uuid not null references public.profile (id) on delete cascade,
  since       timestamptz not null default now(),
  primary key (follower_id, followed_id),
  check (follower_id <> followed_id)
);
create index follow_followed on public.follow (followed_id);

create table public.memorized_verse (
  profile_id      uuid not null references public.profile (id) on delete cascade,
  memory_verse_id uuid not null references public.memory_verse (id) on delete restrict,
  memorized_at    timestamptz not null default now(),
  primary key (profile_id, memory_verse_id)
);

create table public.collected_question (
  profile_id   uuid not null references public.profile (id) on delete cascade,
  question_id  uuid not null references public.question (id) on delete cascade,   -- G14: withdrawn questions leave every pool
  collected_at timestamptz not null default now(),
  primary key (profile_id, question_id)
);

create table public.game (
  id              uuid primary key default gen_random_uuid(),
  host_profile_id uuid not null references public.profile (id) on delete restrict,   -- re-pointed to the tombstone (R1)
  game_type       text not null check (game_type in ('trivia solo','trivia together','trivia versus','verse solo','verse together','verse versus')),
  status          text not null default 'open' check (status in ('open','playing','ended')),
  started_at      timestamptz,
  ended_at        timestamptz,
  game_result     jsonb
);

create table public.game_player (
  game_id       uuid not null references public.game (id) on delete cascade,
  profile_id    uuid not null references public.profile (id) on delete restrict,   -- re-pointed to the tombstone (R1)
  joined_at     timestamptz not null default now(),
  score         integer not null default 0,
  answer_streak integer not null default 0,
  won           boolean
);
-- A10: one row per player per game, except any number from the tombstone
create unique index game_player_one_per_game
  on public.game_player (game_id, profile_id)
  where profile_id <> '00000000-0000-0000-0000-000000000001'::uuid;
create index game_player_profile on public.game_player (profile_id);

create table public.game_invite (
  id              uuid primary key default gen_random_uuid(),
  game_id         uuid not null references public.game (id) on delete cascade,
  from_profile_id uuid not null references public.profile (id) on delete cascade,
  to_profile_id   uuid not null references public.profile (id) on delete cascade,
  sent_at         timestamptz not null default now(),
  answered_at     timestamptz,
  accepted        boolean,
  unique (game_id, to_profile_id),                                         -- R19
  check (from_profile_id <> to_profile_id),
  check ((accepted is null) = (answered_at is null))
);

create table public.game_answer (
  id              uuid primary key default gen_random_uuid(),
  game_id         uuid not null references public.game (id) on delete cascade,
  profile_id      uuid not null references public.profile (id) on delete restrict,   -- re-pointed to the tombstone (R1)
  question_id     uuid references public.question (id) on delete set null,           -- R19
  memory_verse_id uuid references public.memory_verse (id) on delete set null,
  answered_at     timestamptz not null default now(),
  correct         boolean not null,
  seconds         integer not null check (seconds >= 0),
  check (num_nonnulls(question_id, memory_verse_id) = 1)                   -- R19
);
create index game_answer_game on public.game_answer (game_id, profile_id);
create unique index game_answer_once_per_question on public.game_answer (game_id, profile_id, question_id)
  where question_id is not null and profile_id <> '00000000-0000-0000-0000-000000000001'::uuid;   -- A10: the tombstone may repeat
create unique index game_answer_once_per_verse on public.game_answer (game_id, profile_id, memory_verse_id)
  where memory_verse_id is not null and profile_id <> '00000000-0000-0000-0000-000000000001'::uuid;

create table public.game_best (
  profile_id         uuid not null references public.profile (id) on delete cascade,
  game_type          text not null,
  best_answer_streak integer not null default 0 check (best_answer_streak >= 0),
  wins               integer not null default 0 check (wins >= 0),
  primary key (profile_id, game_type)
);

create table public.tv_reminder (
  profile_id  uuid not null references public.profile (id) on delete cascade,
  schedule_id uuid not null references public.tv_schedule (id) on delete cascade,
  remind_at   timestamptz not null,
  primary key (profile_id, schedule_id)
);

-- ---------------------------------------------------------------------------
-- 11. Stage 5 operational tables (A6, A15, B3, B6). Players never read these.
-- ---------------------------------------------------------------------------
create table public.claim_attempt (
  id         bigint generated always as identity primary key,
  token_hash text not null,
  ip         inet,
  at         timestamptz not null default now(),
  succeeded  boolean not null
);
create index claim_attempt_token_hour on public.claim_attempt (token_hash, at);
create index claim_attempt_ip_hour on public.claim_attempt (ip, at);

create table public.storage_cleanup_queue (
  id        bigint generated always as identity primary key,
  bucket    text not null,
  path      text not null,
  queued_at timestamptz not null default now()
);

create table public.blocked_email_domain (
  domain   text primary key,
  reason   text,
  added_at timestamptz not null default now()
);

create table public.rate_flag (
  id            bigint generated always as identity primary key,
  profile_id    uuid not null references public.profile (id) on delete cascade,
  window_start  timestamptz not null,
  window_kind   text not null check (window_kind in ('hour','day')),
  opens_counted integer not null,
  flagged_at    timestamptz not null default now(),
  action_taken  text not null default 'refused' check (action_taken in ('refused','ban requested','banned 7 days','banned')),
  unique (profile_id, window_kind, window_start)
);
comment on table public.rate_flag is 'One row per flagged window (B6). "ban requested" is picked up by the secret-key job that calls auth.admin.updateUserById with ban_duration; the SQL never writes auth.users.';
create index rate_flag_profile on public.rate_flag (profile_id, flagged_at);

-- ---------------------------------------------------------------------------
-- 12. Indexes on every per-player foreign key the policies filter on
-- ---------------------------------------------------------------------------
create index dough_progress_profile     on public.dough_progress (profile_id);
create index cookie_completion_profile  on public.cookie_completion (profile_id);
create index cookie_completion_lesson   on public.cookie_completion (cookie_lesson_id);
create index flavor_finish_profile      on public.flavor_finish (profile_id);
create index revealed_verse_profile     on public.revealed_verse (profile_id);
create index resume_eligible_profile    on public.resume_eligible (profile_id);
create index bake_grant_profile         on public.bake_grant (profile_id) where used_by_resume_eligible_id is null;
create index lesson_answer_profile      on public.lesson_answer (profile_id);
create index purchase_profile           on public.purchase (profile_id);
create index plan_profile               on public.plan (profile_id);
create index owned_look_profile         on public.owned_look (profile_id);
create index earned_badge_profile       on public.earned_badge (profile_id);
create index keepsake_box_profile       on public.keepsake_box (profile_id);
create index gift_box_details_recipient on public.gift_box_details (sent_to_profile_id);
create index memorized_verse_profile    on public.memorized_verse (profile_id);
create index collected_question_profile on public.collected_question (profile_id);
create index game_host                  on public.game (host_profile_id);
create index game_invite_to             on public.game_invite (to_profile_id);
create index game_invite_game           on public.game_invite (game_id);
create index tv_reminder_profile        on public.tv_reminder (profile_id);
create index cookie_lesson_flavor       on public.cookie_lesson (cookie_dough_flavor_id);
create index question_lesson            on public.question (cookie_lesson_id);
create index question_option_question   on public.question_option (question_id);
create index question_verse_verse       on public.question_verse (verse_id);
create index lesson_check_lesson        on public.lesson_check (cookie_lesson_id);
create index lesson_passage_lesson      on public.lesson_passage (cookie_lesson_id);
create index verse_chapter              on public.verse (chapter_id);
create index verse_bible_character_char on public.verse_bible_character (bible_character_id);
create index verse_place_place          on public.verse_place (place_id);
-- ---------------------------------------------------------------------------
-- 13. Helpers (schema private; security definer where they must cross RLS;
--     search_path pinned; execute revoked from the API roles at the end)
-- ---------------------------------------------------------------------------
create or replace function private.setting(p_key text) returns text
language sql stable security definer set search_path = '' as $$
  select value from public.app_setting where key = p_key
$$;

create or replace function private.setting_int(p_key text) returns integer
language sql stable security definer set search_path = '' as $$
  select value::integer from public.app_setting where key = p_key
$$;

-- The tombstone id is a constant: the partial unique indexes on game_player and box_crumb name it too
create or replace function private.tombstone_id() returns uuid
language sql immutable as $$
  select '00000000-0000-0000-0000-000000000001'::uuid
$$;

-- Guarded uuid cast for Storage policies (review F20): a non-uuid folder never raises
create or replace function private.safe_uuid(p text) returns uuid
language sql immutable as $$
  select case when p ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then p::uuid end
$$;

-- Deletion pending (review F12): every player write and function refuses once set
create or replace function private.deletion_pending(p_profile_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select deletion_requested_at is not null from public.profile_private where profile_id = p_profile_id), false)
$$;

-- Bake day: the Chicago date, shifted by the reset hour (owner ruling G21)
create or replace function private.chicago_today() returns date
language sql stable set search_path = '' as $$
  select ((now() at time zone 'America/Chicago')
          - make_interval(hours => private.setting_int('bake_reset_hour_chicago')))::date
$$;

create or replace function private.is_content_admin() returns boolean
language sql stable set search_path = '' as $$
  select coalesce((select auth.jwt() -> 'app_metadata' ->> 'app_role') = 'content_admin', false)
$$;

create or replace function private.is_blocked_either_way(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.block
    where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a)
  )
$$;

create or replace function private.is_friend(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.follow where follower_id = a and followed_id = b)
     and exists (select 1 from public.follow where follower_id = b and followed_id = a)
     and not private.is_blocked_either_way(a, b)
$$;

create or replace function private.is_in_game(p_game_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.game g where g.id = p_game_id and g.host_profile_id = (select auth.uid()))
      or exists (select 1 from public.game_player gp where gp.game_id = p_game_id and gp.profile_id = (select auth.uid()))
$$;

-- Entitlement = highest active plan kind: complimentary > plus > free (R6)
create or replace function private.entitlement(p_profile_id uuid) returns text
language sql stable security definer set search_path = '' as $$
  select coalesce((
    select plan_kind from public.plan
    where profile_id = p_profile_id
      and started_at <= now() and (ends_at is null or ends_at > now())
      and plan_kind in ('complimentary','plus')
    order by case plan_kind when 'complimentary' then 0 else 1 end
    limit 1), 'free')
$$;

create or replace function private.is_plus(p_profile_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.entitlement(p_profile_id) in ('plus','complimentary')
$$;

-- Flavor readable by a player: published, retired or not (finished players keep history)
create or replace function private.flavor_is_published(p_flavor_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.cookie_dough_flavor where id = p_flavor_id and status = 'published')
$$;

-- Box readable: owner; recipient; public and not blocked; capsule not before unlock date (A11, A17)
create or replace function private.can_read_box(p_box_id uuid) returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare
  v_caller uuid := (select auth.uid());
  b record;
begin
  if v_caller is null then return false; end if;
  select kb.profile_id, kb.is_public, gbd.sent_to_profile_id, gbd.box_type, gbd.unlock_date, gbd.sent_at
    into b
  from public.keepsake_box kb
  left join public.gift_box_details gbd on gbd.box_id = kb.id
  where kb.id = p_box_id;
  if not found then return false; end if;
  if b.profile_id = v_caller then return true; end if;
  if b.box_type = 'capsule' and b.unlock_date is not null and b.unlock_date > private.chicago_today() then
    return false;
  end if;
  if b.sent_to_profile_id = v_caller and b.sent_at is not null then return true; end if;
  if b.is_public and not private.is_blocked_either_way(v_caller, b.profile_id) then return true; end if;
  return false;
end $$;

create or replace function private.box_is_sent(p_box_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.gift_box_details where box_id = p_box_id and sent_at is not null)
$$;

create or replace function private.session_is_live() returns boolean
language sql stable security definer set search_path = '' as $$
  -- A13: a deleted or signed-out session's token stops working at once for sensitive functions
  select exists (
    select 1 from auth.sessions s
    where s.id = nullif(auth.jwt() ->> 'session_id', '')::uuid
      and s.user_id = (select auth.uid())
  )
$$;

-- ---- Question Rules helpers (private.word_count is created in section 0) ----
-- 2.2: the recipe a lesson or flavor belongs to; recipe-specific checks key on these names
create or replace function private.lesson_recipe(p_lesson_id uuid) returns text
language sql stable set search_path = '' as $$
  select r.name from public.cookie_lesson cl
    join public.cookie_dough_flavor f on f.id = cl.cookie_dough_flavor_id
    join public.recipe r on r.id = f.recipe_id
   where cl.id = p_lesson_id
$$;

create or replace function private.flavor_recipe(p_flavor_id uuid) returns text
language sql stable set search_path = '' as $$
  select r.name from public.cookie_dough_flavor f join public.recipe r on r.id = f.recipe_id where f.id = p_flavor_id
$$;

-- 4.Q5, 4.A3: is a verse inside the lesson's Lesson Passage rows with parallel = false
create or replace function private.in_lesson_rows(p_lesson_id uuid, p_verse_id uuid) returns boolean
language sql stable set search_path = '' as $$
  select exists (select 1 from public.lesson_passage lp
                   join public.verse f on f.id = lp.from_verse_id
                   join public.verse t on t.id = lp.to_verse_id
                   join public.verse v on v.id = p_verse_id
                  where lp.cookie_lesson_id = p_lesson_id and not lp.parallel
                    and v.sequence between f.sequence and t.sequence)
$$;

-- 2.12: the book name as a reference writes it: one psalm is "Psalm" (Psalm 23:1), several are "Psalms" (Psalms 120–134);
-- every other book uses its full name; no abbreviation is accepted anywhere a reference is compared
create or replace function private.ref_book_name(p_book_name text, p_psalm_count integer) returns text
language sql immutable set search_path = '' as $$
  select case when p_book_name = 'Psalms' and p_psalm_count = 1 then 'Psalm' else p_book_name end
$$;

-- apostrophe-normalised lower-case text, for "the KJV prints it" tests (3.1, 7.I4)
create or replace function private.norm(p text) returns text
language sql immutable set search_path = '' as $$
  select lower(translate(coalesce(p, ''), '’‘', ''''''))
$$;

-- 3.10: a pending replacement is a draft/reviewed row with replaces_question_id set; it is not "live" for any ladder or count
create or replace function private.is_pending_replacement(q public.question) returns boolean
language sql immutable set search_path = '' as $$
  select q.replaces_question_id is not null and q.status <> 'approved' and q.retired_at is null
$$;

-- 8.6, 10 lead-in: the lines of each rules version (add a branch when the rules gain a version)
create or replace function private.checklist_lines(p_rules_version text) returns setof text
language sql immutable set search_path = '' as $$
  select '10.' || n from generate_series(1, case p_rules_version when '3.3' then 47 end) n
$$;
-- 8.6: does a line apply to a recipe; null = the rules leave it open, so the database does not test it
create or replace function private.checklist_line_applies(p_line text, p_recipe text) returns boolean
language sql immutable set search_path = '' as $$
  select case p_line
    when '10.38' then p_recipe = 'Stories'
    when '10.39' then p_recipe = 'Jesus Prophecies'
    when '10.40' then p_recipe in ('Prophets','Revelation')
    when '10.41' then p_recipe = 'Letters'
    when '10.42' then p_recipe = 'Parables'
    when '10.43' then p_recipe = 'Verses'
    when '10.44' then p_recipe = 'Poems'
    when '10.45' then p_recipe = 'Wisdom'
    when '10.46' then p_recipe = 'Words'
    when '10.47' then p_recipe = 'Idioms'
    when '10.9'  then p_recipe not in ('Words','Idioms')
    when '10.12' then p_recipe not in ('Words','Idioms')
    when '10.11' then case when p_recipe in ('Words','Idioms') then null else true end
    when '10.25' then case when p_recipe in ('Words','Idioms') then null else true end
    else true end
$$;

-- 2.4, 7.L1, 7.I2, 7.J2: 2 to 5 lessons; exactly 2 in Idioms and Jesus Prophecies;
-- 1 only for a Letters flavor on Philemon, 2 John, 3 John or Jude
create or replace function private.flavor_lesson_count_ok(p_flavor_id uuid, p_n integer) returns boolean
language sql stable set search_path = '' as $$
  select case
    when private.flavor_recipe(p_flavor_id) in ('Idioms','Jesus Prophecies') then p_n = 2      -- 7.I2, 7.J2
    when p_n = 1 then private.flavor_recipe(p_flavor_id) = 'Letters'                          -- 2.4, 7.L1
         and (select count(distinct b.name) = 1 and bool_and(b.name in ('Philemon','2 John','3 John','Jude'))
                from public.cookie_lesson cl join public.lesson_passage lp on lp.cookie_lesson_id = cl.id
                join public.verse v on v.id = lp.from_verse_id join public.book b on b.id = v.book_id
               where cl.cookie_dough_flavor_id = p_flavor_id and cl.retired_at is null and not lp.parallel)
    else p_n between 2 and 5 end
$$;

-- 3.10: a shipped question is approved, live, and in a published flavor
create or replace function private.is_shipped(p_question_id uuid) returns boolean
language sql stable set search_path = '' as $$
  select exists (select 1 from public.question q join public.cookie_lesson cl on cl.id = q.cookie_lesson_id
                   join public.cookie_dough_flavor f on f.id = cl.cookie_dough_flavor_id
                  where q.id = p_question_id and q.status = 'approved' and q.retired_at is null and f.status = 'published')
$$;

-- the live questions of a lesson (pending 3.10 replacements left out), each with the question it repeats
create or replace function private.live_questions(p_lesson_id uuid)
returns table (qid uuid, ord integer, qtype text, part text, shape text, clue text, answer boolean, prompt text,
               repeat_of uuid, is_review boolean, target_lesson uuid, target_order integer, target_prompt text,
               target_part text, target_live boolean)
language sql stable set search_path = '' as $$
  select q.id, q."order", q.type, q.part, q.shape, q.clue, q.answer, q.prompt, q.repeat_of,
         coalesce(t.cookie_lesson_id <> q.cookie_lesson_id, false), t.cookie_lesson_id, t."order", t.prompt, t.part,
         t.id is null or t.retired_at is null
    from public.question q left join public.question t on t.id = q.repeat_of
   where q.cookie_lesson_id = p_lesson_id and q.retired_at is null and not private.is_pending_replacement(q)
$$;

-- terms a lesson's questions test (Question Word or Question Idiom), with each term's anchor verse (Words only)
create or replace function private.lesson_terms(p_lesson_id uuid)
returns table (qid uuid, term_id uuid, anchor_verse_id uuid)
language sql stable set search_path = '' as $$
  select qw.question_id, qw.word_id, w.anchor_verse_id from public.question_word qw join public.word w on w.id = qw.word_id
   where qw.question_id in (select qid from private.live_questions(p_lesson_id))
  union all
  select qi.question_id, qi.idiom_id, null from public.question_idiom qi
   where qi.question_id in (select qid from private.live_questions(p_lesson_id))
$$;

-- 7.W13: text normalized for the word-for-word test: lower case, punctuation dropped, a leading "to" dropped,
-- person words (your, his, her, their, one's, own) set aside. Tense is left to the checker (10.46, 10.47).
create or replace function private.w13_norm(p text) returns text
language sql immutable set search_path = '' as $$
  select btrim(regexp_replace(regexp_replace(regexp_replace(
           ' ' || regexp_replace(regexp_replace(lower(coalesce(p, '')), '[’'']s\M', 's', 'g'), '[^a-z0-9 ]+', ' ', 'g') || ' ',
           ' (your|his|her|their|ones|own) ', ' ', 'g'),
           ' (your|his|her|their|ones|own) ', ' ', 'g'),
           '\s+', ' ', 'g'))
$$;
-- 7.W13: true when a text carries an approved meaning word for word (its normalized words, in order)
create or replace function private.w13_carries(p_text text, p_meaning text) returns boolean
language sql immutable set search_path = '' as $$
  select position(' ' || regexp_replace(private.w13_norm(p_meaning), '^to ', '') || ' '
                  in ' ' || regexp_replace(private.w13_norm(p_text), '^to ', '') || ' ') > 0
         and btrim(private.w13_norm(p_meaning)) <> ''
$$;

-- ---------------------------------------------------------------------------
-- 14. Triggers that stand in for cross-row rules (R11, A9, G2, G10, G15–G18)
-- ---------------------------------------------------------------------------

-- Profile: sign-up creates the four per-player rows (A12). Runs as definer on auth.users insert.
create or replace function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_name text;
begin
  v_name := nullif(trim(coalesce(
              new.raw_user_meta_data ->> 'full_name',
              new.raw_user_meta_data ->> 'name',
              '')), '');
  if v_name is null or v_name ~* '@' then
    v_name := 'Player ' || lpad((floor(random() * 10000))::int::text, 4, '0');
    while exists (select 1 from public.profile where display_name = v_name) loop
      v_name := 'Player ' || lpad((floor(random() * 10000))::int::text, 4, '0');
    end loop;
  end if;
  insert into public.profile (id, display_name) values (new.id, left(v_name, 40));
  insert into public.profile_private (profile_id) values (new.id);
  insert into public.settings (profile_id) values (new.id);
  insert into public.day_streak (profile_id) values (new.id);
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- Profile: protected columns; tombstone never written by a player
create or replace function private.profile_protect() returns trigger
language plpgsql set search_path = '' as $$
begin
  if current_user = 'postgres' then return new; end if;
  if old.is_system then
    raise exception 'the system profile cannot be changed' using errcode = '42501';
  end if;
  if new.id <> old.id or new.is_system <> old.is_system or new.joined_at <> old.joined_at then
    raise exception 'protected column' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger profile_protect before update on public.profile
  for each row execute function private.profile_protect();

-- Profile Private: timezone must be a valid IANA name (R21)
create or replace function private.profile_private_check() returns trigger
language plpgsql set search_path = '' as $$
begin
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = new.timezone) then
    raise exception 'unknown timezone %', new.timezone using errcode = '23514';
  end if;
  return new;
end $$;
create trigger profile_private_check before insert or update on public.profile_private
  for each row execute function private.profile_private_check();

-- Settings and Memory Verse Text: only an enabled translation (R11)
create or replace function private.translation_enabled_check() returns trigger
language plpgsql set search_path = '' as $$
begin
  if not exists (select 1 from public.translation where code = new.translation_code and enabled) then
    raise exception 'translation % is not enabled', new.translation_code using errcode = '23514';
  end if;
  return new;
end $$;
create trigger settings_translation_enabled before insert or update of translation_code on public.settings
  for each row execute function private.translation_enabled_check();
create trigger memory_verse_text_translation_enabled before insert or update of translation_code on public.memory_verse_text
  for each row execute function private.translation_enabled_check();

-- Lesson Passage: both verses in one book, from <= to (R13);
-- 6.6, 8.2: label only on Jesus Prophecies rows; 7.W4, 7.I4: no parallel rows in Words or Idioms
create or replace function private.lesson_passage_check() returns trigger
language plpgsql set search_path = '' as $$
declare f record; t record; v_recipe text := private.lesson_recipe(new.cookie_lesson_id);
begin
  select book_id, sequence into f from public.verse where id = new.from_verse_id;
  select book_id, sequence into t from public.verse where id = new.to_verse_id;
  if f.book_id <> t.book_id or f.sequence > t.sequence then
    raise exception 'passage must stay in one book and run forward' using errcode = '23514';
  end if;
  if (v_recipe = 'Jesus Prophecies') <> (new.label is not null) then
    raise exception '6.6: Jesus Prophecies rows carry label Prophecy or Fulfillment; other rows an empty label' using errcode = '23514';
  end if;
  if v_recipe in ('Words','Idioms') and new.parallel then
    raise exception '7.W4, 7.I4: Words and Idioms rows are the terms'' verses, never parallel rows' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger lesson_passage_check before insert or update on public.lesson_passage
  for each row execute function private.lesson_passage_check();

-- Jesus Prophecy Link, 7.J1: a link runs OT to NT or NT to NT, never OT to OT; 3.4: a "stated in NT" verse is in the New Testament
create or replace function private.prophecy_testament_check() returns trigger
language plpgsql set search_path = '' as $$
begin
  if (select b.testament from public.verse v join public.book b on b.id = v.book_id where v.id = new.fulfillment_verse_id) <> 'NT' then
    raise exception '7.J1: the fulfillment is in the New Testament (OT to NT or NT to NT, never OT to OT)' using errcode = '23514';
  end if;
  if new.stated_in_verse_id is not null
     and (select b.testament from public.verse v join public.book b on b.id = v.book_id where v.id = new.stated_in_verse_id) <> 'NT' then
    raise exception '3.4: stated in NT names a New Testament verse' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger prophecy_testament_check before insert or update on public.jesus_prophecy_link
  for each row execute function private.prophecy_testament_check();

-- Memory Verse: at most 250 approved (owner rule, enforced here not in the app)
create or replace function private.memory_verse_cap() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.approved and (select count(*) from public.memory_verse where approved and id <> new.id) >= 250 then
    raise exception 'memory verse list is capped at 250' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger memory_verse_cap before insert or update of approved on public.memory_verse
  for each row execute function private.memory_verse_cap();

-- Published content is never deleted once a completion exists (R7, owner ruling)
create or replace function private.block_delete_if_completed() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_table_name = 'cookie_dough_flavor' then
    if exists (select 1 from public.cookie_completion cc join public.cookie_lesson cl on cl.id = cc.cookie_lesson_id
               where cl.cookie_dough_flavor_id = old.id)
       or exists (select 1 from public.dough_progress where cookie_dough_flavor_id = old.id) then
      raise exception 'flavor has player history; retire it instead' using errcode = '23503';
    end if;
  elsif tg_table_name = 'cookie_lesson' then
    if exists (select 1 from public.cookie_completion where cookie_lesson_id = old.id) then
      raise exception 'lesson has completions; retire it instead' using errcode = '23503';
    end if;
  elsif tg_table_name = 'question' then
    if exists (select 1 from public.cookie_completion where cookie_lesson_id = old.cookie_lesson_id) then
      raise exception 'question belongs to a completed lesson; retire it instead' using errcode = '23503';
    end if;
  end if;
  return old;
end $$;
create trigger cookie_dough_flavor_no_delete before delete on public.cookie_dough_flavor
  for each row execute function private.block_delete_if_completed();
create trigger cookie_lesson_no_delete before delete on public.cookie_lesson
  for each row execute function private.block_delete_if_completed();
create trigger question_no_delete before delete on public.question
  for each row execute function private.block_delete_if_completed();

-- Published flavor: lesson count per 2.4 / 7.L1 / 7.I2 / 7.J2 at publish time (private.flavor_lesson_count_ok);
-- version counts edits (R7 as amended)
create or replace function private.flavor_publish_check() returns trigger
language plpgsql set search_path = '' as $$
declare n integer;
begin
  -- v3 ladder (owner ruling 15:16): question approved -> lesson approved -> flavor approved -> published
  if new.status in ('reviewed','approved','published') and (tg_op = 'INSERT' or new.status is distinct from old.status) then
    if exists (select 1 from public.cookie_lesson cl where cl.cookie_dough_flavor_id = new.id and cl.retired_at is null
               and cl.status = 'draft') then
      raise exception 'a flavor is reviewed only when every cookie lesson is reviewed' using errcode = '23514';
    end if;
    perform private.flavor_content_check(new.id);   -- flavor-wide hard rules
  end if;
  if new.status in ('approved','published') and (tg_op = 'INSERT' or new.status is distinct from old.status) then
    if exists (select 1 from public.cookie_lesson cl where cl.cookie_dough_flavor_id = new.id and cl.retired_at is null
               and cl.status <> 'approved') then
      raise exception 'a flavor is approved only when every cookie lesson is approved' using errcode = '23514';
    end if;
  end if;
  if new.status = 'published' and (tg_op = 'INSERT' or old.status is distinct from 'published') then
    select count(*) into n from public.cookie_lesson where cookie_dough_flavor_id = new.id and retired_at is null;
    if not private.flavor_lesson_count_ok(new.id, n) then
      raise exception '2.4: this flavor cannot publish with % cookie lessons', n using errcode = '23514';
    end if;
    if exists (select 1 from public.cookie_lesson cl where cl.cookie_dough_flavor_id = new.id and cl.retired_at is null
               and not exists (select 1 from public.question q where q.cookie_lesson_id = cl.id and q.retired_at is null)) then
      raise exception 'every cookie lesson needs at least one question before publishing' using errcode = '23514';
    end if;
  end if;
  if tg_op = 'UPDATE' and old.status = 'published'
     and (new.name, new.description) is distinct from (old.name, old.description) then
    new.version := old.version + 1;
  end if;
  return new;
end $$;
create trigger flavor_publish_check before insert or update on public.cookie_dough_flavor
  for each row execute function private.flavor_publish_check();

create or replace function private.stamp_edited_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.edited_at := now();
  if tg_table_name = 'question' then
    update public.cookie_dough_flavor f set version = version + 1
    from public.cookie_lesson cl where cl.id = new.cookie_lesson_id and f.id = cl.cookie_dough_flavor_id and f.status = 'published';
  else
    update public.cookie_dough_flavor set version = version + 1 where id = new.cookie_dough_flavor_id and status = 'published';
  end if;
  return new;
end $$;
create trigger cookie_lesson_edited before update of title, intro, meaning, reference_text, scene_intro, verse_intro on public.cookie_lesson
  for each row when ((old.title, old.intro, old.meaning, old.reference_text, old.scene_intro, old.verse_intro)
                     is distinct from (new.title, new.intro, new.meaning, new.reference_text, new.scene_intro, new.verse_intro))
  execute function private.stamp_edited_at();
-- 3.10: edited_at is for player wording; clue is not player wording
create trigger question_edited before update of type, story, prompt, answer, why on public.question
  for each row when ((old.type, old.story, old.prompt, old.answer, old.why)
                     is distinct from (new.type, new.story, new.prompt, new.answer, new.why))
  execute function private.stamp_edited_at();

-- 3.10: a change to an explanation alone is an edit (stamps edited_at); option deletes on a completed lesson are refused
create or replace function private.option_edited() returns trigger
language plpgsql set search_path = '' as $$
declare v_q uuid := coalesce(new.question_id, old.question_id);
begin
  if tg_op = 'DELETE' and exists (select 1 from public.question q join public.cookie_completion cc on cc.cookie_lesson_id = q.cookie_lesson_id where q.id = old.question_id) then
    raise exception 'option belongs to a completed lesson; retire and replace the question (3.10)' using errcode = '23503';
  end if;
  if tg_op = 'UPDATE' and (old.text, old.is_correct, old.blank, old.order_question_sequence, old.side, old.pair, old.explanation)
     is not distinct from (new.text, new.is_correct, new.blank, new.order_question_sequence, new.side, new.pair, new.explanation) then
    return new;   -- a position touch is not an edit
  end if;
  update public.question set edited_at = now() where id = v_q;
  update public.cookie_dough_flavor f set version = version + 1
    from public.question q join public.cookie_lesson cl on cl.id = q.cookie_lesson_id
   where q.id = v_q and f.id = cl.cookie_dough_flavor_id and f.status = 'published';
  return coalesce(new, old);
end $$;
create trigger question_option_edited after insert or update or delete on public.question_option
  for each row execute function private.option_edited();

-- v3 ladder: a lesson is reviewed/approved only when every live question is; approval is a one-way gate per level.
-- 3.10, 3.7: a lesson's ladder ignores pending replacements (the replaced question stands for that order)
create or replace function private.lesson_status_check() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.status in ('reviewed','approved') and (tg_op = 'INSERT' or new.status is distinct from old.status) then
    if exists (select 1 from public.question q where q.cookie_lesson_id = new.id and q.retired_at is null
               and not private.is_pending_replacement(q) and q.status = 'draft') then
      raise exception 'a lesson is reviewed only when every question is reviewed' using errcode = '23514';
    end if;
  end if;
  if new.status = 'approved' and (tg_op = 'INSERT' or new.status is distinct from old.status) then
    if exists (select 1 from public.question q where q.cookie_lesson_id = new.id and q.retired_at is null
               and not private.is_pending_replacement(q) and q.status <> 'approved') then
      raise exception 'a lesson is approved only when every question is approved' using errcode = '23514';
    end if;
  end if;
  if new.status in ('reviewed','approved') and (tg_op = 'INSERT' or new.status is distinct from old.status) then
    perform private.lesson_content_check(new.id);   -- every hard Section 4/7/8/10 rule the rows can show
  end if;
  return new;
end $$;
create trigger lesson_status_check before insert or update of status on public.cookie_lesson
  for each row execute function private.lesson_status_check();

-- 0.6 discovery cap (a pending replacement never counts as a fourth discovery); a question below its lesson's status
-- pulls the lesson down, except a 3.10 replacement draft; options, Question Verse and term rows required before review
create or replace function private.question_rules_check() returns trigger
language plpgsql set search_path = '' as $$
declare v_recipe text := private.lesson_recipe(new.cookie_lesson_id);
begin
  if new.clue = 'discovery' and new.retired_at is null
     and (select count(*) from public.question q where q.cookie_lesson_id = new.cookie_lesson_id and q.clue = 'discovery'
          and q.retired_at is null and not private.is_pending_replacement(q) and q.id <> new.id
          and q.id is distinct from new.replaces_question_id) >= 3 then
    raise exception '0.6: at most 3 discovery questions per lesson' using errcode = '23514';
  end if;
  -- a question below its lesson's status pulls the lesson down to it; a 3.10 replacement draft does not
  if new.retired_at is null and not private.is_pending_replacement(new)
     and (tg_op = 'INSERT' or new.status is distinct from old.status) then
    update public.cookie_lesson cl set status = new.status
     where cl.id = new.cookie_lesson_id
       and (case cl.status when 'draft' then 0 when 'reviewed' then 1 else 2 end)
         > (case new.status when 'draft' then 0 when 'reviewed' then 1 else 2 end);
  end if;
  if new.status <> 'draft' and (tg_op = 'INSERT' or new.status is distinct from old.status) then
    if not exists (select 1 from public.question_option o where o.question_id = new.id) then   -- 4.F2: tf included
      raise exception 'a % question needs its options before review', new.type using errcode = '23514';
    end if;
    if not exists (select 1 from public.question_verse qv where qv.question_id = new.id) then   -- 1.4, 8.5 never empty
      raise exception '1.4, 8.5: a question needs at least one Question Verse row before review' using errcode = '23514';
    end if;
    if v_recipe = 'Words' and not exists (select 1 from public.question_word w where w.question_id = new.id)
       or v_recipe = 'Idioms' and not exists (select 1 from public.question_idiom i where i.question_id = new.id) then
      raise exception '7.W7, 10.32: a Words or Idioms question needs its Question Word / Question Idiom rows before review' using errcode = '23514';
    end if;
  end if;
  return new;
end $$;
create trigger question_rules_check before insert or update on public.question
  for each row execute function private.question_rules_check();
comment on function private.question_rules_check() is
  '0.6 discovery cap; a question below its lesson''s status pulls the lesson (not the flavor) down, except a 3.10 replacement draft; options, Question Verse and term rows required before review.';

-- 2.4 / 7.I2 / 7.J2: under a published flavor, at most 5 live lessons (2 in Idioms and Jesus Prophecies)
create or replace function private.lesson_count_check() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.retired_at is null and exists (select 1 from public.cookie_dough_flavor f where f.id = new.cookie_dough_flavor_id and f.status = 'published')
     and (select count(*) from public.cookie_lesson where cookie_dough_flavor_id = new.cookie_dough_flavor_id and retired_at is null and id <> new.id)
         >= (case when private.flavor_recipe(new.cookie_dough_flavor_id) in ('Idioms','Jesus Prophecies') then 2 else 5 end) then
    raise exception '2.4: a published flavor is at its lesson limit' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger lesson_count_check before insert or update of retired_at on public.cookie_lesson
  for each row execute function private.lesson_count_check();

-- 4.F2: a change to type, answer or prompt re-runs the deferred option shape check (answer must still match the True/False row)
create or replace function private.question_type_changed() returns trigger
language plpgsql set search_path = '' as $$
begin
  if exists (select 1 from public.question_option o where o.question_id = new.id) then
    -- touch one option row so the deferred shape check fires for this question
    update public.question_option set position = position where question_id = new.id;
  end if;
  return new;
end $$;
create trigger question_type_changed after update of type, answer, prompt on public.question
  for each row when ((old.type, old.answer, old.prompt) is distinct from (new.type, new.answer, new.prompt))
  execute function private.question_type_changed();

-- v3: option shape per type, checked at commit (rows arrive one at a time).
-- 4.F1–4.F6, 8.4, 10.32: counts and grading columns per type; 4.F2: tf has exactly two rows, True (0) and False (1)
create or replace function private.question_options_check() returns trigger
language plpgsql set search_path = '' as $$
declare q public.question; n_rows integer; n_correct integer; n_blanks integer; n_marks integer; n_left integer; n_right integer;
begin
  select * into q from public.question where id = coalesce((to_jsonb(new) ->> 'question_id'), (to_jsonb(old) ->> 'question_id'))::uuid;
  if not found then return null; end if;
  select count(*), count(*) filter (where is_correct) into n_rows, n_correct from public.question_option where question_id = q.id;
  if n_rows = 0 then return null; end if;   -- no rows yet: question_rules_check refuses review without them
  -- 8.4, 10.32: each grading column only on its own type
  if exists (select 1 from public.question_option o where o.question_id = q.id and (
          (q.type not in ('mc','fill','tf') and o.is_correct is not null)
       or (q.type <> 'wordbank' and o.blank is not null)
       or (q.type <> 'order' and o.order_question_sequence is not null)
       or (q.type = 'order' and o.order_question_sequence is null)
       or (q.type <> 'match' and (o.side is not null or o.pair is not null))
       or (q.type = 'match' and (o.side is null or o.pair is null)))) then
    raise exception '8.4: is_correct only on mc/fill/tf, blank only on wordbank, order_question_sequence on every order item and nowhere else, side and pair on every match item and nowhere else (question %)', q.id using errcode = '23514';
  end if;
  -- 8.4: position starts at 0 and runs without gaps, per match side
  if exists (select 1 from public.question_option o where o.question_id = q.id
              group by coalesce(o.side, '') having min(o.position) <> 0 or max(o.position) <> count(*) - 1) then
    raise exception '8.4: positions start at 0 with no gaps (question %)', q.id using errcode = '23514';
  end if;
  case q.type
    when 'tf' then
      -- 4.F2, 8.4: True at 0, False at 1, the correct row matches answer
      if n_rows <> 2
         or not exists (select 1 from public.question_option where question_id = q.id and text = 'True'  and position = 0)
         or not exists (select 1 from public.question_option where question_id = q.id and text = 'False' and position = 1)
         or n_correct <> 1
         or not exists (select 1 from public.question_option where question_id = q.id and is_correct
                        and text = case when q.answer then 'True' else 'False' end) then
        raise exception '4.F2: a tf question has two rows, True at position 0 and False at position 1, the one matching answer marked correct (question %)', q.id using errcode = '23514';
      end if;
    when 'mc' then
      if n_rows <> 4 or n_correct <> 1 then   -- 4.F1, 8.4
        raise exception '4.F1: mc has 4 options, exactly one correct (question %)', q.id using errcode = '23514';
      end if;
    when 'fill' then
      select count(*) into n_marks from regexp_matches(q.prompt, '(?<!_)___(?!_)', 'g');
      if n_rows not between 3 and 4 or n_correct <> 1 or n_marks <> 1 then   -- 4.F3, 4.Q4
        raise exception '4.F3: fill has one ___ blank and 3 or 4 options, exactly one correct (question %)', q.id using errcode = '23514';
      end if;
    when 'wordbank' then
      select count(distinct blank) into n_blanks from public.question_option where question_id = q.id and blank is not null;
      select count(*) into n_marks from regexp_matches(q.prompt, '(?<!_)___(?!_)', 'g');
      if n_blanks not between 1 and 3
         or (select max(blank) from public.question_option where question_id = q.id) <> n_blanks           -- blanks numbered 1..n
         or (select count(*) from public.question_option where question_id = q.id and blank is not null) <> n_blanks   -- one word per blank
         or (n_rows - n_blanks) not between 2 and 3                                                        -- 4.F4: 2 or 3 extras
         or n_marks <> n_blanks then                                                                       -- 4.Q4: ___ marks every blank
        raise exception '4.F4: word bank has 1 to 3 blanks numbered 1..n, one ___ per blank in the prompt, one word per blank and 2 or 3 extras (question %)', q.id using errcode = '23514';
      end if;
    when 'order' then
      if n_rows not between 3 and 4                                                                                  -- 4.F5
         or (select count(distinct order_question_sequence) from public.question_option where question_id = q.id) <> n_rows
         or (select min(order_question_sequence) from public.question_option where question_id = q.id) <> 1
         or (select max(order_question_sequence) from public.question_option where question_id = q.id) <> n_rows        -- 1..n
         or (select count(*) from public.question_option where question_id = q.id and position + 1 <> order_question_sequence) < 2 then   -- scrambled
        raise exception '4.F5, 8.4: order has 3 or 4 items, sequence 1..n, at least two shown out of place (question %)', q.id using errcode = '23514';
      end if;
    when 'match' then
      select count(*) filter (where side = 'left'), count(*) filter (where side = 'right') into n_left, n_right
        from public.question_option where question_id = q.id;
      if n_left <> n_right or n_left not between 3 and 4                                                             -- 4.F6
         or exists (select 1 from public.question_option where question_id = q.id group by pair, side having count(*) <> 1)
         or (select coalesce(array_agg(pair order by pair), '{}') from public.question_option where question_id = q.id and side = 'left')
            <> (select coalesce(array_agg(pair order by pair), '{}') from public.question_option where question_id = q.id and side = 'right')
         or (select count(*) from public.question_option r join public.question_option l
                    on l.question_id = r.question_id and l.side = 'left' and l.pair = r.pair
              where r.question_id = q.id and r.side = 'right' and r.position <> l.position) < 2 then                 -- right side scrambled
        raise exception '4.F6, 8.4: match has 3 or 4 complete pairs, at least two right items away from their left pair''s position (question %)', q.id using errcode = '23514';
      end if;
  end case;
  -- 4.Q4: longest option minus shortest is 3 words or less; match per side; tf rows exempt (fixed text)
  if q.type <> 'tf' and exists (select 1 from public.question_option where question_id = q.id
       group by coalesce(side, '') having max(private.word_count(text)) - min(private.word_count(text)) > 3) then
    raise exception '4.Q4: options in one set differ by more than 3 words (question %)', q.id using errcode = '23514';
  end if;
  return null;
end $$;
create constraint trigger question_options_check after insert or update or delete on public.question_option
  deferrable initially deferred for each row execute function private.question_options_check();

-- 3.1, 1.10: an approved word has its meaning, its Easton's entry, an anchor verse that prints it, and a meaning within the flavor's 3-word band
create or replace function private.word_approved_check() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.approved then
    if new.dictionary_entry_id is null or nullif(btrim(new.meaning), '') is null then
      raise exception '3.1, 1.10: an approved word has its meaning and its dictionary entry' using errcode = '23514';
    end if;
    if private.norm((select text from public.verse where id = new.anchor_verse_id))
       !~ ('\m' || regexp_replace(private.norm(new.word), '([.*+?^${}()|\[\]\\])', '\\\1', 'g') || '\M') then
      raise exception '3.1, 7.W4: the anchor verse prints the word' using errcode = '23514';
    end if;
    if exists (select 1 from (select private.word_count(meaning) c from public.word
                                where cookie_dough_flavor_id = new.cookie_dough_flavor_id and approved and id <> new.id
                              union all select private.word_count(new.meaning)) x having max(c) - min(c) > 3) then
      raise exception '3.1: every meaning in a flavor sits within a 3-word length band' using errcode = '23514';
    end if;
  end if;
  return new;
end $$;
create trigger word_approved_check before insert or update on public.word
  for each row execute function private.word_approved_check();

-- 3.2: an approved idiom has a 3-to-10-word meaning within the flavor's band and at least one kept verse
create or replace function private.idiom_approved_check() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.approved then
    if private.word_count(new.meaning) not between 3 and 10 then
      raise exception '3.2: an idiom meaning is 3 to 10 words' using errcode = '23514';
    end if;
    if not exists (select 1 from public.idiom_verse where idiom_id = new.id and kept) then
      raise exception '3.2: an approved idiom has at least one kept verse' using errcode = '23514';
    end if;
    if exists (select 1 from (select private.word_count(meaning) c from public.idiom
                                where cookie_dough_flavor_id = new.cookie_dough_flavor_id and approved and id <> new.id
                              union all select private.word_count(new.meaning)) x having max(c) - min(c) > 3) then
      raise exception '3.2: every meaning in a flavor sits within a 3-word length band' using errcode = '23514';
    end if;
  end if;
  return new;
end $$;
create trigger idiom_approved_check before insert or update on public.idiom
  for each row execute function private.idiom_approved_check();

-- 7.I4, 3.2: a kept Idiom Verse prints the phrase (a verse left out says why: idiom_verse_reason_when_left_out)
create or replace function private.idiom_verse_check() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.kept and position(private.norm((select phrase from public.idiom where id = new.idiom_id))
                           in private.norm((select text from public.verse where id = new.verse_id))) = 0 then
    raise exception '7.I4, 3.2: a kept Idiom Verse prints the phrase' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger idiom_verse_check before insert or update on public.idiom_verse
  for each row execute function private.idiom_verse_check();

-- Resume Eligible: unfinished cap by entitlement (owner ruling 12:51). Nothing is shed; at the cap the player
-- finishes one, or closes an open that has no answers yet (close_unanswered_lesson). The Profile row is locked first.
create or replace function private.resume_eligible_cap() returns trigger
language plpgsql set search_path = '' as $$
declare v_cap integer; v_open integer;
begin
  perform 1 from public.profile where id = new.profile_id for update;
  v_cap := case when private.is_plus(new.profile_id)
                then private.setting_int('unfinished_cap_plus')
                else private.setting_int('unfinished_cap_free') end;
  select count(*) into v_open from public.resume_eligible
   where profile_id = new.profile_id and finished_at is null;
  if v_open >= v_cap then
    raise exception 'unfinished lessons at the limit (%); finish one first', v_cap using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger resume_eligible_cap before insert on public.resume_eligible
  for each row execute function private.resume_eligible_cap();

-- Resume Eligible: lesson must belong to a flavor the player has opened (R22 remainder)
create or replace function private.resume_eligible_flavor_check() returns trigger
language plpgsql set search_path = '' as $$
begin
  if not exists (
    select 1 from public.cookie_lesson cl
    join public.dough_progress dp on dp.cookie_dough_flavor_id = cl.cookie_dough_flavor_id
    where cl.id = new.cookie_lesson_id and dp.profile_id = new.profile_id) then
    raise exception 'open the flavor first' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger resume_eligible_flavor_check before insert on public.resume_eligible
  for each row execute function private.resume_eligible_flavor_check();

-- Active Look: owned, shop kind, right section (G16)
create or replace function private.active_look_check() returns trigger
language plpgsql set search_path = '' as $$
begin
  if not exists (
    select 1 from public.look_catalogue lc
    join public.owned_look ol on ol.look_id = lc.id and ol.profile_id = new.profile_id
    where lc.id = new.look_id and lc.kind = 'shop' and lc.category = new.category) then
    raise exception 'look must be an owned shop look of that section' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger active_look_check before insert or update on public.active_look
  for each row execute function private.active_look_check();

-- Keepsake Box: every look value is an owned box look (G15); protected columns; frozen once sent (A9)
create or replace function private.keepsake_box_check() returns trigger
language plpgsql set search_path = '' as $$
declare k text; v text;
begin
  if tg_op = 'UPDATE' then
    if private.box_is_sent(old.id) and current_user <> 'postgres' then
      raise exception 'a sent gift box cannot change' using errcode = '42501';
    end if;
    if (new.profile_id, new.recipe_id, new.earned_by_cookie_dough_flavor_id, new.is_gift, new.is_public, new.crumbs_count, new.created_at)
       is distinct from
       (old.profile_id, old.recipe_id, old.earned_by_cookie_dough_flavor_id, old.is_gift, old.is_public, old.crumbs_count, old.created_at)
       and current_user <> 'postgres' then
      raise exception 'protected column' using errcode = '42501';
    end if;
  end if;
  if tg_op = 'UPDATE' and new.look = old.look then return new; end if;   -- re-pointing to the tombstone keeps the look as it was
  for k, v in select key, value from jsonb_each_text(new.look) loop
    if not exists (
      select 1 from public.look_catalogue lc
      join public.owned_look ol on ol.look_id = lc.id and ol.profile_id = new.profile_id
      where lc.kind = 'box' and lc.category = k and lc.name = v) then
      raise exception 'box look % = % is not owned', k, v using errcode = '23514';
    end if;
  end loop;
  return new;
end $$;
create trigger keepsake_box_check before insert or update on public.keepsake_box
  for each row execute function private.keepsake_box_check();

-- G2 / R2: a gift box has exactly one Gift Box Details row, checked at commit
create or replace function private.gift_box_pair_check() returns trigger
language plpgsql set search_path = '' as $$
declare r record; v_box uuid;
begin
  v_box := coalesce(case when tg_table_name = 'keepsake_box' then (to_jsonb(new) ->> 'id') else (to_jsonb(new) ->> 'box_id') end,
                    (to_jsonb(old) ->> 'box_id'))::uuid;
  for r in select id, is_gift from public.keepsake_box where id = v_box loop
    if r.is_gift and not exists (select 1 from public.gift_box_details where box_id = r.id) then
      raise exception 'a gift box needs its Gift Box Details' using errcode = '23514';
    end if;
    if not r.is_gift and exists (select 1 from public.gift_box_details where box_id = r.id) then
      raise exception 'only a gift box has Gift Box Details' using errcode = '23514';
    end if;
  end loop;
  return null;
end $$;
create constraint trigger keepsake_box_gift_pair after insert or update of is_gift on public.keepsake_box
  deferrable initially deferred for each row execute function private.gift_box_pair_check();
create constraint trigger gift_box_details_pair after insert or delete on public.gift_box_details
  deferrable initially deferred for each row execute function private.gift_box_pair_check();

-- Gift Box Details: protected columns; frozen once sent (A9)
create or replace function private.gift_box_details_protect() returns trigger
language plpgsql set search_path = '' as $$
begin
  if old.sent_at is not null and current_user <> 'postgres' then
    raise exception 'a sent gift cannot change' using errcode = '42501';
  end if;
  if new.sent_at is distinct from old.sent_at and current_user <> 'postgres' then
    raise exception 'protected column' using errcode = '42501';
  end if;
  if new.sent_to_profile_id is distinct from old.sent_to_profile_id and current_user <> 'postgres' then
    if new.sent_to_profile_id is not null and (
         new.sent_to_profile_id = (select auth.uid()) or new.sent_to_profile_id = private.tombstone_id()
         or private.is_blocked_either_way((select auth.uid()), new.sent_to_profile_id)) then
      raise exception 'that recipient is not allowed' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;
create trigger gift_box_details_protect before update on public.gift_box_details
  for each row execute function private.gift_box_details_protect();

-- Box Element Position: frozen once sent (A9)
create or replace function private.box_element_frozen() returns trigger
language plpgsql set search_path = '' as $$
begin
  if private.box_is_sent(coalesce(new.box_id, old.box_id)) and current_user <> 'postgres' then
    raise exception 'a sent gift box cannot change' using errcode = '42501';
  end if;
  return coalesce(new, old);
end $$;
create trigger box_element_frozen before insert or update or delete on public.box_element_position
  for each row execute function private.box_element_frozen();

-- Box Crumb: not across a block; not before a capsule unlocks; crumbs_count cache (G10, A11)
create or replace function private.box_crumb_check() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_owner uuid;
begin
  if tg_op = 'INSERT' then
    select profile_id into v_owner from public.keepsake_box where id = new.box_id;
    if private.is_blocked_either_way(new.profile_id, v_owner) or private.deletion_pending(new.profile_id) then
      raise exception 'blocked' using errcode = '42501';
    end if;
    update public.keepsake_box set crumbs_count = crumbs_count + 1 where id = new.box_id;
    return new;
  else
    update public.keepsake_box set crumbs_count = greatest(crumbs_count - 1, 0) where id = old.box_id;
    return old;
  end if;
end $$;
create trigger box_crumb_check after insert or delete on public.box_crumb
  for each row execute function private.box_crumb_check();

-- Follow: not across a block (owner ruling G12)
create or replace function private.follow_check() returns trigger
language plpgsql set search_path = '' as $$
begin
  if private.is_blocked_either_way(new.follower_id, new.followed_id) then
    raise exception 'blocked' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger follow_check before insert on public.follow
  for each row execute function private.follow_check();

-- Block: creating one deletes Follow rows both ways (owner ruling G12)
create or replace function private.block_after_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.follow
   where (follower_id = new.blocker_id and followed_id = new.blocked_id)
      or (follower_id = new.blocked_id and followed_id = new.blocker_id);
  return new;
end $$;
create trigger block_after_insert after insert on public.block
  for each row execute function private.block_after_insert();

-- Game Invite: friend, not blocked, protected columns (R19, A9)
create or replace function private.game_invite_check() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    if not private.is_friend(new.from_profile_id, new.to_profile_id) then
      raise exception 'invitee must be a friend who has not blocked you' using errcode = '42501';
    end if;
    if not exists (select 1 from public.game where id = new.game_id and host_profile_id = new.from_profile_id and status = 'open') then
      raise exception 'only the host of an open game may invite' using errcode = '42501';
    end if;
  else
    if (new.game_id, new.from_profile_id, new.to_profile_id, new.sent_at) is distinct from (old.game_id, old.from_profile_id, old.to_profile_id, old.sent_at)
       or old.answered_at is not null then
      raise exception 'protected column' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;
create trigger game_invite_check before insert or update on public.game_invite
  for each row execute function private.game_invite_check();

-- Game: protected columns for the host (A9)
create or replace function private.game_protect() returns trigger
language plpgsql set search_path = '' as $$
begin
  if current_user <> 'postgres' then
    if (new.host_profile_id, new.game_result, new.ended_at, new.game_type, new.started_at)
       is distinct from (old.host_profile_id, old.game_result, old.ended_at, old.game_type, old.started_at) then
      raise exception 'protected column' using errcode = '42501';
    end if;
    if new.status is distinct from old.status and not (old.status = 'open' and new.status = 'playing') then
      raise exception 'a game only moves open -> playing by the host; finish_game ends it' using errcode = '42501';
    end if;
  end if;
  if new.status = 'playing' and old.status = 'open' then
    new.started_at := now();
  end if;
  return new;
end $$;
create trigger game_protect before update on public.game
  for each row execute function private.game_protect();

-- Collected Question: only from a lesson the player completed (A9 list); 4.Q21: only mc, tf and fill join the trivia pool
create or replace function private.collected_question_check() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (
    select 1 from public.question q
    join public.cookie_completion cc on cc.cookie_lesson_id = q.cookie_lesson_id and cc.profile_id = new.profile_id
    where q.id = new.question_id) then
    raise exception 'finish the lesson first' using errcode = '42501';
  end if;
  if (select type from public.question where id = new.question_id) not in ('mc','tf','fill') then
    raise exception '4.Q21: only mc, tf and fill questions join the trivia pool' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger collected_question_check before insert on public.collected_question
  for each row execute function private.collected_question_check();

-- TV Reminder: slot exists and is in the future
create or replace function private.tv_reminder_check() returns trigger
language plpgsql set search_path = '' as $$
begin
  if not exists (select 1 from public.tv_schedule where id = new.schedule_id and start_at > now()) then
    raise exception 'slot is past' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger tv_reminder_check before insert or update on public.tv_reminder
  for each row execute function private.tv_reminder_check();

-- Storage cleanup: queue object paths when a box or its details go (A15)
create or replace function private.queue_box_files() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if old.photo_file_path is not null then insert into public.storage_cleanup_queue (bucket, path) values ('box-photos', old.photo_file_path); end if;
  if old.voice_note_file_path is not null then insert into public.storage_cleanup_queue (bucket, path) values ('box-audio', old.voice_note_file_path); end if;
  if old.signature_file_path is not null then insert into public.storage_cleanup_queue (bucket, path) values ('box-signatures', old.signature_file_path); end if;
  return old;
end $$;
create trigger gift_box_details_queue_files after delete on public.gift_box_details
  for each row execute function private.queue_box_files();

-- Reference layer and purchase: no deletes from the app, ever (R24, R3)
create or replace function private.refuse_delete() returns trigger
language plpgsql set search_path = '' as $$
begin
  raise exception 'rows in % are never deleted', tg_table_name using errcode = '42501';
end $$;
create trigger purchase_no_delete before delete on public.purchase for each row execute function private.refuse_delete();
-- R18: master lists and catalogues are retired, never deleted
create trigger translation_no_delete        before delete on public.translation        for each row execute function private.refuse_delete();
create trigger memory_verse_no_delete       before delete on public.memory_verse       for each row execute function private.refuse_delete();
create trigger word_no_delete               before delete on public.word               for each row execute function private.refuse_delete();
create trigger idiom_no_delete              before delete on public.idiom              for each row execute function private.refuse_delete();
create trigger jesus_prophecy_link_no_delete before delete on public.jesus_prophecy_link for each row execute function private.refuse_delete();
create trigger look_catalogue_no_delete     before delete on public.look_catalogue     for each row execute function private.refuse_delete();
create trigger badge_no_delete              before delete on public.badge              for each row execute function private.refuse_delete();
create trigger price_no_delete              before delete on public.price              for each row execute function private.refuse_delete();
create trigger tv_program_no_delete         before delete on public.tv_program         for each row execute function private.refuse_delete();

-- Memorized Verse (review F27): the memory verse must be readable and the Memorization Tool is Plus (map p.18)
create or replace function private.memorized_verse_check() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_plus(new.profile_id) then raise exception 'Plus only' using errcode = '42501'; end if;
  if not exists (select 1 from public.memory_verse mv where mv.id = new.memory_verse_id and mv.approved
                 and (mv.cookie_dough_flavor_id is null or private.flavor_is_published(mv.cookie_dough_flavor_id))) then
    raise exception 'memory verse not available' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger memorized_verse_check before insert on public.memorized_verse
  for each row execute function private.memorized_verse_check();

-- Deletion pending (review F12): player tables refuse writes once the account is marked for deletion
create or replace function private.refuse_if_deleting() returns trigger
language plpgsql set search_path = '' as $$
declare v_pid uuid;
begin
  v_pid := coalesce((to_jsonb(new) ->> 'profile_id'), (to_jsonb(new) ->> 'id'), (to_jsonb(new) ->> 'follower_id'), (to_jsonb(new) ->> 'blocker_id'))::uuid;
  if private.deletion_pending(v_pid) then
    raise exception 'account deletion is in progress' using errcode = '42501';
  end if;
  return new;
end $$;
create or replace function private.refuse_if_deleting_old() returns trigger
language plpgsql set search_path = '' as $$
declare v_pid uuid;
begin
  if current_user = 'postgres' then return old; end if;   -- cascades and functions pass
  v_pid := coalesce((to_jsonb(old) ->> 'profile_id'), (to_jsonb(old) ->> 'follower_id'), (to_jsonb(old) ->> 'blocker_id'))::uuid;
  if private.deletion_pending(v_pid) then
    raise exception 'account deletion is in progress' using errcode = '42501';
  end if;
  return old;
end $$;
create trigger follow_refuse_if_deleting            before insert on public.follow            for each row execute function private.refuse_if_deleting();
create trigger block_refuse_if_deleting             before insert on public.block             for each row execute function private.refuse_if_deleting();
create trigger memorized_verse_refuse_if_deleting   before insert on public.memorized_verse   for each row execute function private.refuse_if_deleting();
create trigger collected_question_refuse_if_deleting before insert on public.collected_question for each row execute function private.refuse_if_deleting();
create trigger active_look_refuse_if_deleting       before insert or update on public.active_look for each row execute function private.refuse_if_deleting();
create trigger tv_reminder_refuse_if_deleting       before insert on public.tv_reminder       for each row execute function private.refuse_if_deleting();
create trigger push_token_refuse_if_deleting        before insert or update on public.push_token for each row execute function private.refuse_if_deleting();
create trigger profile_refuse_if_deleting           before update on public.profile           for each row execute function private.refuse_if_deleting();
create trigger profile_private_refuse_if_deleting   before update on public.profile_private   for each row when (new.deletion_requested_at is not distinct from old.deletion_requested_at) execute function private.refuse_if_deleting();
create trigger settings_refuse_if_deleting          before update on public.settings          for each row execute function private.refuse_if_deleting();
create trigger follow_delete_refuse_if_deleting     before delete on public.follow            for each row execute function private.refuse_if_deleting_old();
create trigger block_delete_refuse_if_deleting      before delete on public.block             for each row execute function private.refuse_if_deleting_old();
create trigger push_token_delete_refuse_if_deleting before delete on public.push_token        for each row execute function private.refuse_if_deleting_old();
create trigger active_look_delete_refuse_if_deleting before delete on public.active_look      for each row execute function private.refuse_if_deleting_old();
create trigger tv_reminder_delete_refuse_if_deleting before delete on public.tv_reminder      for each row execute function private.refuse_if_deleting_old();
create trigger memorized_verse_delete_refuse_if_deleting before delete on public.memorized_verse for each row execute function private.refuse_if_deleting_old();
-- ---------------------------------------------------------------------------
-- 14b. Question Rules 3.3: retire-and-replace (3.10), published content (3.7), per-recipe row
--      checks, and the lesson and flavor gates
-- ---------------------------------------------------------------------------
-- 3.10: the replacement must sit in the same lesson at the same order as a live approved question
create or replace function private.replacement_check() returns trigger
language plpgsql set search_path = '' as $$
declare o public.question;
begin
  if new.replaces_question_id is null or (tg_op = 'UPDATE' and new.replaces_question_id is not distinct from old.replaces_question_id) then
    return new;
  end if;
  select * into o from public.question where id = new.replaces_question_id;
  if o.cookie_lesson_id <> new.cookie_lesson_id or o."order" <> new."order" or o.retired_at is not null or o.status <> 'approved' then
    raise exception '3.10: a replacement takes the order of a live approved question in the same lesson' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger question_replacement_check before insert or update of replaces_question_id, "order", cookie_lesson_id on public.question
  for each row execute function private.replacement_check();

-- 3.10: approving the replacement retires the old question and re-points repeat_of, in one step;
-- 3.10, 4.Q21: collected cards follow the replacement; 3.10: row-level option checks re-run.
-- security definer: the collected_question rows belong to players, and RLS would hide them from the approving admin.
create or replace function private.replacement_approved() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.replaces_question_id is not null and new.status = 'approved' and old.status <> 'approved' then
    -- published_content_guard (below) lets exactly this question be retired while its flavor is published
    perform set_config('bj.replacing', new.replaces_question_id::text, true);
    update public.question set retired_at = now() where id = new.replaces_question_id and retired_at is null;   -- 3.10
    perform set_config('bj.replacing', '', true);
    update public.question set repeat_of = new.id where repeat_of = new.replaces_question_id and id <> new.id;  -- 3.10
    -- 4.Q21: re-point collected cards when the replacement can sit in the trivia pool; a player who already has it keeps one card
    if new.type in ('mc','tf','fill') then
      delete from public.collected_question c
       where c.question_id = new.replaces_question_id
         and exists (select 1 from public.collected_question n where n.profile_id = c.profile_id and n.question_id = new.id);
      update public.collected_question set question_id = new.id where question_id = new.replaces_question_id;
    end if;
    -- 3.10, 8.4: re-run the deferred option shape check on the replacement at commit (a position touch is not an edit)
    update public.question_option set position = position where question_id = new.id;
  end if;
  return new;
end $$;
create trigger question_a_replacement_approved before update of status on public.question   -- "a_" sorts it before question_rules_check
  for each row execute function private.replacement_approved();

-- 3.7, 3.10: while a flavor is published, an approved live question or lesson never drops below approved,
-- is never retired outside a 3.10 replacement, and is never deleted. Changes go through 3.10
-- replace-on-approval only, so no lesson disappears from a published flavor.
create or replace function private.published_content_guard() returns trigger
language plpgsql set search_path = '' as $$
declare v_flavor uuid;
begin
  if old.status <> 'approved' or old.retired_at is not null then
    return coalesce(new, old);   -- only approved live content is held
  end if;
  if tg_table_name = 'question' then
    select cl.cookie_dough_flavor_id into v_flavor from public.cookie_lesson cl where cl.id = old.cookie_lesson_id;
  else
    v_flavor := old.cookie_dough_flavor_id;
  end if;
  if not exists (select 1 from public.cookie_dough_flavor f where f.id = v_flavor and f.status = 'published') then
    return coalesce(new, old);
  end if;
  if tg_op = 'DELETE' then
    raise exception 'C8, 3.10: approved % in a published flavor cannot be deleted; retire and replace it (3.10)', tg_table_name using errcode = '23514';
  end if;
  if new.status <> 'approved' then
    raise exception 'C8, 3.10: approved % in a published flavor cannot drop to %; write a 3.10 replacement instead', tg_table_name, new.status using errcode = '23514';
  end if;
  if new.retired_at is not null
     and (tg_table_name = 'cookie_lesson' or current_setting('bj.replacing', true) is distinct from old.id::text) then
    raise exception 'C8, 3.10: approved % in a published flavor is retired only by approving its 3.10 replacement', tg_table_name using errcode = '23514';
  end if;
  return new;
end $$;
create trigger question_published_guard before update of status, retired_at or delete on public.question
  for each row execute function private.published_content_guard();                                 -- 3.7, 3.10
create trigger cookie_lesson_published_guard before update of status, retired_at or delete on public.cookie_lesson
  for each row execute function private.published_content_guard();                                 -- 3.7, 3.10: no lesson disappears from a published flavor

-- 8.1: scene intro, verse intro and focus verse are Verses only
create or replace function private.cookie_lesson_row_check() returns trigger
language plpgsql set search_path = '' as $$
begin
  if private.flavor_recipe(new.cookie_dough_flavor_id) <> 'Verses'
     and (new.focus_verse_id is not null or nullif(btrim(new.scene_intro), '') is not null or nullif(btrim(new.verse_intro), '') is not null) then
    raise exception '8.1: scene intro, verse intro and focus verse id are empty outside Verses' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger cookie_lesson_row_check before insert or update on public.cookie_lesson
  for each row execute function private.cookie_lesson_row_check();

-- 8.3, 7.Wi2, 7.V5–7.V8: part per recipe; 7.W7/7.I7: shape only in Words/Idioms and from that recipe's list;
-- 7.W5, 7.I5: story empty in Words/Idioms; repeat_of points backward (4.Q6, 2.6, 3.9)
create or replace function private.question_row_check() returns trigger
language plpgsql set search_path = '' as $$
declare v_recipe text := private.lesson_recipe(new.cookie_lesson_id); t record;
begin
  if not (case v_recipe when 'Verses' then new.part in ('scene','verse','plain')
                        when 'Wisdom' then new.part in ('say','mean','apply')
                        else new.part = 'plain' end) then
    raise exception '8.3: part % is not allowed in %', new.part, v_recipe using errcode = '23514';
  end if;
  if v_recipe in ('Words','Idioms') then
    if new.shape is null then raise exception '8.3: every Words and Idioms question records its shape' using errcode = '23514'; end if;
    if v_recipe = 'Words' and new.shape in ('pick sentence','finish') then
      raise exception '7.W7: pick sentence and finish are Idioms shapes' using errcode = '23514';
    end if;
    if v_recipe = 'Idioms' and new.shape = 'wordbank' then
      raise exception '7.I7: no word bank in Idioms' using errcode = '23514';
    end if;
    if nullif(btrim(new.story), '') is not null then
      raise exception '7.W5, 7.I5: story is empty on every Words and Idioms question' using errcode = '23514';
    end if;
  elsif new.shape is not null then
    raise exception '8.3: shape is empty outside Words and Idioms' using errcode = '23514';
  end if;
  if new.repeat_of is not null then
    select q.cookie_lesson_id, q."order", cl."order" as lesson_order, cl.cookie_dough_flavor_id
      into t from public.question q join public.cookie_lesson cl on cl.id = q.cookie_lesson_id where q.id = new.repeat_of;
    if not ((t.cookie_lesson_id = new.cookie_lesson_id and t."order" < new."order")
         or (t.cookie_lesson_id <> new.cookie_lesson_id
             and t.cookie_dough_flavor_id = (select cookie_dough_flavor_id from public.cookie_lesson where id = new.cookie_lesson_id)
             and t.lesson_order < (select "order" from public.cookie_lesson where id = new.cookie_lesson_id))) then
      raise exception '4.Q6, 2.6: repeat of points to an earlier question in this lesson or in an earlier lesson of the flavor' using errcode = '23514';
    end if;
  end if;
  return new;
end $$;
create trigger question_row_check before insert or update on public.question
  for each row execute function private.question_row_check();

-- 8.3: Question Word only on Words questions, Question Idiom only on Idioms questions, terms from the lesson's flavor (7.W3, 7.I3)
create or replace function private.question_term_check() returns trigger
language plpgsql set search_path = '' as $$
declare v_lesson uuid; v_flavor uuid; v_recipe text;
begin
  select q.cookie_lesson_id, cl.cookie_dough_flavor_id into v_lesson, v_flavor
    from public.question q join public.cookie_lesson cl on cl.id = q.cookie_lesson_id where q.id = new.question_id;
  v_recipe := private.lesson_recipe(v_lesson);
  if tg_table_name = 'question_word' then
    if v_recipe <> 'Words' or (select cookie_dough_flavor_id from public.word where id = new.word_id) <> v_flavor then
      raise exception '8.3, 7.W3: Question Word rows are on Words questions and name a word of the lesson''s flavor' using errcode = '23514';
    end if;
  else
    if v_recipe <> 'Idioms' or (select cookie_dough_flavor_id from public.idiom where id = new.idiom_id) <> v_flavor then
      raise exception '8.3, 7.I3: Question Idiom rows are on Idioms questions and name an idiom of the lesson''s flavor' using errcode = '23514';
    end if;
  end if;
  return new;
end $$;
create trigger question_word_check  before insert or update on public.question_word  for each row execute function private.question_term_check();
create trigger question_idiom_check before insert or update on public.question_idiom for each row execute function private.question_term_check();

-- 3.10: a shipped question (approved, in a published flavor) cannot change its answer, options or verses in place
create or replace function private.shipped_answer_guard() returns trigger
language plpgsql set search_path = '' as $$
declare v_q uuid := coalesce((to_jsonb(new) ->> 'question_id'), (to_jsonb(old) ->> 'question_id'), (to_jsonb(old) ->> 'id'))::uuid;
begin
  if tg_table_name = 'question' then
    if (old.type, old.answer) is not distinct from (new.type, new.answer) or not private.is_shipped(old.id) then return new; end if;
  elsif tg_table_name = 'question_option' then
    if tg_op = 'UPDATE' and (old.text, old.is_correct, old.blank, old.order_question_sequence, old.side, old.pair)
       is not distinct from (new.text, new.is_correct, new.blank, new.order_question_sequence, new.side, new.pair) then return new; end if;
    if not private.is_shipped(v_q) then return coalesce(new, old); end if;
  else   -- question_verse
    if not private.is_shipped(v_q) then return coalesce(new, old); end if;
  end if;
  raise exception '3.10: a change to the answer, an option''s text, which option is correct, or the cited verses retires and replaces the question' using errcode = '23514';
end $$;
create trigger question_shipped_guard before update of type, answer on public.question
  for each row execute function private.shipped_answer_guard();
create trigger question_option_shipped_guard before insert or update or delete on public.question_option
  for each row execute function private.shipped_answer_guard();
create trigger question_verse_shipped_guard before insert or update or delete on public.question_verse
  for each row execute function private.shipped_answer_guard();

-- Lesson gate: run on the move to reviewed or approved (called from lesson_status_check).
-- Every check here is a hard yes/no the lesson's rows show.
create or replace function private.lesson_content_check(p_lesson_id uuid) returns void
language plpgsql stable set search_path = '' as $$
declare
  l public.cookie_lesson; v_recipe text; v_wi boolean; v_first boolean;
  n integer; m integer; r record; v_line text;
  v_prev boolean; v_run integer; v_pos integer; v_prev_pos integer; v_mcfill integer;
  v_new uuid[]; v_last record;
begin
  select * into l from public.cookie_lesson where id = p_lesson_id;
  v_recipe := private.lesson_recipe(p_lesson_id);
  v_wi := v_recipe in ('Words','Idioms');
  v_first := not exists (select 1 from public.cookie_lesson e where e.cookie_dough_flavor_id = l.cookie_dough_flavor_id
                           and e.retired_at is null and e."order" < l."order");

  -- 0.5, 6.7, 8.1: the lesson's own fields
  if nullif(btrim(l.goal), '') is null or nullif(btrim(l.intro), '') is null
     or nullif(btrim(l.meaning), '') is null or nullif(btrim(l.reference_text), '') is null then
    raise exception '0.5, 6.7, 8.1: goal, intro, meaning and reference text are filled' using errcode = '23514';
  end if;
  if not exists (select 1 from private.checklist_lines(l.rules_version)) then
    raise exception '8.1: rules version % is not a known version of the rules', l.rules_version using errcode = '23514';
  end if;

  -- 4.Q5: the lesson has planned verses
  if not exists (select 1 from public.lesson_passage where cookie_lesson_id = p_lesson_id and not parallel) then
    raise exception '4.Q5: a lesson needs at least one Lesson Passage row with parallel = false' using errcode = '23514';
  end if;

  -- Verses: 7.V1, 7.V3, 7.V5, 7.V6, 10.43
  if v_recipe = 'Verses' then
    if l.focus_verse_id is null or nullif(btrim(l.scene_intro), '') is null or nullif(btrim(l.verse_intro), '') is null then
      raise exception '7.V3, 7.V5, 7.V6: a Verses lesson has its focus verse id, scene intro and verse intro' using errcode = '23514';
    end if;
    if not private.in_lesson_rows(p_lesson_id, l.focus_verse_id) then
      raise exception '7.V3, 6.6: the focus verse lies inside the lesson''s range' using errcode = '23514';
    end if;
    if not exists (select 1 from public.memory_verse mv where mv.verse_id = l.focus_verse_id and mv.approved
                   and mv.cookie_dough_flavor_id = l.cookie_dough_flavor_id) then
      raise exception '7.V1: the focus verse is an approved Memory Verse of this flavor' using errcode = '23514';
    end if;
    if l.title is distinct from (select private.ref_book_name(b.name, 1) || ' ' || c.chapter_number || ':' || v.verse_number
                                   from public.verse v join public.book b on b.id = v.book_id join public.chapter c on c.id = v.chapter_id
                                  where v.id = l.focus_verse_id) then
      raise exception '7.V1, 2.12: a Verses lesson title is the verse''s reference' using errcode = '23514';
    end if;
  end if;

  -- Jesus Prophecies: 7.J2, 7.J6, 3.4, 7.J1
  if v_recipe = 'Jesus Prophecies' then
    if v_first then
      if exists (select 1 from public.lesson_passage where cookie_lesson_id = p_lesson_id and label <> 'Prophecy') then
        raise exception '7.J2: every lesson 1 row is labeled Prophecy' using errcode = '23514';
      end if;
      if l.title <> 'The Promise' then raise exception '7.J6: lesson 1 is titled The Promise' using errcode = '23514'; end if;
    else
      if not exists (select 1 from public.lesson_passage where cookie_lesson_id = p_lesson_id and label = 'Prophecy')
         or not exists (select 1 from public.lesson_passage where cookie_lesson_id = p_lesson_id and label = 'Fulfillment') then
        raise exception '7.J2: lesson 2 holds the fulfillment passage and the prophecy, labeled' using errcode = '23514';
      end if;
      if l.title <> 'The Fulfillment' then raise exception '7.J6: lesson 2 is titled The Fulfillment' using errcode = '23514'; end if;
    end if;
    if not exists (
      select 1 from public.jesus_prophecy_link k
       where k.approved
         and exists (select 1 from public.lesson_passage lp join public.verse f on f.id = lp.from_verse_id join public.verse t on t.id = lp.to_verse_id
                       join public.verse pv on pv.id = k.prophecy_verse_id
                      where lp.cookie_lesson_id = p_lesson_id and lp.label = 'Prophecy' and pv.sequence between f.sequence and t.sequence)
         and (v_first or exists (select 1 from public.lesson_passage lp join public.verse f on f.id = lp.from_verse_id join public.verse t on t.id = lp.to_verse_id
                       join public.verse fv on fv.id = k.fulfillment_verse_id
                      where lp.cookie_lesson_id = p_lesson_id and lp.label = 'Fulfillment' and fv.sequence between f.sequence and t.sequence))) then
      raise exception '7.J1, 3.4: the lesson''s rows hold an approved Jesus Prophecy Link' using errcode = '23514';
    end if;
  end if;

  -- 2.3, 2.6, 2.7, 8.3: 15 questions, reviews only where allowed, orders 1..n
  select count(*) filter (where not is_review), count(*) filter (where is_review) into n, m from private.live_questions(p_lesson_id);
  if n <> 15 then raise exception '2.3: a lesson has 15 questions before review questions, has %', n using errcode = '23514'; end if;
  if v_recipe in ('Words','Idioms','Verses','Wisdom') and not v_first then
    if m not between 2 and 3 then raise exception '2.6: every lesson after the first carries 2 or 3 review questions, has %', m using errcode = '23514'; end if;
  elsif m > 0 then
    raise exception '2.6, 2.7: no review questions in lesson 1 or outside Words, Idioms, Verses and Wisdom' using errcode = '23514';
  end if;
  if (select min(ord) <> 1 or max(ord) <> count(*) from private.live_questions(p_lesson_id)) then
    raise exception '8.3: question order runs 1 to n with no gaps' using errcode = '23514';
  end if;

  -- 2.6, 10.1, 7.V2: review questions
  for r in select * from private.live_questions(p_lesson_id) where is_review loop
    if r.ord = 1 then raise exception '2.6: a review question is never question 1' using errcode = '23514'; end if;
    if r.prompt = r.target_prompt then raise exception '10.1: a review prompt does not equal the prompt it repeats (question %)', r.qid using errcode = '23514'; end if;
    if v_recipe = 'Verses' and r.part <> 'plain' then raise exception '7.V2: a Verses review question is part plain' using errcode = '23514'; end if;
  end loop;
  if exists (select 1 from private.live_questions(p_lesson_id) where repeat_of is not null and not target_live) then
    raise exception '3.10: a repeat of points at a retired question' using errcode = '23514';
  end if;

  -- 4.Q6, 4.Q7, 4.Q8, 7.W11: in-lesson repeats
  if v_wi then
    if exists (select 1 from private.live_questions(p_lesson_id) where repeat_of is not null and not is_review) then
      raise exception '7.W11: Words and Idioms drills carry no repeat of; only review questions do' using errcode = '23514';
    end if;
  else
    select count(*) into n from private.live_questions(p_lesson_id) where repeat_of is not null and not is_review;
    if n not between 3 and 4 then raise exception '4.Q6: 3 or 4 in-lesson repeats, has %', n using errcode = '23514'; end if;
    if exists (select 1 from private.live_questions(p_lesson_id) where repeat_of is not null and not is_review and ord < target_order + 4) then
      raise exception '4.Q7: a repeat sits at least 4 after the question it repeats' using errcode = '23514';
    end if;
    if exists (select 1 from private.live_questions(p_lesson_id) where qtype in ('match','order','wordbank') and not is_review and repeat_of is null) then
      raise exception '4.Q6, 4.Q8: every non-review match, order and word bank is a tagged repeat' using errcode = '23514';
    end if;
  end if;

  -- 0.6: discovery never question 1, never adjacent; W/I clue by shape (7.W6, 7.W9)
  if exists (select 1 from private.live_questions(p_lesson_id) where clue = 'discovery' and ord = 1) then
    raise exception '0.6: question 1 is never discovery' using errcode = '23514';
  end if;
  if exists (select 1 from private.live_questions(p_lesson_id) a join private.live_questions(p_lesson_id) b on b.ord = a.ord + 1
              where a.clue = 'discovery' and b.clue = 'discovery') then
    raise exception '0.6: no two discovery questions are adjacent' using errcode = '23514';
  end if;
  if v_wi and exists (select 1 from private.live_questions(p_lesson_id) where not is_review
                       and clue <> case when shape = 'meaning' then 'setup' else 'earlier' end) then
    raise exception '7.W6, 7.W9: a Meaning drill is setup, every other drill earlier' using errcode = '23514';
  end if;

  -- 4.F7: at least three types; mc at most 60 percent of rows, rounded down
  select count(distinct qtype), count(*) filter (where qtype = 'mc'), count(*) into n, m, v_run from private.live_questions(p_lesson_id);
  if n < 3 then raise exception '4.F7: a lesson uses at least three types' using errcode = '23514'; end if;
  if m > floor(0.6 * v_run) then raise exception '4.F7: mc rows are at most 60 percent of the lesson (% of %)', m, v_run using errcode = '23514'; end if;

  -- 4.Q19: true and false within one; no three consecutive tf rows alike
  select count(*) filter (where answer), count(*) filter (where not answer) into n, m from private.live_questions(p_lesson_id) where qtype = 'tf';
  if abs(n - m) > 1 then raise exception '4.Q19: true and false answers are within one of each other' using errcode = '23514'; end if;
  v_prev := null; v_run := 0;
  for r in select answer from private.live_questions(p_lesson_id) where qtype = 'tf' order by ord loop
    v_run := case when r.answer = v_prev then v_run + 1 else 1 end; v_prev := r.answer;
    if v_run >= 3 then raise exception '4.Q19: three consecutive tf rows share an answer' using errcode = '23514'; end if;
  end loop;

  -- 4.A2: correct positions across mc and fill rows
  select count(*) into v_mcfill from private.live_questions(p_lesson_id) where qtype in ('mc','fill');
  if exists (select 1 from private.live_questions(p_lesson_id) lq join public.question_option o on o.question_id = lq.qid and o.is_correct
              where lq.qtype in ('mc','fill') group by o.position having count(*) > greatest(0.4 * v_mcfill, 1)) then
    raise exception '4.A2: one position holds the correct answer in more than 40 percent of mc and fill rows' using errcode = '23514';
  end if;
  v_prev_pos := null; v_run := 0;
  for r in select o.position from private.live_questions(p_lesson_id) lq join public.question_option o on o.question_id = lq.qid and o.is_correct
            where lq.qtype in ('mc','fill') order by lq.ord loop
    v_run := case when r.position = v_prev_pos then v_run + 1 else 1 end; v_prev_pos := r.position;
    if v_run >= 3 then raise exception '4.A2: the correct answer sits in the same position in three consecutive mc/fill rows' using errcode = '23514'; end if;
  end loop;

  -- 4.A10, 10.20: no two questions show the same set of options; the True/False pair on tf questions is exempt (every tf shows it by 4.F2)
  if exists (select 1 from (select lq.qid, array_agg(o.text order by o.text) s from private.live_questions(p_lesson_id) lq
                              join public.question_option o on o.question_id = lq.qid where lq.qtype <> 'tf' group by lq.qid) x
              group by s having count(*) > 1) then
    raise exception '4.A10: two questions in the lesson show the same set of options' using errcode = '23514';
  end if;

  -- parts: 7.V5–7.V8, 7.Wi2, 7.Wi7, 4.Q16
  if v_recipe = 'Verses' then
    if (select count(*) from private.live_questions(p_lesson_id) where part = 'scene' and not is_review) not between 2 and 4
       or (select count(*) from private.live_questions(p_lesson_id) where part = 'verse' and not is_review) not between 5 and 9
       or (select count(*) from private.live_questions(p_lesson_id) where part = 'plain' and not is_review) not between 3 and 4 then
      raise exception '7.V8: parts run 2 to 4 scene, 5 to 9 verse, 3 or 4 plain before reviews' using errcode = '23514';
    end if;
    if exists (select 1 from private.live_questions(p_lesson_id) a join private.live_questions(p_lesson_id) b on b.ord > a.ord
                where (a.part = 'verse' and b.part = 'scene') or (a.part = 'plain' and b.part in ('scene','verse'))) then
      raise exception '7.V5–7.V8: Part 1 (scene), then Part 2 (verse), then Part 3 (plain), reviews in Part 3' using errcode = '23514';
    end if;
    if exists (select 1 from private.live_questions(p_lesson_id) where not is_review and
                 ((part = 'plain' and (repeat_of is null or target_part <> 'verse')) or (part in ('scene','verse') and repeat_of is not null))) then
      raise exception '7.V8: every non-review Part 3 question repeats a Part 2 question; Parts 1 and 2 hold no repeats' using errcode = '23514';
    end if;
  elsif v_recipe = 'Wisdom' then
    if (select count(distinct part) from private.live_questions(p_lesson_id) where not is_review) <> 3 then
      raise exception '7.Wi2: a Wisdom lesson has say, mean and apply' using errcode = '23514';
    end if;
    if exists (select 1 from private.live_questions(p_lesson_id) a join private.live_questions(p_lesson_id) b on b.ord > a.ord
                where not a.is_review and not b.is_review
                  and ((a.part = 'mean' and b.part = 'say') or (a.part = 'apply' and b.part in ('say','mean')))) then
      raise exception '7.Wi7: the lesson runs Say, then Mean, then Apply' using errcode = '23514';
    end if;
  end if;
  if v_recipe in ('Verses','Wisdom') and (select count(distinct qtype) from private.live_questions(p_lesson_id)
        where part = case v_recipe when 'Verses' then 'plain' else 'apply' end and qtype in ('mc','fill','match')) <> 3 then
    raise exception '4.Q16: Verses Part 3 and Wisdom Apply use mc (pick the sentence), fill and match at least once each' using errcode = '23514';
  end if;

  -- 1.4, 4.Q5, 8.5, 10.29: Question Verse rows exist and lie inside the right lesson's non-parallel rows
  if exists (select 1 from private.live_questions(p_lesson_id) lq where not exists (select 1 from public.question_verse qv where qv.question_id = lq.qid)) then
    raise exception '8.5: every question has at least one Question Verse row' using errcode = '23514';
  end if;
  if exists (select 1 from private.live_questions(p_lesson_id) lq join public.question_verse qv on qv.question_id = lq.qid
              where not private.in_lesson_rows(case when lq.is_review then lq.target_lesson else p_lesson_id end, qv.verse_id)) then
    raise exception '4.Q5: a Question Verse row lies outside the lesson''s rows (or the repeated lesson''s, for a review)' using errcode = '23514';
  end if;

  -- Words and Idioms: 7.W4, 7.W7–7.W9, 7.I4, 7.I7, 7.I8, 1.4
  if v_wi then
    -- each question's term rows: four on the match, one per blank on a word bank, one otherwise (7.W7)
    if exists (select 1 from private.live_questions(p_lesson_id) lq
                where (select count(*) from private.lesson_terms(p_lesson_id) t where t.qid = lq.qid)
                   <> case lq.shape when 'match' then 4
                                    when 'wordbank' then (select count(distinct blank) from public.question_option o where o.question_id = lq.qid and o.blank is not null)
                                    else 1 end) then
      raise exception '7.W7: one term row per question, one per blank on a word bank, four on the match' using errcode = '23514';
    end if;
    -- terms are approved before use (3.11)
    if v_recipe = 'Words' and exists (select 1 from private.lesson_terms(p_lesson_id) t join public.word w on w.id = t.term_id where not w.approved)
       or v_recipe = 'Idioms' and exists (select 1 from private.lesson_terms(p_lesson_id) t join public.idiom i on i.id = t.term_id where not i.approved) then
      raise exception '3.11: every term a lesson uses is approved' using errcode = '23514';
    end if;
    -- the lesson's new terms are the four with a non-review Meaning drill, one drill each
    select array_agg(distinct t.term_id) into v_new from private.live_questions(p_lesson_id) lq join private.lesson_terms(p_lesson_id) t on t.qid = lq.qid
     where lq.shape = 'meaning' and not lq.is_review;
    if coalesce(array_length(v_new, 1), 0) <> 4
       or (select count(*) from private.live_questions(p_lesson_id) where shape = 'meaning' and not is_review) <> 4 then
      raise exception '7.W3, 7.W6: four new terms, each with exactly one Meaning drill' using errcode = '23514';
    end if;
    if exists (select 1 from public.cookie_lesson e join public.question q on q.cookie_lesson_id = e.id
                 join public.question_word qw on qw.question_id = q.id
                where e.cookie_dough_flavor_id = l.cookie_dough_flavor_id and e.id <> p_lesson_id and e.retired_at is null
                  and q.retired_at is null and q.shape = 'meaning' and q.repeat_of is null and qw.word_id = any (v_new))
       or exists (select 1 from public.cookie_lesson e join public.question q on q.cookie_lesson_id = e.id
                 join public.question_idiom qi on qi.question_id = q.id
                where e.cookie_dough_flavor_id = l.cookie_dough_flavor_id and e.id <> p_lesson_id and e.retired_at is null
                  and q.retired_at is null and q.shape = 'meaning' and q.repeat_of is null and qi.idiom_id = any (v_new)) then
      raise exception '3.1, 3.2: a term is new in one lesson of its flavor only' using errcode = '23514';
    end if;
    if exists (select 1 from private.live_questions(p_lesson_id) lq join private.lesson_terms(p_lesson_id) t on t.qid = lq.qid
                where lq.is_review and t.term_id = any (v_new)) then
      raise exception '7.W3: review questions test earlier lessons'' terms' using errcode = '23514';
    end if;
    -- question 1 is a Meaning drill; each new term's Meaning drill is its first question (7.W8, 7.W9, 7.W11)
    if (select shape from private.live_questions(p_lesson_id) where ord = 1) <> 'meaning' then
      raise exception '7.W11: every lesson opens with a Meaning drill' using errcode = '23514';
    end if;
    if exists (select 1 from unnest(v_new) w
                where (select lq.shape from private.live_questions(p_lesson_id) lq join private.lesson_terms(p_lesson_id) t on t.qid = lq.qid
                        where t.term_id = w order by lq.ord limit 1) <> 'meaning') then
      raise exception '7.W9: no new term is tested before its Meaning drill' using errcode = '23514';
    end if;
    -- each new term tested 3 to 5 times, in at least three shapes, never twice in one shape (7.W9)
    if exists (select 1 from unnest(v_new) w
                where (select count(*) from private.lesson_terms(p_lesson_id) t where t.term_id = w) not between 3 and 5
                   or (select count(distinct lq.shape) from private.live_questions(p_lesson_id) lq join private.lesson_terms(p_lesson_id) t on t.qid = lq.qid where t.term_id = w) < 3
                   or (select count(distinct lq.shape) from private.live_questions(p_lesson_id) lq join private.lesson_terms(p_lesson_id) t on t.qid = lq.qid where t.term_id = w)
                      <> (select count(*) from private.lesson_terms(p_lesson_id) t where t.term_id = w)) then
      raise exception '7.W9: each new term is tested 3 to 5 times, in at least three shapes, never twice in one shape' using errcode = '23514';
    end if;
    if (select count(distinct shape) from private.live_questions(p_lesson_id)) < 6 then
      raise exception '7.W9: at least six shapes appear in the lesson' using errcode = '23514';
    end if;
    -- the last question is the all-four match, not a review (7.W8, 7.I8)
    select * into v_last from private.live_questions(p_lesson_id) order by ord desc limit 1;
    if v_last.shape <> 'match' or v_last.is_review
       or (select array_agg(t.term_id order by t.term_id) from private.lesson_terms(p_lesson_id) t where t.qid = v_last.qid)
          <> (select array_agg(x order by x) from unnest(v_new) x) then
      raise exception '7.W8, 7.I8: the highest-order question is the match on the lesson''s four new terms' using errcode = '23514';
    end if;
    -- multi-term questions besides the last: Words at most one, a word bank; Idioms none (7.W9, 7.I8)
    select count(*) into n from private.live_questions(p_lesson_id) lq
     where lq.qid <> v_last.qid and (select count(*) from private.lesson_terms(p_lesson_id) t where t.qid = lq.qid) > 1;
    if (v_recipe = 'Idioms' and n > 0) or (v_recipe = 'Words' and (n > 1 or exists (
          select 1 from private.live_questions(p_lesson_id) lq where lq.qid <> v_last.qid and lq.shape <> 'wordbank'
             and (select count(*) from private.lesson_terms(p_lesson_id) t where t.qid = lq.qid) > 1))) then
      raise exception '7.W9, 7.I8: at most one multi-term question besides the last (Words: a word bank; Idioms: none)' using errcode = '23514';
    end if;
    -- 7.W13, 7.I12: an approved meaning of the flavor appears word for word in an option only in a Meaning drill or the
    -- closing match, in a prompt or statement only in a reverse prompt; and in at most two option sets besides the match
    for r in select lq.ord, lq.shape, lq.qid, lq.prompt, mm.meaning
               from private.live_questions(p_lesson_id) lq
               cross join (select w.meaning from public.word w where v_recipe = 'Words' and w.cookie_dough_flavor_id = l.cookie_dough_flavor_id and w.approved
                           union all
                           select i.meaning from public.idiom i where v_recipe = 'Idioms' and i.cookie_dough_flavor_id = l.cookie_dough_flavor_id and i.approved) mm
              where (lq.shape is distinct from 'meaning' and lq.qid <> v_last.qid
                     and exists (select 1 from public.question_option o where o.question_id = lq.qid and private.w13_carries(o.text, mm.meaning)))
                 or (lq.shape is distinct from 'reverse' and private.w13_carries(lq.prompt, mm.meaning)) loop
      raise exception '%: question % pastes the approved meaning "%" word for word; only a Meaning drill, the reverse prompt and the closing match may',
        case v_recipe when 'Words' then '7.W13' else '7.I12, 7.W13' end, r.ord, r.meaning using errcode = '23514';
    end loop;
    for r in select mm.meaning, count(distinct lq.qid) c
               from private.live_questions(p_lesson_id) lq
               join public.question_option o on o.question_id = lq.qid
               cross join (select w.meaning from public.word w where v_recipe = 'Words' and w.cookie_dough_flavor_id = l.cookie_dough_flavor_id and w.approved
                           union all
                           select i.meaning from public.idiom i where v_recipe = 'Idioms' and i.cookie_dough_flavor_id = l.cookie_dough_flavor_id and i.approved) mm
              where lq.qid <> v_last.qid and private.w13_carries(o.text, mm.meaning)
              group by mm.meaning having count(distinct lq.qid) > 2 loop
      raise exception '%: the approved meaning "%" is an option in % questions besides the closing match; at most 2',
        case v_recipe when 'Words' then '7.W13' else '7.I12, 7.W13' end, r.meaning, r.c using errcode = '23514';
    end loop;
    -- Lesson Passage rows are the new terms' verses, one row per distinct verse, single verses (7.W4, 7.I4)
    if exists (select 1 from public.lesson_passage where cookie_lesson_id = p_lesson_id and from_verse_id <> to_verse_id) then
      raise exception '7.W4, 7.I4: Words and Idioms rows are single verses' using errcode = '23514';
    end if;
    if v_recipe = 'Words' then
      if (select array_agg(distinct from_verse_id order by from_verse_id) from public.lesson_passage where cookie_lesson_id = p_lesson_id)
         <> (select array_agg(distinct anchor_verse_id order by anchor_verse_id) from public.word where id = any (v_new)) then
        raise exception '7.W4: the Lesson Passage rows are the four new words'' anchor verses' using errcode = '23514';
      end if;
      -- 1.4: a Words question cites the anchor verses of the words it tests, and nothing else
      if exists (select 1 from private.live_questions(p_lesson_id) lq
                  where (select array_agg(distinct verse_id order by verse_id) from public.question_verse where question_id = lq.qid)
                     <> (select array_agg(distinct anchor_verse_id order by anchor_verse_id) from private.lesson_terms(p_lesson_id) t where t.qid = lq.qid)) then
        raise exception '1.4: a Words question''s Question Verse rows are the anchor verses of the words it tests' using errcode = '23514';
      end if;
    else
      if (select array_agg(distinct from_verse_id order by from_verse_id) from public.lesson_passage where cookie_lesson_id = p_lesson_id)
         <> (select array_agg(distinct verse_id order by verse_id) from public.idiom_verse where kept and idiom_id = any (v_new)) then
        raise exception '7.I4: the Lesson Passage rows are the kept verses of the four new idioms' using errcode = '23514';
      end if;
      -- 1.4, 7.I4: every cited verse is a kept verse of an idiom the question tests, and each tested idiom has one
      if exists (select 1 from private.live_questions(p_lesson_id) lq join public.question_verse qv on qv.question_id = lq.qid
                  where not exists (select 1 from private.lesson_terms(p_lesson_id) t join public.idiom_verse iv on iv.idiom_id = t.term_id and iv.kept
                                     where t.qid = lq.qid and iv.verse_id = qv.verse_id))
         or exists (select 1 from private.lesson_terms(p_lesson_id) t
                     where not exists (select 1 from public.question_verse qv join public.idiom_verse iv on iv.verse_id = qv.verse_id and iv.kept
                                        where qv.question_id = t.qid and iv.idiom_id = t.term_id)) then
        raise exception '1.4, 7.I4: an Idioms question cites kept Idiom Verses of the idioms it tests, at least one each' using errcode = '23514';
      end if;
    end if;
  end if;

  -- 3.5, 3.6, 3.8, 8.6: Lesson Check rows, one per line, writer and checker, latest standing
  if exists (select 1 from public.lesson_check where cookie_lesson_id = p_lesson_id
              and "check" not in (select private.checklist_lines(l.rules_version))) then
    raise exception '8.6: a Lesson Check row names a line that rules version % does not have', l.rules_version using errcode = '23514';
  end if;
  for v_line in select private.checklist_lines(l.rules_version) loop
    select pass, note, checked_by into r from public.lesson_check
     where cookie_lesson_id = p_lesson_id and "check" = v_line and checked_by = 'writer' order by checked_at desc limit 1;
    if not found or not r.pass then
      raise exception '3.5: the writer''s row for % is missing or failing', v_line using errcode = '23514';
    end if;
    if private.checklist_line_applies(v_line, v_recipe) = false and r.note is distinct from 'not applicable' then
      raise exception '8.6: line % does not apply to %; its row says not applicable', v_line, v_recipe using errcode = '23514';
    end if;
    select pass, note, checked_by into r from public.lesson_check
     where cookie_lesson_id = p_lesson_id and "check" = v_line and checked_by in ('checker','owner') order by checked_at desc limit 1;
    if not found or not r.pass then
      raise exception '3.6, 3.8: the checker''s row for % is missing or failing', v_line using errcode = '23514';
    end if;
    if r.checked_by = 'checker' and private.checklist_line_applies(v_line, v_recipe) = false and r.note is distinct from 'not applicable' then
      raise exception '8.6: line % does not apply to %; its row says not applicable', v_line, v_recipe using errcode = '23514';
    end if;
  end loop;
end $$;

-- Flavor gate: run on the move to reviewed, approved, published (called from flavor_publish_check)
create or replace function private.flavor_content_check(p_flavor_id uuid) returns void
language plpgsql stable set search_path = '' as $$
declare v_recipe text := private.flavor_recipe(p_flavor_id); n integer; v_terms integer;
begin
  select count(*) into n from public.cookie_lesson where cookie_dough_flavor_id = p_flavor_id and retired_at is null;
  if not private.flavor_lesson_count_ok(p_flavor_id, n) then
    raise exception '2.4: this flavor cannot hold % lessons', n using errcode = '23514';
  end if;
  -- 4.Q11 (not W/I): no two lessons share a type sequence over their first 15 rows; neighbours differ in opening and closing type
  if v_recipe not in ('Words','Idioms') then
    if exists (select 1 from (select cl.id, (select array_agg(lq.qtype order by lq.ord) from private.live_questions(cl.id) lq where lq.ord <= 15) s
                                from public.cookie_lesson cl where cl.cookie_dough_flavor_id = p_flavor_id and cl.retired_at is null) x
                group by s having count(*) > 1) then
      raise exception '4.Q11: two lessons of the flavor share a type sequence over their first 15 rows' using errcode = '23514';
    end if;
    if exists (select 1 from (select cl."order",
                  lag(cl.id) over (order by cl."order") prev_id, cl.id
                  from public.cookie_lesson cl where cl.cookie_dough_flavor_id = p_flavor_id and cl.retired_at is null) x
                where x.prev_id is not null and (
                  (select qtype from private.live_questions(x.id) order by ord limit 1) = (select qtype from private.live_questions(x.prev_id) order by ord limit 1)
               or (select qtype from private.live_questions(x.id) order by ord desc limit 1) = (select qtype from private.live_questions(x.prev_id) order by ord desc limit 1))) then
      raise exception '4.Q11: back-to-back lessons open or close with the same type' using errcode = '23514';
    end if;
  else
    -- 7.W11, 7.I10: the sequence of shapes differs between lessons
    if exists (select 1 from (select cl.id, (select array_agg(lq.shape order by lq.ord) from private.live_questions(cl.id) lq) s
                                from public.cookie_lesson cl where cl.cookie_dough_flavor_id = p_flavor_id and cl.retired_at is null) x
                group by s having count(*) > 1) then
      raise exception '7.W11: two lessons of the flavor share a sequence of shapes' using errcode = '23514';
    end if;
  end if;
  -- 3.1, 7.W2: a Words flavor holds four approved words per lesson, each form used by at least four
  if v_recipe = 'Words' then
    select count(*) into v_terms from public.word where cookie_dough_flavor_id = p_flavor_id and approved;
    if v_terms <> 4 * n then raise exception '3.1: a Words flavor holds four approved words per lesson (% words, % lessons)', v_terms, n using errcode = '23514'; end if;
    if exists (select 1 from public.word where cookie_dough_flavor_id = p_flavor_id and approved group by form having count(*) < 4) then
      raise exception '3.1: a flavor holds at least four words of each form it uses' using errcode = '23514';
    end if;
  elsif v_recipe = 'Idioms' then
    select count(*) into v_terms from public.idiom where cookie_dough_flavor_id = p_flavor_id and approved;
    if v_terms <> 8 then raise exception '3.2, 7.I2: an Idioms flavor holds 8 approved idioms (has %)', v_terms using errcode = '23514'; end if;
    if exists (select 1 from public.idiom where cookie_dough_flavor_id = p_flavor_id and approved group by form having count(*) < 4) then
      raise exception '3.2: a flavor holds at least four idioms of each form it uses' using errcode = '23514';
    end if;
  end if;
end $$;

-- 1.8: a heading belongs to a chapter of Psalms
create or replace function private.psalm_heading_check() returns trigger
language plpgsql set search_path = '' as $$
begin
  if not exists (select 1 from public.chapter c join public.book b on b.id = c.book_id
                  where c.id = new.chapter_id and b.name = 'Psalms') then
    raise exception '1.8: a psalm heading belongs to a chapter of Psalms' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger psalm_heading_check before insert or update on public.psalm_heading
  for each row execute function private.psalm_heading_check();                                                   -- 1.8

-- ---------------------------------------------------------------------------
-- 15. Views (A2, section 3). Three security_invoker, two security definer.
-- ---------------------------------------------------------------------------
create or replace view public.chip_balance with (security_invoker = true) as
  select p.id as profile_id,
         coalesce((select sum(l.amount) from public.chip_ledger l where l.profile_id = p.id), 0)::integer as balance
  from public.profile p
  where p.id = (select auth.uid());

create or replace view public.daily_bakes with (security_invoker = true) as
  select p.id as profile_id,
         private.chicago_today() as bake_day,
         (select count(*)::integer from public.resume_eligible r
           where r.profile_id = p.id and r.source = 'daily' and r.bake_day = private.chicago_today()) as bakes_used,
         case when private.is_plus(p.id) then null
              else greatest(private.setting_int('daily_bakes_free')
                   - (select count(*)::integer from public.resume_eligible r
                       where r.profile_id = p.id and r.source = 'daily' and r.bake_day = private.chicago_today()), 0) end as bakes_left,
         (select count(*)::integer from public.bake_grant g
           where g.profile_id = p.id and g.used_by_resume_eligible_id is null and (g.expires_at is null or g.expires_at > now())) as bonus_bakes_left
  from public.profile p
  where p.id = (select auth.uid());

create or replace view public.entitlement with (security_invoker = true) as
  select p.id as profile_id, private.entitlement(p.id) as plan_kind
  from public.profile p
  where p.id = (select auth.uid());

-- private.question_for_play: the Question row without anything that grades it (v3: options as rows, by id);
-- 7.V5, 7.V6: part labels the player's section
create or replace function private.question_for_play(q public.question) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'id', q.id, 'order', q."order", 'type', q.type, 'part', q.part, 'story', q.story, 'prompt', q.prompt, 'clue', q.clue,
    'options', (select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object('id', o.id, 'text', o.text, 'position', o.position,
                   'side', case when q.type = 'match' then o.side end)) order by o.side nulls first, o.position), '[]'::jsonb)
                from public.question_option o where o.question_id = q.id),
    'blank_count', case when q.type = 'wordbank' then (select count(distinct blank) from public.question_option o where o.question_id = q.id and blank is not null) end)
$$;

-- Grade an answer by option id (v3; 8.4: "The app grades by id"; no type is exempt from needing options).
-- Shapes: mc/fill/tf "<option id>"; wordbank {"1":"<id>","2":"<id>"};
-- order ["<id>", ...] in the player's order; match [["<left id>","<right id>"], ...].
create or replace function private.grade(q public.question, p_answer jsonb) returns boolean
language plpgsql stable set search_path = '' as $$
declare ok boolean;
begin
  if not exists (select 1 from public.question_option o where o.question_id = q.id) then
    return false;
  end if;
  case q.type
    when 'mc', 'fill', 'tf' then
      ok := exists (select 1 from public.question_option o where o.question_id = q.id and o.is_correct and o.id = private.safe_uuid(p_answer #>> '{}'));
    when 'wordbank' then
      ok := jsonb_typeof(p_answer) = 'object'
        and not exists (select 1 from public.question_option o where o.question_id = q.id and o.blank is not null
                        and private.safe_uuid(p_answer ->> o.blank::text) is distinct from o.id)
        and (select count(*) from jsonb_object_keys(p_answer)) = (select count(*) from public.question_option o where o.question_id = q.id and o.blank is not null);
    when 'order' then
      ok := jsonb_typeof(p_answer) = 'array'
        and (select coalesce(jsonb_agg(o.id::text order by o.order_question_sequence), '[]'::jsonb) from public.question_option o where o.question_id = q.id) = p_answer;
    when 'match' then
      ok := jsonb_typeof(p_answer) = 'array'
        and (select count(*) from jsonb_array_elements(p_answer)) = (select count(*) from public.question_option o where o.question_id = q.id and o.side = 'left')
        and not exists (
          select 1 from jsonb_array_elements(p_answer) e
          left join public.question_option l on l.id = private.safe_uuid(e ->> 0) and l.question_id = q.id and l.side = 'left'
          left join public.question_option r on r.id = private.safe_uuid(e ->> 1) and r.question_id = q.id and r.side = 'right'
          where l.id is null or r.id is null or l.pair <> r.pair)
        and (select count(distinct e ->> 0) from jsonb_array_elements(p_answer) e) = (select count(*) from jsonb_array_elements(p_answer));
    else ok := false;
  end case;
  return coalesce(ok, false);
end $$;

-- 0.2(2), 6.2, 8.4: the answer key, built only for a response after grading.
--   mc/fill/tf: correct_option_id; wordbank: blanks {"1": id, ...}; order: sequence [ids, true order];
--   match: pairs [[left id, right id], ...]; every type: explanations {option id: explanation} and why.
create or replace function private.answer_key(q public.question) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
           'why', q.why,
           'explanations', (select coalesce(jsonb_object_agg(o.id::text, o.explanation), '{}'::jsonb)
                              from public.question_option o where o.question_id = q.id))
      || case when q.type in ('mc','fill','tf') then jsonb_build_object('correct_option_id',
              (select o.id from public.question_option o where o.question_id = q.id and o.is_correct))
              when q.type = 'wordbank' then jsonb_build_object('blanks',
              (select coalesce(jsonb_object_agg(o.blank::text, o.id), '{}'::jsonb) from public.question_option o
                where o.question_id = q.id and o.blank is not null))
              when q.type = 'order' then jsonb_build_object('sequence',
              (select coalesce(jsonb_agg(o.id order by o.order_question_sequence), '[]'::jsonb) from public.question_option o
                where o.question_id = q.id))
              when q.type = 'match' then jsonb_build_object('pairs',
              (select coalesce(jsonb_agg(jsonb_build_array(l.id, r.id) order by l.position), '[]'::jsonb)
                 from public.question_option l join public.question_option r
                   on r.question_id = l.question_id and r.side = 'right' and r.pair = l.pair
                where l.question_id = q.id and l.side = 'left'))
              else '{}'::jsonb end
$$;

-- ---------------------------------------------------------------------------
-- 16. Internal functions (schema private; never callable by the API roles)
-- ---------------------------------------------------------------------------

-- The signed-in caller, or an error; refuses once account deletion is pending (review F12)
create or replace function private.caller() returns uuid
language plpgsql stable security definer set search_path = '' as $$
declare v uuid := (select auth.uid());
begin
  if v is null then raise exception 'sign in' using errcode = '42501'; end if;
  if private.deletion_pending(v) then raise exception 'account deletion is in progress' using errcode = '42501'; end if;
  return v;
end $$;

-- R5: lock the Profile row, sum, refuse below zero, insert
create or replace function private.spend_chips(p_profile_id uuid, p_amount integer, p_reason text, p_purchase_id uuid default null)
returns public.chip_ledger
language plpgsql security definer set search_path = '' as $$
declare v_balance integer; r public.chip_ledger;
begin
  if p_amount <= 0 then raise exception 'spend must be positive' using errcode = '22023'; end if;
  perform 1 from public.profile where id = p_profile_id for update;
  select coalesce(sum(amount), 0) into v_balance from public.chip_ledger where profile_id = p_profile_id;
  if v_balance < p_amount then
    raise exception 'not enough chips (% needed, % held)', p_amount, v_balance using errcode = 'P0001';
  end if;
  insert into public.chip_ledger (profile_id, amount, reason, purchase_id)
  values (p_profile_id, -p_amount, p_reason, p_purchase_id) returning * into r;
  return r;
end $$;

create or replace function private.earn_chips(p_profile_id uuid, p_amount integer, p_reason text,
                                              p_completion_id uuid default null, p_purchase_id uuid default null)
returns public.chip_ledger
language plpgsql security definer set search_path = '' as $$
declare r public.chip_ledger;
begin
  if p_amount <= 0 then raise exception 'earn must be positive' using errcode = '22023'; end if;
  perform 1 from public.profile where id = p_profile_id for update;
  insert into public.chip_ledger (profile_id, amount, reason, cookie_completion_id, purchase_id)
  values (p_profile_id, p_amount, p_reason, p_completion_id, p_purchase_id) returning * into r;
  return r;
end $$;

-- Badge rules (G6): evaluated after each completion, box or game; inserted once
create or replace function private.award_badges(p_profile_id uuid) returns integer
language plpgsql security definer set search_path = '' as $$
declare b record; v_value integer; n integer := 0;
begin
  for b in select * from public.badge where enabled loop
    v_value := case b.rule_type
      when 'streak days'     then (select coalesce(best_streak, 0) from public.day_streak where profile_id = p_profile_id)
      when 'cookies done'    then (select count(*) from public.cookie_completion where profile_id = p_profile_id and not is_replay)
      when 'verses revealed' then (select count(*) from public.revealed_verse where profile_id = p_profile_id)
      when 'boxes made'      then (select count(*) from public.keepsake_box where profile_id = p_profile_id and not is_gift)
      when 'games won'       then (select coalesce(sum(wins), 0) from public.game_best where profile_id = p_profile_id)
    end;
    if v_value >= b.rule_value then
      insert into public.earned_badge (profile_id, badge_id) values (p_profile_id, b.id)
      on conflict do nothing;
      if found then n := n + 1; end if;
    end if;
  end loop;
  return n;
end $$;

-- Charge a bake (owner ruling G7, A8): plus → daily → grant → chips
create or replace function private.charge_bake(p_row public.resume_eligible) returns public.resume_eligible
language plpgsql security definer set search_path = '' as $$
declare
  v_source text; v_grant uuid; v_price integer; r public.resume_eligible;
begin
  perform 1 from public.profile where id = p_row.profile_id for update;
  select * into p_row from public.resume_eligible where id = p_row.id for update;   -- review F2: re-read under the lock
  if p_row.spent_at is not null then return p_row; end if;
  if private.is_plus(p_row.profile_id) then
    v_source := 'plus';
  elsif exists (select 1 from public.bake_grant where profile_id = p_row.profile_id and kind = 'day pass'
                and expires_at > now()) then
    v_source := 'day pass';   -- a day pass is a day of bakes (review F21, recommended reading); the grant is not consumed
  elsif (select count(*) from public.resume_eligible
          where profile_id = p_row.profile_id and source = 'daily' and bake_day = private.chicago_today())
        < private.setting_int('daily_bakes_free') then
    v_source := 'daily';
  else
    select id, kind into v_grant, v_source from public.bake_grant
     where profile_id = p_row.profile_id and used_by_resume_eligible_id is null and kind <> 'day pass'
       and (expires_at is null or expires_at > now())
     order by expires_at nulls last, granted_at limit 1;
    if v_grant is null then
      select price_in_chips into v_price from public.price where item = 'bake' and amount = 1 and enabled;
      if v_price is null then raise exception 'no bake price set' using errcode = 'P0001'; end if;
      perform private.spend_chips(p_row.profile_id, v_price, 'bake');
      v_source := 'chips';
    end if;
  end if;
  update public.resume_eligible
     set source = v_source, spent_at = now(), bake_day = private.chicago_today()
   where id = p_row.id returning * into r;
  if v_grant is not null then
    update public.bake_grant set used_by_resume_eligible_id = r.id where id = v_grant;
  end if;
  return r;
end $$;

-- Rate limit on lesson opens (B6): refuse past the ceiling, flag, ban on the second flag in the window
-- Rate limit on lesson opens (B6). Counts the append-only lesson_open_log. Returns null when allowed, or an error
-- object; it must not raise, or the flag row would roll back. One flag per window; a second flagged window within
-- rate_flag_window_days writes 'ban requested', which the secret-key job applies through auth.admin.updateUserById.
create or replace function private.check_open_rate(p_profile_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_hour integer; v_day integer; v_kind text; v_count integer; v_window timestamptz; v_prior integer; v_action text;
begin
  select count(*) into v_hour from public.lesson_open_log
   where profile_id = p_profile_id and opened_at >= date_trunc('hour', now());   -- the clock hour the flag is keyed by (pass 2, B4)
  select count(*) into v_day from public.lesson_open_log
   where profile_id = p_profile_id and bake_day = private.chicago_today();
  if v_hour >= private.setting_int('lesson_opens_per_hour') then
    v_kind := 'hour'; v_count := v_hour; v_window := date_trunc('hour', now());
  elsif v_day >= private.setting_int('lesson_opens_per_day') then
    v_kind := 'day'; v_count := v_day; v_window := private.chicago_today()::timestamptz;
  else
    return null;
  end if;
  select count(*) into v_prior from public.rate_flag
   where profile_id = p_profile_id and (window_kind, window_start) <> (v_kind, v_window)
     and flagged_at > now() - make_interval(days => private.setting_int('rate_flag_window_days'));
  v_action := case when v_prior >= 1 then 'ban requested' else 'refused' end;
  insert into public.rate_flag (profile_id, window_start, window_kind, opens_counted, action_taken)
  values (p_profile_id, v_window, v_kind, v_count, v_action)
  on conflict (profile_id, window_kind, window_start) do nothing;
  return jsonb_build_object('error', 'rate limited', 'window', v_kind, 'ban_requested', v_prior >= 1);
end $$;

-- ---------------------------------------------------------------------------
-- 17. Player-callable functions (public; security definer; caller = auth.uid())
-- ---------------------------------------------------------------------------

-- Open a flavor (R25, B5): free players in order; Plus any order
create or replace function public.open_flavor(p_flavor_id uuid) returns public.dough_progress
language plpgsql security definer set search_path = '' as $$
declare
  v_caller uuid := private.caller(); f record; prev record; r public.dough_progress;
begin
  select * into f from public.cookie_dough_flavor where id = p_flavor_id and status = 'published' and retired_at is null;
  if not found then raise exception 'flavor not available' using errcode = 'P0001'; end if;
  if not private.is_plus(v_caller) then
    select * into prev from public.cookie_dough_flavor
     where recipe_id = f.recipe_id and "order" < f."order" and status = 'published' and retired_at is null
     order by "order" desc limit 1;
    if found and not exists (select 1 from public.dough_progress
                              where profile_id = v_caller and cookie_dough_flavor_id = prev.id and status = 'done') then
      raise exception 'finish the previous flavor first' using errcode = 'P0001';
    end if;
  end if;
  insert into public.dough_progress (profile_id, cookie_dough_flavor_id)
  values (v_caller, p_flavor_id)
  on conflict (profile_id, cookie_dough_flavor_id) do update set started_at = public.dough_progress.started_at
  returning * into r;
  return r;
end $$;

-- Open a cookie lesson (B4): one lesson's content, one at a time, under the rate limit
create or replace function public.open_cookie_lesson(p_lesson_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_caller uuid := private.caller(); v_cl record; r public.resume_eligible; v_limit jsonb;
begin
  perform 1 from public.profile where id = v_caller for update;   -- review F16: the cap and the rate check cannot race
  select cl.*, f.status as flavor_status into v_cl
    from public.cookie_lesson cl join public.cookie_dough_flavor f on f.id = cl.cookie_dough_flavor_id
   where cl.id = p_lesson_id;
  if not found or v_cl.flavor_status <> 'published' or v_cl.retired_at is not null or v_cl.status <> 'approved' then
    raise exception 'lesson not available' using errcode = 'P0001';
  end if;
  select * into r from public.resume_eligible
   where profile_id = v_caller and cookie_lesson_id = p_lesson_id and finished_at is null;
  if not found then
    v_limit := private.check_open_rate(v_caller);
    if v_limit is not null then return v_limit; end if;   -- the flag row stays written
    insert into public.resume_eligible (profile_id, cookie_lesson_id) values (v_caller, p_lesson_id) returning * into r;
    insert into public.lesson_open_log (profile_id, cookie_lesson_id, bake_day) values (v_caller, p_lesson_id, private.chicago_today());
  end if;
  return jsonb_build_object(
    'resume_eligible', to_jsonb(r),
    'lesson', jsonb_build_object('id', v_cl.id, 'order', v_cl."order", 'title', v_cl.title, 'intro', v_cl.intro,
                                 'meaning', v_cl.meaning, 'reference_text', v_cl.reference_text,
                                 'scene_intro', v_cl.scene_intro, 'verse_intro', v_cl.verse_intro,
                                 'focus_verse_id', v_cl.focus_verse_id,                                  -- 6.6, 7.V3
                                 'edited_at', v_cl.edited_at),
    'passages', (select coalesce(jsonb_agg(jsonb_build_object('id', lp.id, 'label', lp.label, 'parallel', lp.parallel,   -- 6.6
                   'verses', (select jsonb_agg(jsonb_build_object('id', v.id, 'osis_ref', v.osis_ref, 'text', v.text) order by v.sequence)
                              from public.verse v, public.verse tv
                              where tv.id = lp.to_verse_id and v.sequence between fv.sequence and tv.sequence))
                   order by lp.parallel, fv.sequence), '[]'::jsonb)                                     -- 6.6: parallel rows last; base rows in canonical order by first verse
                 from public.lesson_passage lp join public.verse fv on fv.id = lp.from_verse_id
                 where lp.cookie_lesson_id = v_cl.id),
    'questions', (select coalesce(jsonb_agg(private.question_for_play(q) order by q."order"), '[]'::jsonb)
                  from public.question q where q.cookie_lesson_id = v_cl.id and q.retired_at is null and q.status = 'approved'),
    'answers', (select coalesce(jsonb_agg(jsonb_build_object('question_id', la.question_id, 'answer', la.answer, 'is_correct', la.is_correct)), '[]'::jsonb)
                from public.lesson_answer la where la.resume_eligible_id = r.id));
end $$;

-- Answer a question (A7): checks server-side; the first answer charges the bake.
-- 0.2(2): grades first, then returns the full answer key (private.answer_key); nothing of it before answering
create or replace function public.answer_question(p_resume_eligible_id uuid, p_question_id uuid, p_answer jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_caller uuid := private.caller(); r public.resume_eligible; q public.question; v_ok boolean;
begin
  perform 1 from public.profile where id = v_caller for update;   -- lock order: profile, then attempt (pass 2, B7)
  select * into r from public.resume_eligible where id = p_resume_eligible_id and profile_id = v_caller and finished_at is null for update;
  if not found then raise exception 'no open lesson' using errcode = 'P0001'; end if;
  select * into q from public.question where id = p_question_id and cookie_lesson_id = r.cookie_lesson_id and retired_at is null and status = 'approved';
  if not found then raise exception 'question not in this lesson' using errcode = 'P0001'; end if;
  if exists (select 1 from public.lesson_answer where resume_eligible_id = r.id and question_id = q.id) then
    raise exception 'already answered' using errcode = 'P0001';
  end if;
  if r.spent_at is null then r := private.charge_bake(r); end if;
  v_ok := private.grade(q, p_answer);
  insert into public.lesson_answer (resume_eligible_id, question_id, profile_id, answer, is_correct)
  values (r.id, q.id, v_caller, p_answer, v_ok);
  return jsonb_build_object('is_correct', v_ok, 'resume_eligible', to_jsonb(r))
      || private.answer_key(q);                                                                    -- 0.2(2): after grading only
end $$;

create or replace function public.save_resume_point(p_resume_eligible_id uuid, p_point jsonb) returns void
language sql security definer set search_path = '' as $$
  update public.resume_eligible set resume_point = p_point
   where id = p_resume_eligible_id and profile_id = private.caller() and finished_at is null
$$;

-- Complete a cookie lesson (A7): every question answered; writes the R4 tables in one transaction
create or replace function public.complete_cookie_lesson(p_resume_eligible_id uuid) returns public.cookie_completion
language plpgsql security definer set search_path = '' as $$
declare
  v_caller uuid := private.caller(); r public.resume_eligible; cl public.cookie_lesson;
  v_qcount integer; v_correct integer; v_replay boolean; c public.cookie_completion;
  v_lessons integer; v_done integer; v_today date; ds public.day_streak;
begin
  perform 1 from public.profile where id = v_caller for update;
  select * into r from public.resume_eligible where id = p_resume_eligible_id and profile_id = v_caller and finished_at is null for update;   -- review F3
  if not found then raise exception 'no open lesson' using errcode = 'P0001'; end if;
  if r.spent_at is null then raise exception 'answer at least one question' using errcode = 'P0001'; end if;
  select * into cl from public.cookie_lesson where id = r.cookie_lesson_id;
  select count(*) into v_qcount from public.question where cookie_lesson_id = cl.id and retired_at is null and status = 'approved';
  select count(*) filter (where is_correct), count(*) into v_correct, v_done
    from public.lesson_answer la join public.question q on q.id = la.question_id and q.retired_at is null and q.status = 'approved'
   where la.resume_eligible_id = r.id;
  if v_done < v_qcount then raise exception 'answer every question first (% of %)', v_done, v_qcount using errcode = 'P0001'; end if;
  v_replay := exists (select 1 from public.cookie_completion where profile_id = v_caller and cookie_lesson_id = cl.id and not is_replay);
  insert into public.cookie_completion (profile_id, cookie_lesson_id, is_replay, seconds_taken, correct_count, question_count, resume_eligible_id)
  values (v_caller, cl.id, v_replay, extract(epoch from now() - r.opened_at)::integer, v_correct, v_qcount, r.id) returning * into c;
  update public.resume_eligible set finished_at = now() where id = r.id;
  -- reveals: every verse of every passage, once per player (R7)
  insert into public.revealed_verse (profile_id, verse_id, cookie_lesson_id)
  select v_caller, v.id, cl.id
    from public.lesson_passage lp
    join public.verse fv on fv.id = lp.from_verse_id
    join public.verse tv on tv.id = lp.to_verse_id
    join public.verse v on v.sequence between fv.sequence and tv.sequence
   where lp.cookie_lesson_id = cl.id
  on conflict do nothing;
  -- chips (R8): one earn per completion
  perform private.earn_chips(v_caller,
            private.setting_int(case when v_replay then 'chips_replay_completion' else 'chips_first_completion' end),
            case when v_replay then 'replay completion' else 'cookie completion' end, c.id);
  -- flavor done? (G17/G18): first-time completions on every live lesson of the flavor
  select count(*) into v_lessons from public.cookie_lesson where cookie_dough_flavor_id = cl.cookie_dough_flavor_id and retired_at is null and status = 'approved';
  select count(distinct cc.cookie_lesson_id) into v_done
    from public.cookie_completion cc join public.cookie_lesson l on l.id = cc.cookie_lesson_id
   where cc.profile_id = v_caller and l.cookie_dough_flavor_id = cl.cookie_dough_flavor_id and l.retired_at is null and l.status = 'approved' and not cc.is_replay;
  if v_done >= v_lessons then
    update public.dough_progress set status = 'done', completed_at = coalesce(completed_at, now())
     where profile_id = v_caller and cookie_dough_flavor_id = cl.cookie_dough_flavor_id;
    insert into public.flavor_finish (profile_id, cookie_dough_flavor_id, all_cookies_done_at)
    values (v_caller, cl.cookie_dough_flavor_id, now())
    on conflict (profile_id, cookie_dough_flavor_id) do update
      set all_cookies_done_at = coalesce(public.flavor_finish.all_cookies_done_at, excluded.all_cookies_done_at);
  end if;
  -- day streak on the Chicago date (owner ruling G21)
  v_today := private.chicago_today();
  select * into ds from public.day_streak where profile_id = v_caller for update;
  if ds.last_active_day is null or ds.last_active_day < v_today - 1 then
    update public.day_streak set current_streak = 1, best_streak = greatest(best_streak, 1), last_active_day = v_today where profile_id = v_caller;
  elsif ds.last_active_day = v_today - 1 then
    update public.day_streak set current_streak = current_streak + 1, best_streak = greatest(best_streak, current_streak + 1), last_active_day = v_today where profile_id = v_caller;
  end if;
  perform private.award_badges(v_caller);
  return c;
end $$;

-- Mark a flavor tasted (video watched) — the only Flavor Finish field the player sets, through a function
create or replace function public.mark_flavor_tasted(p_flavor_id uuid) returns public.flavor_finish
language plpgsql security definer set search_path = '' as $$
declare v_caller uuid := private.caller(); r public.flavor_finish;
begin
  update public.flavor_finish set tasted_at = coalesce(tasted_at, now())
   where profile_id = v_caller and cookie_dough_flavor_id = p_flavor_id and all_cookies_done_at is not null
  returning * into r;
  if not found then raise exception 'finish every cookie lesson first' using errcode = 'P0001'; end if;
  return r;
end $$;

-- Launch the earned box (R10): needs tasted_at; sets is_public and boxed_at
create or replace function public.launch_box(p_flavor_id uuid, p_verse_id uuid, p_emblem text,
                                             p_name_shown text, p_date_shown text, p_stamp_shown text, p_look jsonb)
returns public.keepsake_box
language plpgsql security definer set search_path = '' as $$
declare v_caller uuid := private.caller(); ff public.flavor_finish; f public.cookie_dough_flavor; b public.keepsake_box;
begin
  select * into ff from public.flavor_finish where profile_id = v_caller and cookie_dough_flavor_id = p_flavor_id;
  if not found or ff.tasted_at is null then raise exception 'taste the flavor first' using errcode = 'P0001'; end if;
  select * into f from public.cookie_dough_flavor where id = p_flavor_id;
  insert into public.keepsake_box (profile_id, recipe_id, earned_by_cookie_dough_flavor_id, is_gift, verse_id, emblem,
                                   name_shown, date_shown, stamp_shown, look, is_public)
  values (v_caller, f.recipe_id, p_flavor_id, false, p_verse_id, p_emblem, p_name_shown, p_date_shown, p_stamp_shown, coalesce(p_look, '{}'::jsonb), true)
  returning * into b;
  update public.flavor_finish set boxed_at = now() where profile_id = v_caller and cookie_dough_flavor_id = p_flavor_id;
  perform private.award_badges(v_caller);
  return b;
end $$;

-- Send a gift box (A6): freezes it, mints the claim token, returns the share link once
create or replace function public.send_gift_box(p_box_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_caller uuid := private.caller(); b public.keepsake_box; d public.gift_box_details; v_token text;
begin
  select * into b from public.keepsake_box where id = p_box_id and profile_id = v_caller and is_gift;
  if not found then raise exception 'not your gift box' using errcode = '42501'; end if;
  select * into d from public.gift_box_details where box_id = p_box_id;
  if d.sent_at is not null then raise exception 'already sent' using errcode = 'P0001'; end if;
  if d.sent_to_profile_id is not null and private.is_blocked_either_way(v_caller, d.sent_to_profile_id) then
    raise exception 'blocked' using errcode = '42501';
  end if;
  if d.sent_to_profile_id is null and not exists (select 1 from public.gift_delivery where box_id = p_box_id and recipient_contact is not null) then
    raise exception 'a gift sent outside the app needs a recipient contact' using errcode = 'P0001';
  end if;
  v_token := translate(encode(extensions.gen_random_bytes(24), 'base64'), '+/=', '-_');
  insert into public.gift_delivery (box_id, claim_token_hash) values (p_box_id, encode(extensions.digest(v_token, 'sha256'), 'hex'))
  on conflict (box_id) do update set claim_token_hash = excluded.claim_token_hash;
  update public.gift_box_details set sent_at = now() where box_id = p_box_id;
  return jsonb_build_object('box_id', p_box_id, 'claim_token', v_token);
end $$;

-- Open a gift by token. Called only by the gift-view Edge Function with the secret key, which passes the
-- real client ip (review F13); never granted to anon. Never claims.
create or replace function public.claim_gift_box(p_token text, p_ip inet default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_hash text := encode(extensions.digest(p_token, 'sha256'), 'hex'); v_fail integer; v_found boolean; d record; b public.keepsake_box;
begin
  select count(*) into v_fail from public.claim_attempt
   where not succeeded and at > now() - interval '1 hour' and (token_hash = v_hash or (p_ip is not null and ip = p_ip));
  -- failures are returned, not raised: a raise would roll back the attempt row that the throttle counts
  if v_fail >= private.setting_int('claim_attempt_limit_hour') then
    insert into public.claim_attempt (token_hash, ip, succeeded) values (v_hash, p_ip, false);
    return jsonb_build_object('error', 'too many attempts');
  end if;
  select gd.box_id, gbd.sent_at, gbd.box_type, gbd.unlock_date, gbd.dedication_name, gbd.dedication_reason, gbd.note, gbd.with_names,
         gbd.signature_file_path, gbd.photo_file_path, gbd.voice_note_file_path
    into d
    from public.gift_delivery gd join public.gift_box_details gbd on gbd.box_id = gd.box_id
   where gd.claim_token_hash = v_hash and gbd.sent_at is not null;
  v_found := found;
  insert into public.claim_attempt (token_hash, ip, succeeded) values (v_hash, p_ip, v_found);
  if not v_found then return jsonb_build_object('error', 'no such gift'); end if;
  if d.box_type = 'capsule' and d.unlock_date > private.chicago_today() then
    return jsonb_build_object('box_id', d.box_id, 'sealed_until', d.unlock_date);
  end if;
  select * into b from public.keepsake_box where id = d.box_id;
  return jsonb_build_object('box', to_jsonb(b), 'details', to_jsonb(d),
    'positions', (select coalesce(jsonb_agg(to_jsonb(p)), '[]'::jsonb) from public.box_element_position p where p.box_id = d.box_id));
end $$;

-- Claim a gift as the signed-in player (A6): explicit, refuses the sender
create or replace function public.claim_gift_box_as_me(p_token text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_caller uuid := private.caller(); d record;
begin
  if not private.session_is_live() then raise exception 'sign in' using errcode = '42501'; end if;
  select gd.box_id, gbd.sent_at, gbd.sent_to_profile_id, gd.claimed_at, kb.profile_id as sender
    into d
    from public.gift_delivery gd
    join public.gift_box_details gbd on gbd.box_id = gd.box_id
    join public.keepsake_box kb on kb.id = gd.box_id
   where gd.claim_token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex') and gbd.sent_at is not null
   for update of gd;   -- one claimant wins (pass 2, B6)
  insert into public.claim_attempt (token_hash, ip, succeeded) values (encode(extensions.digest(p_token, 'sha256'), 'hex'), null, found);
  if not found then raise exception 'no such gift' using errcode = 'P0001'; end if;
  if d.sender = v_caller then raise exception 'you sent this gift' using errcode = 'P0001'; end if;
  if private.is_blocked_either_way(v_caller, d.sender) then raise exception 'blocked' using errcode = '42501'; end if;
  if d.claimed_at is not null or d.sent_to_profile_id is not null then raise exception 'already claimed' using errcode = 'P0001'; end if;
  update public.gift_delivery set claimed_at = now(), recipient_name = null, recipient_contact = null where box_id = d.box_id;
  update public.gift_box_details set sent_to_profile_id = v_caller where box_id = d.box_id;
  return d.box_id;
end $$;

-- Gift Card (S3, A1): code encrypted with the key held in Vault
create or replace function private.gift_card_key() returns text
language sql stable security definer set search_path = '' as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'gift_card_key' limit 1
$$;

create or replace function public.attach_gift_card(p_box_id uuid, p_brand text, p_amount_usd numeric, p_code text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_caller uuid := private.caller(); v_key text;
begin
  if not exists (select 1 from public.keepsake_box where id = p_box_id and profile_id = v_caller and is_gift) then
    raise exception 'not your gift box' using errcode = '42501';
  end if;
  if private.box_is_sent(p_box_id) then raise exception 'already sent' using errcode = 'P0001'; end if;
  v_key := private.gift_card_key();
  if v_key is null then raise exception 'gift card key is not set in Vault' using errcode = 'P0001'; end if;
  insert into public.gift_card (box_id, brand, amount_usd, paid) values (p_box_id, p_brand, p_amount_usd, false);
  insert into public.gift_card_secret (box_id, code_ciphertext) values (p_box_id, extensions.pgp_sym_encrypt(p_code, v_key));
end $$;

create or replace function public.reveal_gift_card(p_box_id uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare v_caller uuid := private.caller(); d record; v_code text;
begin
  if not private.session_is_live() then raise exception 'sign in' using errcode = '42501'; end if;
  select gbd.sent_to_profile_id, gbd.sent_at, gbd.box_type, gbd.unlock_date into d
    from public.gift_box_details gbd where gbd.box_id = p_box_id;
  if not found or d.sent_at is null or d.sent_to_profile_id is distinct from v_caller then
    raise exception 'not the recipient' using errcode = '42501';
  end if;
  if d.box_type = 'capsule' and d.unlock_date > private.chicago_today() then
    raise exception 'sealed until %', d.unlock_date using errcode = 'P0001';
  end if;
  select extensions.pgp_sym_decrypt(code_ciphertext, private.gift_card_key()) into v_code
    from public.gift_card_secret where box_id = p_box_id;
  update public.gift_card_secret set revealed_at = coalesce(revealed_at, now()) where box_id = p_box_id;
  return v_code;
end $$;

-- Shop (R5): buy a look, repair a streak
create or replace function public.buy_look(p_look_id uuid) returns public.owned_look
language plpgsql security definer set search_path = '' as $$
declare v_caller uuid := private.caller(); lc public.look_catalogue; r public.owned_look;
begin
  select * into lc from public.look_catalogue where id = p_look_id and enabled;
  if not found then raise exception 'look not available' using errcode = 'P0001'; end if;
  if lc.plus_only and not private.is_plus(v_caller) then raise exception 'Plus only' using errcode = '42501'; end if;
  if exists (select 1 from public.owned_look where profile_id = v_caller and look_id = p_look_id) then
    raise exception 'already owned' using errcode = 'P0001';
  end if;
  if lc.price_in_chips > 0 then perform private.spend_chips(v_caller, lc.price_in_chips, 'look: ' || lc.name); end if;
  insert into public.owned_look (profile_id, look_id) values (v_caller, p_look_id) returning * into r;
  return r;
end $$;

create or replace function public.repair_streak() returns public.day_streak
language plpgsql security definer set search_path = '' as $$
declare v_caller uuid := private.caller(); v_price integer; ds public.day_streak; v_today date := private.chicago_today();
begin
  select price_in_chips into v_price from public.price where item = 'streak repair' and amount = 1 and enabled;
  if v_price is null then raise exception 'no repair price set' using errcode = 'P0001'; end if;
  select * into ds from public.day_streak where profile_id = v_caller for update;
  if ds.last_active_day is null or ds.last_active_day >= v_today - 1 then
    raise exception 'nothing to repair' using errcode = 'P0001';
  end if;
  perform private.spend_chips(v_caller, v_price, 'streak repair');
  update public.day_streak set last_active_day = v_today - 1, repairs_used = repairs_used + 1
   where profile_id = v_caller returning * into ds;
  return ds;
end $$;

-- Games (D3, A3)
create or replace function public.create_game(p_game_type text) returns public.game
language plpgsql security definer set search_path = '' as $$
declare v_caller uuid := private.caller(); g public.game;
begin
  insert into public.game (host_profile_id, game_type, status, started_at)
  values (v_caller, p_game_type, case when p_game_type like '% solo' then 'playing' else 'open' end,
          case when p_game_type like '% solo' then now() end)
  returning * into g;
  insert into public.game_player (game_id, profile_id) values (g.id, v_caller);
  return g;
end $$;

create or replace function public.accept_invite(p_invite_id uuid, p_accept boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare v_caller uuid := private.caller(); i public.game_invite;
begin
  select * into i from public.game_invite where id = p_invite_id and to_profile_id = v_caller and answered_at is null;
  if not found then raise exception 'no open invite' using errcode = 'P0001'; end if;
  if p_accept and (not exists (select 1 from public.game where id = i.game_id and status = 'open')
                   or private.is_blocked_either_way(v_caller, i.from_profile_id)) then
    raise exception 'this game can no longer be joined' using errcode = 'P0001';
  end if;
  update public.game_invite set accepted = p_accept, answered_at = now() where id = p_invite_id;
  if p_accept then
    insert into public.game_player (game_id, profile_id) values (i.game_id, v_caller) on conflict do nothing;
  end if;
end $$;

create or replace function public.answer_game_question(p_game_id uuid, p_question_id uuid, p_memory_verse_id uuid, p_answer jsonb, p_seconds integer)
returns public.game_answer
language plpgsql security definer set search_path = '' as $$
declare v_caller uuid := private.caller(); g public.game; q public.question; v_ok boolean; r public.game_answer;
begin
  if not private.is_in_game(p_game_id) then raise exception 'not in this game' using errcode = '42501'; end if;
  select * into g from public.game where id = p_game_id;
  if g.status <> 'playing' then raise exception 'game is not playing' using errcode = 'P0001'; end if;
  if (p_question_id is null) = (p_memory_verse_id is null) then raise exception 'one of question or memory verse' using errcode = '22023'; end if;
  if p_question_id is not null then
    -- review F5: every trivia game draws only from the caller's own collected pool, published flavors only
    if g.game_type not like 'trivia%' then raise exception 'not a trivia game' using errcode = '22023'; end if;
    select qq.* into q from public.collected_question cq
      join public.question qq on qq.id = cq.question_id
      join public.cookie_lesson cl on cl.id = qq.cookie_lesson_id
     where cq.profile_id = v_caller and cq.question_id = p_question_id and qq.retired_at is null
       and private.flavor_is_published(cl.cookie_dough_flavor_id);
    if not found then raise exception 'not in your trivia pool' using errcode = '42501'; end if;
    v_ok := private.grade(q, p_answer);
  else
    if g.game_type not like 'verse%' then raise exception 'not a verse game' using errcode = '22023'; end if;
    if not exists (select 1 from public.memory_verse mv where mv.id = p_memory_verse_id and mv.approved
                   and (mv.cookie_dough_flavor_id is null or private.flavor_is_published(mv.cookie_dough_flavor_id))) then
      raise exception 'memory verse not available' using errcode = '42501';
    end if;
    -- verse games: the player types the memory verse in their chosen translation
    v_ok := exists (
      select 1 from public.memory_verse_text t join public.settings s on s.profile_id = v_caller
      where t.memory_verse_id = p_memory_verse_id and t.translation_code = s.translation_code
        and regexp_replace(lower(t.text), '[^a-z0-9]', '', 'g') = regexp_replace(lower(p_answer #>> '{}'), '[^a-z0-9]', '', 'g'));
  end if;
  insert into public.game_answer (game_id, profile_id, question_id, memory_verse_id, correct, seconds)
  values (p_game_id, v_caller, p_question_id, p_memory_verse_id, v_ok, greatest(p_seconds, 0)) returning * into r;
  update public.game_player set score = score + case when v_ok then 1 else 0 end,
         answer_streak = case when v_ok then answer_streak + 1 else 0 end
   where game_id = p_game_id and profile_id = v_caller;
  return r;
end $$;

create or replace function public.finish_game(p_game_id uuid) returns public.game
language plpgsql security definer set search_path = '' as $$
declare v_caller uuid := private.caller(); g public.game; v_best integer; gp record; v_players integer; v_answered integer; v_max_q integer;
begin
  select * into g from public.game where id = p_game_id for update;
  if not found or not private.is_in_game(p_game_id) then raise exception 'not in this game' using errcode = '42501'; end if;
  if g.status = 'ended' then return g; end if;
  if g.status <> 'playing' then raise exception 'game has not started' using errcode = 'P0001'; end if;
  -- who may end it (A3): the host; or any player once every player has answered as many as the busiest player; or after 24 hours
  if g.host_profile_id <> v_caller then
    select count(*) into v_players from public.game_player where game_id = p_game_id;
    select max(c) into v_max_q from (select count(*) c from public.game_answer where game_id = p_game_id group by profile_id) x;
    select count(*) into v_answered from (select profile_id from public.game_answer where game_id = p_game_id group by profile_id having count(*) >= coalesce(v_max_q, 0)) y;
    if not (coalesce(v_answered, 0) = v_players and coalesce(v_max_q, 0) > 0) and g.started_at > now() - interval '24 hours' then
      raise exception 'only the host may end the game before everyone has answered' using errcode = '42501';
    end if;
  end if;
  select max(x.score) into v_best from public.game_player x
   where x.game_id = p_game_id and exists (select 1 from public.game_answer a where a.game_id = p_game_id and a.profile_id = x.profile_id);
  -- a player with no answers neither wins nor loses (review F6)
  update public.game_player x set won = case when exists (select 1 from public.game_answer a where a.game_id = p_game_id and a.profile_id = x.profile_id)
                                             then (x.score = v_best) end
   where x.game_id = p_game_id;
  for gp in select * from public.game_player where game_id = p_game_id and won is not null loop
    insert into public.game_best (profile_id, game_type, best_answer_streak, wins)
    values (gp.profile_id, g.game_type, gp.answer_streak, case when gp.won then 1 else 0 end)
    on conflict (profile_id, game_type) do update
      set best_answer_streak = greatest(public.game_best.best_answer_streak, excluded.best_answer_streak),
          wins = public.game_best.wins + excluded.wins;
    perform private.award_badges(gp.profile_id);
  end loop;
  update public.game set status = 'ended', ended_at = now(),
         game_result = (select jsonb_agg(jsonb_build_object('profile_id', profile_id, 'score', score, 'won', won)) from public.game_player where game_id = p_game_id)
   where id = p_game_id returning * into g;
  return g;
end $$;

-- Collected questions (A2). 0.2(4), 4.Q2, 4.Q21: the trivia pool never sends an answer-key field (answer, is_correct,
-- blank, order_question_sequence, pair, explanation, why) nor story. Same shape as question_for_play, minus story.
-- Answers reach a player only in answer_question's response, after answering.
create or replace function public.my_collected_questions() returns setof jsonb
language sql stable security definer set search_path = '' as $$
  select (private.question_for_play(q) - 'story')
         || jsonb_build_object('collected_at', cq.collected_at, 'is_edited', coalesce(q.edited_at > cq.collected_at, false))
  from public.collected_question cq join public.question q on q.id = cq.question_id
  where cq.profile_id = (select auth.uid()) and q.retired_at is null and q.status = 'approved'
$$;

-- Account deletion, step 1 (A5): re-point and lock; the Edge Function then clears Storage and calls deleteUser
create or replace function public.prepare_account_deletion() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_caller uuid := (select auth.uid()); v_t uuid := private.tombstone_id(); v_gift_boxes uuid[];
begin
  if v_caller is null or not private.session_is_live() then raise exception 'sign in' using errcode = '42501'; end if;
  if v_caller = v_t then raise exception 'system profile' using errcode = '42501'; end if;
  perform 1 from public.profile where id = v_caller for update;
  if private.deletion_pending(v_caller) then
    -- already prepared: the Edge Function may retry; return the same answer without touching anything (pass 2, B8)
    select coalesce(array_agg(kb.id), '{}') into v_gift_boxes from public.keepsake_box kb where kb.profile_id = v_t
      and exists (select 1 from public.gift_box_details d where d.box_id = kb.id);
    return jsonb_build_object('profile_id', v_caller, 'kept_gift_boxes', to_jsonb(v_gift_boxes), 'already_prepared', true);
  end if;
  update public.profile_private set deletion_requested_at = now() where profile_id = v_caller;   -- review F12: once, and every write refuses from here
  select coalesce(array_agg(kb.id), '{}') into v_gift_boxes
    from public.keepsake_box kb join public.gift_box_details d on d.box_id = kb.id
   where kb.profile_id = v_caller and d.sent_at is not null;
  update public.keepsake_box set profile_id = v_t where id = any(v_gift_boxes);
  update public.gift_box_details set sent_to_profile_id = v_t where sent_to_profile_id = v_caller;
  update public.game set host_profile_id = v_t where host_profile_id = v_caller;
  update public.game_player set profile_id = v_t where profile_id = v_caller;
  update public.game_answer set profile_id = v_t where profile_id = v_caller;
  update public.purchase set profile_id = v_t where profile_id = v_caller;
  update public.chip_ledger set profile_id = v_t where profile_id = v_caller;
  update public.box_crumb set profile_id = v_t where profile_id = v_caller;
  -- files to keep: those under the re-pointed gift boxes (moved to gifts/<box id>/ by the Edge Function)
  return jsonb_build_object('profile_id', v_caller, 'kept_gift_boxes', to_jsonb(v_gift_boxes));
end $$;

-- ---------------------------------------------------------------------------
-- 18. Admin and server functions
-- ---------------------------------------------------------------------------
create or replace function public.grant_complimentary_plan(p_profile_id uuid, p_until timestamptz, p_note text) returns public.plan
language plpgsql security definer set search_path = '' as $$
declare r public.plan;
begin
  if not private.is_content_admin() then raise exception 'admin only' using errcode = '42501'; end if;
  insert into public.plan (profile_id, plan_kind, ends_at, source, granted_by_profile_id, granted_note)
  values (p_profile_id, 'complimentary', p_until, 'granted', (select auth.uid()), p_note) returning * into r;
  return r;
end $$;

-- Called only with the secret key after server-side receipt verification (ruling 4, R3, G4)
create or replace function public.record_purchase(p_profile_id uuid, p_item_type text, p_amount_usd numeric, p_store text,
                                                  p_receipt text, p_quantity integer default 1, p_plan_until timestamptz default null)
returns public.purchase
language plpgsql security definer set search_path = '' as $$
declare p public.purchase;
begin
  insert into public.purchase (profile_id, item_type, amount_usd, store, store_receipt)
  values (p_profile_id, p_item_type, p_amount_usd, p_store, p_receipt) returning * into p;
  case p_item_type
    when 'chip pack' then perform private.earn_chips(p_profile_id, p_quantity, 'chip pack', null, p.id);
    when 'plus'      then insert into public.plan (profile_id, plan_kind, started_at, ends_at, source, purchase_id)
                          select p_profile_id, 'plus', s.started, p_plan_until, 'store', p.id
                          from (select greatest(now(), coalesce((select max(ends_at) from public.plan where profile_id = p_profile_id and plan_kind = 'plus' and ends_at is not null), now())) as started) s
                          where p_plan_until is null or p_plan_until > s.started;   -- review F8 and pass 2 B9: a renewal starts when the live period ends; a stale receipt keeps its Purchase row and adds no plan
    when 'day pass'  then insert into public.bake_grant (profile_id, kind, expires_at)
                          values (p_profile_id, 'day pass', now() + interval '24 hours');
    when 'bake'      then insert into public.bake_grant (profile_id, kind)
                          select p_profile_id, 'bonus' from generate_series(1, greatest(p_quantity, 1));
    else null;   -- gift card: not sold at launch (ruling 5)
  end case;
  return p;
end $$;

-- Ad reward, secret key only, after the ad network's server callback (A8)
create or replace function public.grant_ad_bake(p_profile_id uuid) returns public.bake_grant
language sql security definer set search_path = '' as $$
  insert into public.bake_grant (profile_id, kind, expires_at) values (p_profile_id, 'ad', now() + interval '24 hours') returning *
$$;

-- Scheduled: clear unclaimed recipient contact after the retention period (R17)
create or replace function public.clear_stale_gift_contacts() returns integer
language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  update public.gift_delivery gd set recipient_name = null, recipient_contact = null
    from public.gift_box_details d
   where d.box_id = gd.box_id and gd.claimed_at is null and d.sent_at < now() - make_interval(days => private.setting_int('gift_contact_retention_days'))
     and (gd.recipient_name is not null or gd.recipient_contact is not null);
  get diagnostics n = row_count;
  return n;
end $$;

-- Scheduled: write the next 14 days of TV slots from the weekly pattern (R14)
create or replace function public.materialise_tv_schedule() returns integer
language plpgsql security definer set search_path = '' as $$
declare d date; p record; n integer := 0; v_start timestamptz;
begin
  -- review F43: future slots that the pattern no longer produces are removed first (their reminders cascade)
  delete from public.tv_schedule s
   where s.start_at > now()
     and not exists (
       select 1 from public.tv_pattern p
       where p.program_id = s.program_id
         and p.weekday = extract(dow from (s.start_at at time zone 'America/Chicago'))
         and p.start_time = (s.start_at at time zone 'America/Chicago')::time
         and s.end_at = s.start_at + make_interval(mins => p.duration_minutes));
  for d in select generate_series(private.chicago_today(), private.chicago_today() + 13, '1 day')::date loop
    for p in select * from public.tv_pattern where weekday = extract(dow from d) loop
      v_start := (d + p.start_time) at time zone 'America/Chicago';
      insert into public.tv_schedule (program_id, start_at, end_at)
      values (p.program_id, v_start, v_start + make_interval(mins => p.duration_minutes))
      on conflict do nothing;
      if found then n := n + 1; end if;
    end loop;
  end loop;
  return n;
end $$;

-- Before User Created hook (B3): refuse disposable email domains. Called by Supabase Auth as supabase_auth_admin.
create or replace function public.before_user_created_hook(event jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_email text := event -> 'user' ->> 'email'; v_domain text;
begin
  if v_email is null then return '{}'::jsonb; end if;
  v_domain := lower(split_part(v_email, '@', 2));
  if exists (select 1 from public.blocked_email_domain where domain = v_domain) then
    return jsonb_build_object('error', jsonb_build_object('message', 'This email provider is not accepted. Use a different address.', 'http_code', 400));
  end if;
  return '{}'::jsonb;
end $$;

-- Create a gift box with its details in one transaction (G2/R2 deferred pair)
create or replace function public.create_gift_box(p_recipe_id uuid, p_verse_id uuid, p_emblem text, p_name_shown text, p_date_shown text,
                                                  p_stamp_shown text, p_look jsonb, p_box_type text, p_unlock_date date,
                                                  p_dedication_name text, p_dedication_reason text, p_note text, p_with_names jsonb,
                                                  p_sent_to_profile_id uuid, p_recipient_name text, p_recipient_contact text)
returns public.keepsake_box
language plpgsql security definer set search_path = '' as $$
declare v_caller uuid := private.caller(); b public.keepsake_box;
begin
  if p_sent_to_profile_id is not null and (p_sent_to_profile_id = v_caller or p_sent_to_profile_id = private.tombstone_id()
     or private.is_blocked_either_way(v_caller, p_sent_to_profile_id)) then
    raise exception 'that recipient is not allowed' using errcode = '42501';
  end if;
  insert into public.keepsake_box (profile_id, recipe_id, is_gift, verse_id, emblem, name_shown, date_shown, stamp_shown, look)
  values (v_caller, p_recipe_id, true, p_verse_id, p_emblem, p_name_shown, p_date_shown, p_stamp_shown, coalesce(p_look, '{}'::jsonb))
  returning * into b;
  insert into public.gift_box_details (box_id, box_type, unlock_date, dedication_name, dedication_reason, note, with_names, sent_to_profile_id)
  values (b.id, p_box_type, p_unlock_date, p_dedication_name, p_dedication_reason, p_note, p_with_names, p_sent_to_profile_id);
  insert into public.gift_delivery (box_id, recipient_name, recipient_contact) values (b.id, p_recipient_name, p_recipient_contact);
  return b;
end $$;

-- Close an open that has no answers yet (review F4). Nothing was answered, so nothing is reset (B10 holds).
create or replace function public.close_unanswered_lesson(p_resume_eligible_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_caller uuid := private.caller();
begin
  delete from public.resume_eligible r
   where r.id = p_resume_eligible_id and r.profile_id = v_caller and r.finished_at is null and r.spent_at is null
     and not exists (select 1 from public.lesson_answer la where la.resume_eligible_id = r.id);
  if not found then raise exception 'only an open with no answers can be closed' using errcode = 'P0001'; end if;
end $$;

-- Lesson titles for the Prep screen (review F7/F30): id, order, title only, published flavors only
create or replace function public.flavor_lessons(p_flavor_id uuid) returns setof jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id', cl.id, 'order', cl."order", 'title', cl.title, 'edited_at', cl.edited_at)
  from public.cookie_lesson cl
  where cl.cookie_dough_flavor_id = p_flavor_id and cl.retired_at is null and cl.status = 'approved' and private.flavor_is_published(p_flavor_id)
    and private.caller() is not null
  order by cl."order"
$$;

-- Push token registration (review F26): a device token moves to whoever signs in on that device
create or replace function public.register_push_token(p_device_token text, p_platform text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_caller uuid := private.caller();
begin
  delete from public.push_token where device_token = p_device_token and profile_id <> v_caller;
  insert into public.push_token (profile_id, device_token, platform) values (v_caller, p_device_token, p_platform)
  on conflict (profile_id, device_token) do update set platform = excluded.platform, updated_at = now();
end $$;

-- Plus trial (map p.16 step 3; review F34): one per profile, a plus row with ends_at = trial end
create or replace function public.start_plus_trial() returns public.plan
language plpgsql security definer set search_path = '' as $$
declare v_caller uuid := private.caller(); r public.plan;
begin
  perform 1 from public.profile where id = v_caller for update;
  if exists (select 1 from public.plan where profile_id = v_caller and trial_ends_at is not null) then
    raise exception 'trial already used' using errcode = 'P0001';
  end if;
  if private.is_plus(v_caller) then raise exception 'already on Plus' using errcode = 'P0001'; end if;
  insert into public.plan (profile_id, plan_kind, ends_at, trial_ends_at, source)
  values (v_caller, 'plus', now() + make_interval(days => private.setting_int('plus_trial_days')),
          now() + make_interval(days => private.setting_int('plus_trial_days')), 'promo') returning * into r;
  return r;
end $$;

-- Scheduled: prune claim attempts older than a day (review F13)
create or replace function public.prune_claim_attempts() returns integer
language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  delete from public.claim_attempt where at < now() - interval '1 day';
  get diagnostics n = row_count;
  return n;
end $$;
-- ---------------------------------------------------------------------------
-- 19. Row Level Security: on for every table; one policy per verb per role.
--     Naming: "<table>: who may verb" (Stage 5 section 1).
--     Owner tests use (select auth.uid()) so Postgres evaluates it once per statement.
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;
-- Tables are owned by postgres, which is not bound by RLS; every security definer function above runs as postgres.

-- ---- Account ---------------------------------------------------------------
create policy "profile: any player may read a profile not blocked either way" on public.profile
  for select to authenticated
  using (id = (select auth.uid()) or is_system or not private.is_blocked_either_way(id, (select auth.uid())));
create policy "profile: owner may update own" on public.profile
  for update to authenticated
  using (id = (select auth.uid()) and not is_system) with check (id = (select auth.uid()) and not is_system);

create policy "profile_private: owner may read" on public.profile_private
  for select to authenticated using (profile_id = (select auth.uid()));
create policy "profile_private: owner may update" on public.profile_private
  for update to authenticated using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));

create policy "settings: owner may read" on public.settings
  for select to authenticated using (profile_id = (select auth.uid()));
create policy "settings: owner may update" on public.settings
  for update to authenticated using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));

create policy "day_streak: owner may read" on public.day_streak
  for select to authenticated using (profile_id = (select auth.uid()));

create policy "plan: owner may read" on public.plan
  for select to authenticated using (profile_id = (select auth.uid()));

create policy "purchase: owner may read" on public.purchase
  for select to authenticated using (profile_id = (select auth.uid()));

create policy "push_token: owner may read" on public.push_token
  for select to authenticated using (profile_id = (select auth.uid()));
create policy "push_token: owner may insert" on public.push_token
  for insert to authenticated with check (profile_id = (select auth.uid()));
create policy "push_token: owner may update" on public.push_token
  for update to authenticated using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));
create policy "push_token: owner may delete" on public.push_token
  for delete to authenticated using (profile_id = (select auth.uid()));

create policy "block: blocker may read own" on public.block
  for select to authenticated using (blocker_id = (select auth.uid()));
create policy "block: blocker may insert" on public.block
  for insert to authenticated with check (blocker_id = (select auth.uid()));
create policy "block: blocker may delete" on public.block
  for delete to authenticated using (blocker_id = (select auth.uid()));

-- ---- Bible reference layer: any player may read; nobody but the server writes (R24) ----
do $$
declare t text;
begin
  foreach t in array array['book','chapter','verse','place','bible_character','bible_character_partner',
                           'verse_bible_character','verse_place','event','event_verse','event_bible_character',
                           'people_group','group_member'] loop
    execute format('create policy "%s: any player may read" on public.%I for select to authenticated using (true)', t, t);
  end loop;
end $$;
create policy "dictionary_entry: admin may read" on public.dictionary_entry
  for select to authenticated using (private.is_content_admin());
-- 1.8, R24: psalm_heading is loaded by the server job as postgres; no write policy. The reveal does not show psalm
-- titles, so only the content admin reads it (the writer and checker read headings), as with dictionary_entry.
create policy "psalm_heading: admin may read" on public.psalm_heading
  for select to authenticated using (private.is_content_admin());

-- ---- Lesson content: players read what is published through functions; admin writes ----
create policy "recipe: any player may read" on public.recipe
  for select to authenticated using (true);
create policy "recipe: admin may write" on public.recipe
  for all to authenticated using (private.is_content_admin()) with check (private.is_content_admin());

create policy "cookie_dough_flavor: players read published, admin reads all" on public.cookie_dough_flavor
  for select to authenticated using (status = 'published' or private.is_content_admin());
create policy "cookie_dough_flavor: admin may write" on public.cookie_dough_flavor
  for all to authenticated using (private.is_content_admin()) with check (private.is_content_admin());

-- B4: Cookie Lesson, Lesson Passage and Question have no player select; open_cookie_lesson serves the content,
-- flavor_lessons serves titles for the Prep screen
create policy "cookie_lesson: admin only" on public.cookie_lesson
  for all to authenticated using (private.is_content_admin()) with check (private.is_content_admin());

create policy "lesson_passage: admin only" on public.lesson_passage
  for all to authenticated using (private.is_content_admin()) with check (private.is_content_admin());
create policy "question: admin only" on public.question
  for all to authenticated using (private.is_content_admin()) with check (private.is_content_admin());
create policy "question_option: admin only" on public.question_option
  for all to authenticated using (private.is_content_admin()) with check (private.is_content_admin());
create policy "question_verse: admin only" on public.question_verse
  for all to authenticated using (private.is_content_admin()) with check (private.is_content_admin());
create policy "lesson_check: admin only" on public.lesson_check
  for all to authenticated using (private.is_content_admin()) with check (private.is_content_admin());
-- 8.3: writing pipeline only, like question
create policy "question_word: admin only" on public.question_word
  for all to authenticated using (private.is_content_admin()) with check (private.is_content_admin());
create policy "question_idiom: admin only" on public.question_idiom
  for all to authenticated using (private.is_content_admin()) with check (private.is_content_admin());

create policy "flavor_bible_character: players read published" on public.flavor_bible_character
  for select to authenticated using (private.is_content_admin() or private.flavor_is_published(cookie_dough_flavor_id));
create policy "flavor_bible_character: admin may write" on public.flavor_bible_character
  for all to authenticated using (private.is_content_admin()) with check (private.is_content_admin());
create policy "flavor_place: players read published" on public.flavor_place
  for select to authenticated using (private.is_content_admin() or private.flavor_is_published(cookie_dough_flavor_id));
create policy "flavor_place: admin may write" on public.flavor_place
  for all to authenticated using (private.is_content_admin()) with check (private.is_content_admin());

-- ---- Master lists ----------------------------------------------------------
create policy "translation: players read enabled, admin all" on public.translation
  for select to authenticated using (enabled or private.is_content_admin());
create policy "translation: admin may insert" on public.translation
  for insert to authenticated with check (private.is_content_admin());
create policy "translation: admin may update" on public.translation
  for update to authenticated using (private.is_content_admin()) with check (private.is_content_admin());

create policy "memory_verse: players read approved" on public.memory_verse
  for select to authenticated using (private.is_content_admin() or (approved and (cookie_dough_flavor_id is null or private.flavor_is_published(cookie_dough_flavor_id))));
create policy "memory_verse: admin may insert" on public.memory_verse
  for insert to authenticated with check (private.is_content_admin());
create policy "memory_verse: admin may update" on public.memory_verse
  for update to authenticated using (private.is_content_admin()) with check (private.is_content_admin());

create policy "memory_verse_text: players read for readable verses" on public.memory_verse_text
  for select to authenticated using (private.is_content_admin() or exists (
    select 1 from public.memory_verse mv join public.translation t on t.code = memory_verse_text.translation_code
    where mv.id = memory_verse_text.memory_verse_id and mv.approved and t.enabled
      and (mv.cookie_dough_flavor_id is null or private.flavor_is_published(mv.cookie_dough_flavor_id))));
create policy "memory_verse_text: admin may write" on public.memory_verse_text
  for all to authenticated using (private.is_content_admin()) with check (private.is_content_admin());

create policy "word: players read approved" on public.word
  for select to authenticated using (private.is_content_admin() or (approved and private.flavor_is_published(cookie_dough_flavor_id)));
create policy "word: admin may insert" on public.word
  for insert to authenticated with check (private.is_content_admin());
create policy "word: admin may update" on public.word
  for update to authenticated using (private.is_content_admin()) with check (private.is_content_admin());
create policy "word_verse: players read" on public.word_verse
  for select to authenticated using (private.is_content_admin() or exists (select 1 from public.word w where w.id = word_verse.word_id and w.approved and private.flavor_is_published(w.cookie_dough_flavor_id)));
create policy "word_verse: admin may write" on public.word_verse
  for all to authenticated using (private.is_content_admin()) with check (private.is_content_admin());

create policy "idiom: players read approved" on public.idiom
  for select to authenticated using (private.is_content_admin() or (approved and private.flavor_is_published(cookie_dough_flavor_id)));
create policy "idiom: admin may insert" on public.idiom
  for insert to authenticated with check (private.is_content_admin());
create policy "idiom: admin may update" on public.idiom
  for update to authenticated using (private.is_content_admin()) with check (private.is_content_admin());
create policy "idiom_verse: players read" on public.idiom_verse
  for select to authenticated using (private.is_content_admin() or exists (select 1 from public.idiom i where i.id = idiom_verse.idiom_id and i.approved and private.flavor_is_published(i.cookie_dough_flavor_id)));
create policy "idiom_verse: admin may write" on public.idiom_verse
  for all to authenticated using (private.is_content_admin()) with check (private.is_content_admin());

create policy "jesus_prophecy_link: players read approved" on public.jesus_prophecy_link
  for select to authenticated using (approved or private.is_content_admin());
create policy "jesus_prophecy_link: admin may insert" on public.jesus_prophecy_link
  for insert to authenticated with check (private.is_content_admin());
create policy "jesus_prophecy_link: admin may update" on public.jesus_prophecy_link
  for update to authenticated using (private.is_content_admin()) with check (private.is_content_admin());

-- ---- Catalogues and TV -----------------------------------------------------
create policy "look_catalogue: players read enabled" on public.look_catalogue
  for select to authenticated using (enabled or private.is_content_admin());
create policy "look_catalogue: admin may insert" on public.look_catalogue
  for insert to authenticated with check (private.is_content_admin());
create policy "look_catalogue: admin may update" on public.look_catalogue
  for update to authenticated using (private.is_content_admin()) with check (private.is_content_admin());
create policy "price: players read enabled" on public.price
  for select to authenticated using (enabled or private.is_content_admin());
create policy "price: admin may insert" on public.price
  for insert to authenticated with check (private.is_content_admin());
create policy "price: admin may update" on public.price
  for update to authenticated using (private.is_content_admin()) with check (private.is_content_admin());
create policy "badge: players read enabled" on public.badge
  for select to authenticated using (enabled or private.is_content_admin());
create policy "badge: admin may insert" on public.badge
  for insert to authenticated with check (private.is_content_admin());
create policy "badge: admin may update" on public.badge
  for update to authenticated using (private.is_content_admin()) with check (private.is_content_admin());
create policy "tv_program: players read allowed" on public.tv_program
  for select to authenticated using ((allowed and embeddable and available) or private.is_content_admin());
create policy "tv_program: admin may insert" on public.tv_program
  for insert to authenticated with check (private.is_content_admin());
create policy "tv_program: admin may update" on public.tv_program
  for update to authenticated using (private.is_content_admin()) with check (private.is_content_admin());
create policy "tv_pattern: players read" on public.tv_pattern
  for select to authenticated using (true);
create policy "tv_pattern: admin may write" on public.tv_pattern
  for all to authenticated using (private.is_content_admin()) with check (private.is_content_admin());
create policy "tv_schedule: players read" on public.tv_schedule
  for select to authenticated using (true);

create policy "app_setting: admin only" on public.app_setting
  for all to authenticated using (private.is_content_admin()) with check (private.is_content_admin());

-- ---- Player progress (write-denied, owner read) ----------------------------
create policy "dough_progress: owner may read" on public.dough_progress for select to authenticated using (profile_id = (select auth.uid()));
create policy "cookie_completion: owner may read" on public.cookie_completion for select to authenticated using (profile_id = (select auth.uid()));
create policy "flavor_finish: owner may read" on public.flavor_finish for select to authenticated using (profile_id = (select auth.uid()));
create policy "revealed_verse: owner may read" on public.revealed_verse for select to authenticated using (profile_id = (select auth.uid()));
create policy "resume_eligible: owner may read" on public.resume_eligible for select to authenticated using (profile_id = (select auth.uid()));
create policy "bake_grant: owner may read" on public.bake_grant for select to authenticated using (profile_id = (select auth.uid()));
create policy "lesson_answer: owner may read" on public.lesson_answer for select to authenticated using (profile_id = (select auth.uid()));
create policy "chip_ledger: owner may read" on public.chip_ledger for select to authenticated using (profile_id = (select auth.uid()));
create policy "owned_look: owner may read" on public.owned_look for select to authenticated using (profile_id = (select auth.uid()));

create policy "active_look: owner may read" on public.active_look for select to authenticated using (profile_id = (select auth.uid()));
create policy "active_look: owner may insert" on public.active_look for insert to authenticated with check (profile_id = (select auth.uid()));
create policy "active_look: owner may update" on public.active_look for update to authenticated using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));
create policy "active_look: owner may delete" on public.active_look for delete to authenticated using (profile_id = (select auth.uid()));

create policy "earned_badge: owner and profile viewers may read" on public.earned_badge
  for select to authenticated using (profile_id = (select auth.uid()) or not private.is_blocked_either_way(profile_id, (select auth.uid())));
create policy "game_best: owner and profile viewers may read" on public.game_best
  for select to authenticated using (profile_id = (select auth.uid()) or not private.is_blocked_either_way(profile_id, (select auth.uid())));

-- ---- Keepsake boxes and gifts ---------------------------------------------
create policy "keepsake_box: readers per can_read_box" on public.keepsake_box
  for select to authenticated using (private.can_read_box(id));
create policy "keepsake_box: owner may update unsent" on public.keepsake_box
  for update to authenticated
  using (profile_id = (select auth.uid()) and not private.box_is_sent(id))
  with check (profile_id = (select auth.uid()));
-- Deviation from Stage 5 §3 recorded for the owner: earned boxes are not deletable (their boxed_at and badges stand); gift drafts are
create policy "keepsake_box: owner may delete unsent gift drafts" on public.keepsake_box
  for delete to authenticated using (profile_id = (select auth.uid()) and is_gift and not private.box_is_sent(id));

create policy "gift_box_details: sender and recipient may read" on public.gift_box_details
  for select to authenticated using (private.can_read_box(box_id));
create policy "gift_box_details: sender may update before sending" on public.gift_box_details
  for update to authenticated
  using (sent_at is null and exists (select 1 from public.keepsake_box b where b.id = box_id and b.profile_id = (select auth.uid())))
  with check (exists (select 1 from public.keepsake_box b where b.id = box_id and b.profile_id = (select auth.uid())));

create policy "gift_delivery: sender may read" on public.gift_delivery
  for select to authenticated using (exists (select 1 from public.keepsake_box b where b.id = box_id and b.profile_id = (select auth.uid())));
create policy "gift_delivery: sender may update recipient before sending" on public.gift_delivery
  for update to authenticated
  using (exists (select 1 from public.keepsake_box b where b.id = box_id and b.profile_id = (select auth.uid())) and not private.box_is_sent(box_id))
  with check (exists (select 1 from public.keepsake_box b where b.id = box_id and b.profile_id = (select auth.uid())));

create policy "box_element_position: box readers may read" on public.box_element_position
  for select to authenticated using (private.can_read_box(box_id));
create policy "box_element_position: owner may write unsent" on public.box_element_position
  for all to authenticated
  using (exists (select 1 from public.keepsake_box b where b.id = box_id and b.profile_id = (select auth.uid())) and not private.box_is_sent(box_id))
  with check (exists (select 1 from public.keepsake_box b where b.id = box_id and b.profile_id = (select auth.uid())) and not private.box_is_sent(box_id));

create policy "box_crumb: box readers may read" on public.box_crumb
  for select to authenticated using (private.can_read_box(box_id));
create policy "box_crumb: player may leave one on a readable box" on public.box_crumb
  for insert to authenticated with check (profile_id = (select auth.uid()) and private.can_read_box(box_id));
create policy "box_crumb: player may remove own" on public.box_crumb
  for delete to authenticated using (profile_id = (select auth.uid()));

create policy "gift_card: sender and recipient may read" on public.gift_card
  for select to authenticated using (private.can_read_box(box_id));
-- gift_card_secret: no policy at all; only the two functions touch it

-- ---- Social, games, TV reminders ------------------------------------------
create policy "follow: both sides may read" on public.follow
  for select to authenticated using (follower_id = (select auth.uid()) or followed_id = (select auth.uid()));
create policy "follow: follower may insert" on public.follow
  for insert to authenticated with check (follower_id = (select auth.uid()));
create policy "follow: follower may delete" on public.follow
  for delete to authenticated using (follower_id = (select auth.uid()));

create policy "memorized_verse: owner may read" on public.memorized_verse for select to authenticated using (profile_id = (select auth.uid()));
create policy "memorized_verse: owner may insert" on public.memorized_verse for insert to authenticated with check (profile_id = (select auth.uid()));
create policy "memorized_verse: owner may delete" on public.memorized_verse for delete to authenticated using (profile_id = (select auth.uid()));

create policy "collected_question: owner may read" on public.collected_question for select to authenticated using (profile_id = (select auth.uid()));
create policy "collected_question: owner may insert" on public.collected_question for insert to authenticated with check (profile_id = (select auth.uid()));

create policy "game: players of the game may read" on public.game
  for select to authenticated using (private.is_in_game(id));
create policy "game: host may update status" on public.game
  for update to authenticated using (host_profile_id = (select auth.uid())) with check (host_profile_id = (select auth.uid()));

create policy "game_invite: host and invitee may read" on public.game_invite
  for select to authenticated using (from_profile_id = (select auth.uid()) or to_profile_id = (select auth.uid()));
create policy "game_invite: host may insert" on public.game_invite
  for insert to authenticated with check (from_profile_id = (select auth.uid()));

create policy "game_player: players of the game may read" on public.game_player
  for select to authenticated using (private.is_in_game(game_id));

create policy "game_answer: own while playing, all when ended" on public.game_answer
  for select to authenticated
  using (profile_id = (select auth.uid())
         or (private.is_in_game(game_id) and exists (select 1 from public.game g where g.id = game_id and g.status = 'ended')));

create policy "tv_reminder: owner may read" on public.tv_reminder for select to authenticated using (profile_id = (select auth.uid()));
create policy "tv_reminder: owner may insert" on public.tv_reminder for insert to authenticated with check (profile_id = (select auth.uid()));
create policy "tv_reminder: owner may delete" on public.tv_reminder for delete to authenticated using (profile_id = (select auth.uid()));

-- claim_attempt, storage_cleanup_queue, blocked_email_domain, rate_flag: no player policy.
create policy "blocked_email_domain: admin may write" on public.blocked_email_domain
  for all to authenticated using (private.is_content_admin()) with check (private.is_content_admin());
create policy "rate_flag: admin may read" on public.rate_flag
  for select to authenticated using (private.is_content_admin());

-- ---------------------------------------------------------------------------
-- 20. Grants. Revoke the defaults, grant what the policies need, hide the text
--     columns of cookie_lesson from players (B4), hide private schema.
-- ---------------------------------------------------------------------------
revoke all on all tables in schema public from anon, authenticated;
revoke all on all functions in schema public from anon, authenticated, public;
revoke all on schema private from anon, authenticated, public;
revoke all on all functions in schema private from anon, authenticated, public;
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on functions from anon, authenticated, public;
alter default privileges in schema private revoke all on functions from anon, authenticated, public;

grant usage on schema public to anon, authenticated;
-- Policies and the invoker views call these read-only helpers as the signed-in role; nothing else in private is callable
grant usage on schema private to anon, authenticated;
grant execute on function
  private.setting(text), private.setting_int(text), private.tombstone_id(), private.chicago_today(),
  private.is_content_admin(), private.is_blocked_either_way(uuid, uuid), private.is_friend(uuid, uuid),
  private.is_in_game(uuid), private.entitlement(uuid), private.is_plus(uuid), private.flavor_is_published(uuid),
  private.can_read_box(uuid), private.box_is_sent(uuid), private.deletion_pending(uuid), private.safe_uuid(text)
to anon, authenticated;
-- Question Rules checks run as the content admin: the CHECK constraints (word_count) and the invoker triggers and gates
-- call these read-only helpers. None writes; each reads under the caller's RLS.
grant execute on function
  private.word_count(text), private.norm(text), private.lesson_recipe(uuid), private.flavor_recipe(uuid),
  private.in_lesson_rows(uuid, uuid), private.ref_book_name(text, integer), private.is_pending_replacement(public.question),
  private.checklist_lines(text), private.checklist_line_applies(text, text), private.flavor_lesson_count_ok(uuid, integer),
  private.is_shipped(uuid), private.live_questions(uuid), private.lesson_terms(uuid),
  private.w13_norm(text), private.w13_carries(text, text),
  private.lesson_content_check(uuid), private.flavor_content_check(uuid)
to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;   -- RLS decides per row
revoke all on public.gift_card_secret, public.claim_attempt, public.storage_cleanup_queue from authenticated;
revoke insert, update, delete on public.rate_flag from authenticated;
revoke all on public.lesson_open_log from authenticated;
revoke insert, update, delete on public.psalm_heading from authenticated;   -- R24: reading layer, select only (RLS decides)
grant select on public.chip_balance, public.daily_bakes, public.entitlement to authenticated;

-- Player-callable functions
grant execute on function
  public.open_flavor(uuid), public.open_cookie_lesson(uuid), public.answer_question(uuid, uuid, jsonb),
  public.save_resume_point(uuid, jsonb), public.complete_cookie_lesson(uuid), public.mark_flavor_tasted(uuid),
  public.launch_box(uuid, uuid, text, text, text, text, jsonb),
  public.create_gift_box(uuid, uuid, text, text, text, text, jsonb, text, date, text, text, text, jsonb, uuid, text, text),
  public.send_gift_box(uuid), public.claim_gift_box_as_me(text), public.attach_gift_card(uuid, text, numeric, text),
  public.reveal_gift_card(uuid), public.buy_look(uuid), public.repair_streak(), public.create_game(text),
  public.accept_invite(uuid, boolean), public.answer_game_question(uuid, uuid, uuid, jsonb, integer), public.finish_game(uuid),
  public.my_collected_questions(), public.prepare_account_deletion(), public.grant_complimentary_plan(uuid, timestamptz, text),
  public.close_unanswered_lesson(uuid), public.flavor_lessons(uuid), public.register_push_token(text, text), public.start_plus_trial()
to authenticated;
-- Secret key only (the gift-view Edge Function, receipt verification, ad callback, scheduled jobs). Nothing for anon.
grant execute on function
  public.claim_gift_box(text, inet), public.record_purchase(uuid, text, numeric, text, text, integer, timestamptz),
  public.grant_ad_bake(uuid), public.clear_stale_gift_contacts(), public.materialise_tv_schedule(), public.prune_claim_attempts()
to service_role;
-- Auth hook: Supabase Auth calls it as supabase_auth_admin; the function is security definer, so no table grant is needed
grant usage on schema public to supabase_auth_admin;
grant execute on function public.before_user_created_hook(jsonb) to supabase_auth_admin;

-- ---------------------------------------------------------------------------
-- 21. Storage buckets and policies (Stage 5 section 5, A5, A18)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('avatars',        'avatars',        false, 2097152,  array['image/jpeg']),
  ('box-photos',     'box-photos',     false, 8388608,  array['image/jpeg','image/png','image/webp']),
  ('box-audio',      'box-audio',      false, 10485760, array['audio/mpeg','audio/mp4','audio/aac','audio/webm']),
  ('box-signatures', 'box-signatures', false, 1048576,  array['image/png','image/svg+xml'])
on conflict (id) do nothing;

-- avatars: <profile id>/avatar.jpg; owner writes; any player who may read the profile reads
create policy "avatars: owner may upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and name = (select auth.uid())::text || '/avatar.jpg');
create policy "avatars: owner may update" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatars: owner may delete" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatars: profile readers may read" on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and not private.is_blocked_either_way(private.safe_uuid((storage.foldername(name))[1]), (select auth.uid())));

-- box files: <profile id>/<box id>/... (owner, unsent) and gifts/<box id>/... (moved by the deletion Edge Function)
create policy "box files: owner may upload to an unsent gift box" on storage.objects for insert to authenticated
  with check (bucket_id in ('box-photos','box-audio','box-signatures')
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (select 1 from public.gift_box_details d join public.keepsake_box b on b.id = d.box_id
                where b.id = private.safe_uuid((storage.foldername(name))[2]) and b.profile_id = (select auth.uid()) and d.sent_at is null));
create policy "box files: owner may update unsent" on storage.objects for update to authenticated
  using (bucket_id in ('box-photos','box-audio','box-signatures')
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and not private.box_is_sent(private.safe_uuid((storage.foldername(name))[2])));
create policy "box files: owner may delete unsent" on storage.objects for delete to authenticated
  using (bucket_id in ('box-photos','box-audio','box-signatures')
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and not private.box_is_sent(private.safe_uuid((storage.foldername(name))[2])));
create policy "box files: box readers may read" on storage.objects for select to authenticated
  using (bucket_id in ('box-photos','box-audio','box-signatures')
    and private.can_read_box(private.safe_uuid((storage.foldername(name))[2])));   -- both <profile id>/<box id>/ and gifts/<box id>/ carry the box id second

-- ---------------------------------------------------------------------------
-- 22. Seed: the tombstone, KJV, prices the functions depend on
-- ---------------------------------------------------------------------------
insert into public.translation (code, name, licence_note, enabled) values ('KJV', 'King James Version', 'Public domain', true)
on conflict (code) do nothing;

-- The tombstone. profile.id references auth.users, so a system auth user stands behind it: banned for ever,
-- no password, no sign-in. The sign-up trigger creates its Profile; the update marks it as the system row.
-- (Check the auth.users column list against the live project at install; Supabase manages that schema.)
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
                        raw_app_meta_data, raw_user_meta_data, created_at, updated_at, banned_until,
                        confirmation_token, recovery_token, email_change_token_new, email_change,
                        email_change_token_current, phone_change, phone_change_token, reauthentication_token)
values ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
        'deleted-player@system.invalid', '', now(),
        '{"provider":"system","providers":[]}'::jsonb, '{"full_name":"Deleted player"}'::jsonb, now(), now(), 'infinity',
        '', '', '', '', '', '', '', '')   -- GoTrue's text columns are left empty, not NULL (review F11); confirm the column list at install
on conflict (id) do nothing;
update public.profile set display_name = 'Deleted player', is_system = true
 where id = '00000000-0000-0000-0000-000000000001' and not is_system;

insert into public.price (item, amount, price_in_chips, price_in_usd) values
  ('bake', 1, 40, null),
  ('streak repair', 1, 300, null)
on conflict (item, amount) do nothing;
