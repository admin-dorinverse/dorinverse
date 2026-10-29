-- A card may have a single key moment only when scripture gives the person one (owner ruling, 2026-10-29).
-- The only such card is Gilead, Jephthah's father (Judges 11:1–3). Every other card keeps 2–5.
alter table public.character_card drop constraint character_card_key_moments_check;
alter table public.character_card add constraint character_card_key_moments_check
  check (jsonb_typeof(key_moments) = 'array' and jsonb_array_length(key_moments) between 1 and 5);

create or replace function private.character_card_check() returns trigger
language plpgsql set search_path = '' as $$
declare m jsonb;
begin
  if jsonb_array_length(new.key_moments) < 2
     and (select lookup from public.bible_character where id = new.bible_character_id) is distinct from 'gilead_1318' then
    raise exception 'character_card %: 2–5 key moments (only Gilead may have one)', new.bible_character_id;
  end if;
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
