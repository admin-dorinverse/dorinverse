-- ===========================================================================
-- Character cards (owner ruling, 2026-10-28).
--   * The written content of a character card. Being in this table = revealable.
--   * Everything else on the card is read from the reading layer: verses
--     (verse_bible_character, bible_character.verse_count), places (verse_place,
--     plus each moment's place) and also known as (bible_character.also_called,
--     unless also_known_as overrides it).
--   * The reveal is not stored: it is the first flavor the player finishes
--     (flavor_finish.all_cookies_done_at) that lists the character
--     (flavor_bible_character).
--   * Kept apart from bible_character, which a Theographic reload overwrites.
-- ===========================================================================

create table public.character_card (
  bible_character_id uuid primary key references public.bible_character (id) on delete restrict,
  name               text not null check (btrim(name) <> ''),
  name_tag           text check (btrim(name_tag) <> ''),   -- shown with the name when the name is shared ("of Tishbe")
  also_known_as      text[],                                -- null: use bible_character.also_called; '{}': show none
  summary            text not null check (btrim(summary) <> ''),
  -- 2–5 of {title, description, passage, place_id?}; passage in the 2.12 reference form ("Genesis 22:1–14")
  key_moments        jsonb not null check (jsonb_typeof(key_moments) = 'array'
                                           and jsonb_array_length(key_moments) between 2 and 5),
  status             text not null default 'draft' check (status in ('draft','published')),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
comment on table public.character_card is 'Written content of a revealable character card. Players read published rows; the content admin writes.';

-- Each key moment: non-blank title, description and passage; place_id, when given, is a place.
create or replace function private.character_card_check() returns trigger
language plpgsql set search_path = '' as $$
declare m jsonb;
begin
  for m in select * from jsonb_array_elements(new.key_moments) loop
    if jsonb_typeof(m) <> 'object'
       or nullif(btrim(m ->> 'title'), '') is null
       or nullif(btrim(m ->> 'description'), '') is null
       or nullif(btrim(m ->> 'passage'), '') is null then
      raise exception 'character_card %: each key moment needs a title, description and passage', new.bible_character_id;
    end if;
    if m ? 'place_id' and m ->> 'place_id' is not null
       and not exists (select 1 from public.place p where p.id = private.safe_uuid(m ->> 'place_id')) then
      raise exception 'character_card %: key moment place % is not a place', new.bible_character_id, m ->> 'place_id';
    end if;
  end loop;
  new.updated_at := now();
  return new;
end $$;
create trigger character_card_check before insert or update on public.character_card
  for each row execute function private.character_card_check();

alter table public.character_card enable row level security;

create policy "character_card: players read published" on public.character_card
  for select to authenticated using (status = 'published' or private.is_content_admin());
create policy "character_card: admin may write" on public.character_card
  for all to authenticated using (private.is_content_admin()) with check (private.is_content_admin());

-- No default client grants: new tables are granted here (RLS decides per row)
grant select, insert, update, delete on public.character_card to authenticated;
revoke all on function private.character_card_check() from anon, authenticated, public;
