-- ===========================================================================
-- Character cards (owner ruling, 2026-10-28).
--   * Everything a character card shows, stored on the card: the written
--     content (name, tag, summary, key moments) and a copy of the reference
--     data it uses (verses, places, verse count, also known as), taken from the
--     reading layer when the card is loaded. Being in character_card = revealable.
--   * The copy is the card's own: a Theographic reload never changes a card, and
--     a wrong reference link can be fixed on the card alone.
--   * The reveal is not stored: it is the first flavor the player finishes
--     (flavor_finish.all_cookies_done_at) that lists the character
--     (flavor_bible_character).
--   * Nothing is written into bible_character, which a Theographic reload overwrites.
-- ===========================================================================

create table public.character_card (
  bible_character_id uuid primary key references public.bible_character (id) on delete restrict,
  name               text not null check (btrim(name) <> ''),
  name_tag           text check (btrim(name_tag) <> ''),   -- shown with the name when the name is shared ("son of Jacob")
  also_known_as      text[] not null default '{}',          -- other names the KJV uses for them
  summary            text not null check (btrim(summary) <> ''),
  -- 2–5 of {title, description, passage, place_id?}; passage in the 2.12 reference form ("Genesis 22:1–14")
  key_moments        jsonb not null check (jsonb_typeof(key_moments) = 'array'
                                           and jsonb_array_length(key_moments) between 2 and 5),
  verse_count        integer not null default 0 check (verse_count >= 0),   -- "named in N verses": rows in character_card_verse
  status             text not null default 'draft' check (status in ('draft','published')),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
comment on table public.character_card is 'A revealable character card: written content plus its own copy of the reference data it shows. Players read published rows; the content admin writes.';

-- The verses that name the character: the card's verse list
create table public.character_card_verse (
  bible_character_id uuid not null references public.character_card (bible_character_id) on delete cascade,
  verse_id           uuid not null references public.verse (id) on delete restrict,
  primary key (bible_character_id, verse_id)
);

-- The card's places: those named in its verses, and each key moment's place
create table public.character_card_place (
  bible_character_id uuid not null references public.character_card (bible_character_id) on delete cascade,
  place_id           uuid not null references public.place (id) on delete restrict,
  verse_count        integer not null default 0 check (verse_count >= 0),   -- card verses naming the place (order by this)
  primary key (bible_character_id, place_id)
);

create index character_card_verse_verse on public.character_card_verse (verse_id);
create index character_card_place_place on public.character_card_place (place_id);

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

create or replace function private.character_card_is_published(p_bible_character_id uuid) returns boolean
language sql stable set search_path = '' as $$
  select exists (select 1 from public.character_card c where c.bible_character_id = p_bible_character_id and c.status = 'published')
$$;

alter table public.character_card       enable row level security;
alter table public.character_card_verse enable row level security;
alter table public.character_card_place enable row level security;

create policy "character_card: players read published" on public.character_card
  for select to authenticated using (status = 'published' or private.is_content_admin());
create policy "character_card: admin may write" on public.character_card
  for all to authenticated using (private.is_content_admin()) with check (private.is_content_admin());
create policy "character_card_verse: players read published" on public.character_card_verse
  for select to authenticated using (private.is_content_admin() or private.character_card_is_published(bible_character_id));
create policy "character_card_verse: admin may write" on public.character_card_verse
  for all to authenticated using (private.is_content_admin()) with check (private.is_content_admin());
create policy "character_card_place: players read published" on public.character_card_place
  for select to authenticated using (private.is_content_admin() or private.character_card_is_published(bible_character_id));
create policy "character_card_place: admin may write" on public.character_card_place
  for all to authenticated using (private.is_content_admin()) with check (private.is_content_admin());

-- No default client grants: new tables and functions are granted here (RLS decides per row)
grant select, insert, update, delete on public.character_card, public.character_card_verse, public.character_card_place
  to authenticated;
revoke all on function private.character_card_check() from anon, authenticated, public;
revoke all on function private.character_card_is_published(uuid) from anon, authenticated, public;
grant execute on function private.character_card_is_published(uuid) to authenticated;
