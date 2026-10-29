-- No family tree (owner ruling, 2026-10-29): too many families in scripture are broken up to draw one.
-- The parent columns and the partner table came from the Theographic load and nothing reads them.
-- The character web (character_connection) links the cards instead; build-load-sql.mjs no longer writes these.
alter table public.bible_character drop column father_id, drop column mother_id;
drop table public.bible_character_partner;
