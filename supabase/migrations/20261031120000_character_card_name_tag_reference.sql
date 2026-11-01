-- Every name tag is backed by scripture (owner ruling, 2026-10-31): name_tag_reference is the KJV passage
-- whose words support the tag ("of Arimathaea" → "Mark 15:43"). A card has both or neither.
-- NOT VALID: the cards already loaded get their references from the next card load, which rewrites every row.
alter table public.character_card add column name_tag_reference text;
alter table public.character_card add constraint character_card_name_tag_reference_check
  check ((name_tag is null) = (name_tag_reference is null)
         and (name_tag_reference is null or btrim(name_tag_reference) <> '')) not valid;
comment on column public.character_card.name_tag_reference is
  'The KJV passage whose words support name_tag, e.g. ''Mark 15:43''. Set exactly when name_tag is.';

-- Simon of Cyrene and Philemon join Gilead as cards with one key moment: scripture gives Simon only the cross
-- (Mark 15:21; Luke 23:26) and Philemon only Paul's letter about Onesimus. Owner rulings, 2026-10-31.
create or replace function private.character_card_check() returns trigger
language plpgsql set search_path = '' as $$
declare m jsonb;
begin
  if jsonb_array_length(new.key_moments) < 2
     and (select lookup from public.bible_character where id = new.bible_character_id) not in ('gilead_1318', 'simon_2749', 'philemon_2342') then
    raise exception 'character_card %: 2–5 key moments (only Gilead, Simon of Cyrene and Philemon may have one)', new.bible_character_id;
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
