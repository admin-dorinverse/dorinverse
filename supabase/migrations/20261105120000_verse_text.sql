-- ===========================================================================
-- Full-Bible translations (owner ruling, 2026-11-05).
--   * Lessons now use the BSB. KJV (public.verse.text) and WEB stay for reference
--     and verse memory.
--   * verse_text holds a whole translation, one row per verse, keyed to public.verse.
--     A verse the translation leaves out (e.g. Acts 8:37 in the BSB) has no row.
--   * Psalm titles stay inside verse 1, as the source files print them.
--   * Loaded by scripts/translations/load.mjs as postgres; read-only in the app (R24).
-- ===========================================================================

create table public.verse_text (
  verse_id         uuid not null references public.verse (id) on delete restrict,
  translation_code text not null references public.translation (code) on delete restrict,
  text             text not null check (btrim(text) <> ''),
  primary key (verse_id, translation_code)
);
comment on table public.verse_text is
  'Whole-Bible translations other than KJV (BSB for lessons, WEB for reference), one row per verse. KJV stays in public.verse.text. Verses a translation omits have no row.';
create index verse_text_translation on public.verse_text (translation_code);

comment on table public.verse is
  '31,102 verses in KJV numbering; the unit everything points at. text is the KJV; other full translations live in verse_text, memory-verse texts in memory_verse_text.';
comment on column public.verse.text is 'KJV text. BSB and WEB are in verse_text.';

insert into public.translation (code, name, licence_note, enabled) values
('BSB', 'Berean Standard Bible',
 'The Holy Bible, Berean Standard Bible, BSB is produced in cooperation with Bible Hub, Discovery Bible, OpenBible.info, and the Berean Bible Translation Committee. This text of God’s Word has been dedicated to the public domain.', true),
('WEB', 'World English Bible', 'Public domain. "World English Bible" is a trademark of eBible.org.', true)
on conflict (code) do nothing;

-- Bible reference layer: any player may read; nobody but the server writes (R24)
alter table public.verse_text enable row level security;
create policy "verse_text: any player may read" on public.verse_text
  for select to authenticated using (true);

-- No default client grants: new tables are granted here (RLS decides per row)
grant select on public.verse_text to authenticated;
