-- ===========================================================================
-- Character connections (owner ruling, 2026-10-29).
--   * The family tree is dropped. In its place, a web of links between character
--     cards, each proved by a KJV passage.
--   * One row per pair of cards. A link has one type and a one-sentence reason.
--     Its passage is a verse range, like lesson_passage.
--   * A prophecy link also carries the passage where the prophecy was fulfilled.
--     from_card is the prophet; to_card is the person it came true in. For every
--     other type the order of the two cards carries no meaning.
--   * Players see a link only when it and both of its cards are published.
--   * The family-tree data (bible_character.father_id / mother_id and
--     bible_character_partner) is dropped in the next migration.
-- ===========================================================================

create table public.character_connection (
  id                      uuid primary key default gen_random_uuid(),
  from_card_id            uuid not null references public.character_card (bible_character_id) on delete cascade,
  to_card_id              uuid not null references public.character_card (bible_character_id) on delete cascade,
  type                    text not null check (type in ('family','marriage','friends','teacher','leader','enemies','message','story','prophecy')),
  why                     text not null check (btrim(why) <> ''),          -- one plain sentence: what happened between them
  from_verse_id           uuid not null references public.verse (id) on delete restrict,   -- the passage that proves the link
  to_verse_id             uuid not null references public.verse (id) on delete restrict,
  fulfilled_from_verse_id uuid references public.verse (id) on delete restrict,            -- prophecy only: where it came true
  fulfilled_to_verse_id   uuid references public.verse (id) on delete restrict,
  status                  text not null default 'draft' check (status in ('draft','published')),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  check (from_card_id <> to_card_id),
  check ((type = 'prophecy') = (fulfilled_from_verse_id is not null and fulfilled_to_verse_id is not null)),
  check ((fulfilled_from_verse_id is null) = (fulfilled_to_verse_id is null))
);
comment on table public.character_connection is 'A scripture-proved link between two character cards: the character web. Players read published rows whose cards are both published; the content admin writes.';
comment on column public.character_connection.from_card_id is 'For a prophecy, the one who spoke it. For other types, either card of the pair.';
comment on column public.character_connection.fulfilled_from_verse_id is 'Prophecy only: first verse of the passage where it came true.';

-- One link per pair, whichever way round it was stored
create unique index character_connection_pair on public.character_connection
  (least(from_card_id, to_card_id), greatest(from_card_id, to_card_id));
create index character_connection_from on public.character_connection (from_card_id);
create index character_connection_to on public.character_connection (to_card_id);

-- Each passage stays in one book and runs forward.
create or replace function private.character_connection_check() returns trigger
language plpgsql set search_path = '' as $$
declare f record; t record;
begin
  select book_id, sequence into f from public.verse where id = new.from_verse_id;
  select book_id, sequence into t from public.verse where id = new.to_verse_id;
  if f.book_id <> t.book_id or f.sequence > t.sequence then
    raise exception 'character_connection %: passage must stay in one book and run forward', new.id using errcode = '23514';
  end if;
  if new.fulfilled_from_verse_id is not null then
    select book_id, sequence into f from public.verse where id = new.fulfilled_from_verse_id;
    select book_id, sequence into t from public.verse where id = new.fulfilled_to_verse_id;
    if f.book_id <> t.book_id or f.sequence > t.sequence then
      raise exception 'character_connection %: fulfillment passage must stay in one book and run forward', new.id using errcode = '23514';
    end if;
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger character_connection_check before insert or update on public.character_connection
  for each row execute function private.character_connection_check();

alter table public.character_connection enable row level security;

create policy "character_connection: players read published" on public.character_connection
  for select to authenticated using (private.is_content_admin() or (status = 'published'
    and private.character_card_is_published(from_card_id) and private.character_card_is_published(to_card_id)));
create policy "character_connection: admin may write" on public.character_connection
  for all to authenticated using (private.is_content_admin()) with check (private.is_content_admin());

-- No default client grants: new tables and functions are granted here (RLS decides per row)
grant select, insert, update, delete on public.character_connection to authenticated;
revoke all on function private.character_connection_check() from anon, authenticated, public;
