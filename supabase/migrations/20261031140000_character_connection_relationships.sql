-- ===========================================================================
-- Character connections, redrawn (owner ruling, 2026-10-31).
--   * Links are decided from the whole story between two people, not one verse.
--     The standard is scripts/character-web/link-types.md: 25 labels, each a fact
--     about the pair (Family, Loved, Served, Betrayed...).
--   * A pair may have several links, one per label: Judas and Jesus are apostle,
--     followed and betrayed.
--   * A link may cite several passages. They move to character_connection_passage:
--     'proof' passages for every link, plus 'fulfilled' passages for a prophecy.
--   * The rows are rebuilt from links.json by scripts/character-web/load.mjs, so
--     the old ones are cleared here rather than mapped to the new labels.
-- ===========================================================================

delete from public.character_connection;

drop trigger character_connection_check on public.character_connection;
drop function private.character_connection_check();
alter table public.character_connection
  drop column from_verse_id, drop column to_verse_id,
  drop column fulfilled_from_verse_id, drop column fulfilled_to_verse_id;

alter table public.character_connection drop constraint character_connection_type_check;
alter table public.character_connection add constraint character_connection_type_check
  check (type in ('family','married','loved','helped','worked_together','counseled','apostle','followed','served',
                  'anointed','blessed','rebuked','enemies','betrayed','rivals','healed',
                  'friends','covenant','judged','put_to_death','saved','deceived','prophesied','prophecy','crossed_paths'));
comment on column public.character_connection.from_card_id is
  'For a prophecy, the one who spoke it; for other labels, whoever the why sentence names first.';

-- One link per pair per label, whichever way round it was stored
drop index public.character_connection_pair;
create unique index character_connection_pair_type on public.character_connection
  (least(from_card_id, to_card_id), greatest(from_card_id, to_card_id), type);

create or replace function private.character_connection_touch() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;
create trigger character_connection_touch before update on public.character_connection
  for each row execute function private.character_connection_touch();

create table public.character_connection_passage (
  connection_id uuid     not null references public.character_connection (id) on delete cascade,
  kind          text     not null check (kind in ('proof', 'fulfilled')),
  position      smallint not null check (position >= 1),
  from_verse_id uuid     not null references public.verse (id) on delete restrict,
  to_verse_id   uuid     not null references public.verse (id) on delete restrict,
  primary key (connection_id, kind, position)
);
comment on table public.character_connection_passage is
  'The KJV passages behind a character connection, in order: proof passages, and for a prophecy the passages where it was fulfilled.';

-- Each passage stays in one book and runs forward.
create or replace function private.character_connection_passage_check() returns trigger
language plpgsql set search_path = '' as $$
declare f record; t record;
begin
  select book_id, sequence into f from public.verse where id = new.from_verse_id;
  select book_id, sequence into t from public.verse where id = new.to_verse_id;
  if f.book_id <> t.book_id or f.sequence > t.sequence then
    raise exception 'character_connection_passage %/%: passage must stay in one book and run forward',
      new.connection_id, new.position using errcode = '23514';
  end if;
  return new;
end $$;
create trigger character_connection_passage_check before insert or update on public.character_connection_passage
  for each row execute function private.character_connection_passage_check();

alter table public.character_connection_passage enable row level security;

-- A passage is readable exactly when its connection is (the connection's own policy applies in the subquery)
create policy "character_connection_passage: read with its connection" on public.character_connection_passage
  for select to authenticated using (exists (select 1 from public.character_connection c where c.id = connection_id));
create policy "character_connection_passage: admin may write" on public.character_connection_passage
  for all to authenticated using (private.is_content_admin()) with check (private.is_content_admin());

-- No default client grants: new tables and functions are granted here (RLS decides per row)
grant select, insert, update, delete on public.character_connection_passage to authenticated;
revoke all on function private.character_connection_touch() from anon, authenticated, public;
revoke all on function private.character_connection_passage_check() from anon, authenticated, public;
