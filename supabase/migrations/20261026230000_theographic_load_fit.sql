-- ===========================================================================
-- Theographic load fit (owner ruling, 2026-10-26).
--   * event.sort_key holds the source's fractional key; event.start_date keeps
--     the source date as written (a year like -4003, or a day like 0030-05-01).
--   * An Easton's entry can name several characters and several places, so the
--     single links on dictionary_entry move to link tables.
--   * bible_character.also_called and event_place (the event's locations) are
--     the only other source fields carried. Entries without text are not loaded.
-- Reading layer: read-only in the app, every delete is block (R24).
-- ===========================================================================

alter table public.event alter column sort_key type numeric;
alter table public.event add column start_date text;   -- source date as written; start_year is its year

alter table public.bible_character add column also_called text[];   -- other names the source records ("Ner,Jehiel")

create table public.event_place (
  event_id uuid not null references public.event (id) on delete restrict,
  place_id uuid not null references public.place (id) on delete restrict,
  primary key (event_id, place_id)
);

alter table public.dictionary_entry drop column bible_character_id, drop column place_id;

create table public.dictionary_entry_bible_character (
  dictionary_entry_id uuid not null references public.dictionary_entry (id) on delete restrict,
  bible_character_id  uuid not null references public.bible_character (id) on delete restrict,
  primary key (dictionary_entry_id, bible_character_id)
);

create table public.dictionary_entry_place (
  dictionary_entry_id uuid not null references public.dictionary_entry (id) on delete restrict,
  place_id            uuid not null references public.place (id) on delete restrict,
  primary key (dictionary_entry_id, place_id)
);

create index event_place_place                     on public.event_place (place_id);
create index dictionary_entry_bible_character_char on public.dictionary_entry_bible_character (bible_character_id);
create index dictionary_entry_place_place          on public.dictionary_entry_place (place_id);

-- RLS: as with the rest of the reading layer; dictionary links follow dictionary_entry (content admin only)
alter table public.event_place                      enable row level security;
alter table public.dictionary_entry_bible_character enable row level security;
alter table public.dictionary_entry_place           enable row level security;

create policy "event_place: any player may read" on public.event_place
  for select to authenticated using (true);
create policy "dictionary_entry_bible_character: admin may read" on public.dictionary_entry_bible_character
  for select to authenticated using (private.is_content_admin());
create policy "dictionary_entry_place: admin may read" on public.dictionary_entry_place
  for select to authenticated using (private.is_content_admin());

-- No default client grants: new tables are granted here (select only; RLS decides)
grant select on public.event_place, public.dictionary_entry_bible_character, public.dictionary_entry_place to authenticated;
