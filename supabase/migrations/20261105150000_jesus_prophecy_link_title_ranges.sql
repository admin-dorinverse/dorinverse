-- Jesus Prophecy Links hold whole passages and a title (owner ruling, 2026-11-05).
--   * title: the link's plain name ("Born in Bethlehem"). Two links from one prophecy share it.
--   * prophecy_to_verse_id / fulfillment_to_verse_id: the last verse of each passage, so a link holds
--     "Matthew 2:5 to 2:6", not only its first verse. A one-verse passage repeats the first verse.
--   * Rows come from scripts/dough-maker/data/prophecy-links.json, loaded by scripts/dough-maker/prophecy-links.mjs.
alter table public.jesus_prophecy_link
  add column title                   text check (btrim(title) <> ''),
  add column prophecy_to_verse_id    uuid references public.verse (id) on delete restrict,
  add column fulfillment_to_verse_id uuid references public.verse (id) on delete restrict;
comment on column public.jesus_prophecy_link.prophecy_verse_id is 'First verse of the prophecy passage.';
comment on column public.jesus_prophecy_link.prophecy_to_verse_id is 'Last verse of the prophecy passage (same as the first for one verse).';
comment on column public.jesus_prophecy_link.fulfillment_verse_id is 'First verse of the fulfillment passage.';
comment on column public.jesus_prophecy_link.fulfillment_to_verse_id is 'Last verse of the fulfillment passage (same as the first for one verse).';

-- Each passage stays in one book and runs forward.
create or replace function private.jesus_prophecy_link_range_check() returns trigger
language plpgsql set search_path = '' as $$
declare f record; t record;
begin
  if new.prophecy_to_verse_id is not null then
    select book_id, sequence into f from public.verse where id = new.prophecy_verse_id;
    select book_id, sequence into t from public.verse where id = new.prophecy_to_verse_id;
    if f.book_id <> t.book_id or f.sequence > t.sequence then
      raise exception 'jesus_prophecy_link %: prophecy passage must stay in one book and run forward', new.id using errcode = '23514';
    end if;
  end if;
  if new.fulfillment_to_verse_id is not null then
    select book_id, sequence into f from public.verse where id = new.fulfillment_verse_id;
    select book_id, sequence into t from public.verse where id = new.fulfillment_to_verse_id;
    if f.book_id <> t.book_id or f.sequence > t.sequence then
      raise exception 'jesus_prophecy_link %: fulfillment passage must stay in one book and run forward', new.id using errcode = '23514';
    end if;
  end if;
  return new;
end $$;
create trigger jesus_prophecy_link_range_check before insert or update on public.jesus_prophecy_link
  for each row execute function private.jesus_prophecy_link_range_check();
revoke all on function private.jesus_prophecy_link_range_check() from anon, authenticated, public;
