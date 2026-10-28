-- character_card_place.verse_count read as the place's own verse count. It is the number of the
-- character's verses that also name the place (0 for a place only a key moment gives).
alter table public.character_card_place rename column verse_count to verses_naming_both;
comment on column public.character_card_place.verses_naming_both is
  'How many of the character''s verses also name this place (0: only a key moment gives it). Order places by this.';
