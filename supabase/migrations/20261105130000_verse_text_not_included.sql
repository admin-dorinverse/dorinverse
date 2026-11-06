-- Verses a translation leaves out (e.g. Acts 8:37 in the BSB) get a row instead of none (owner ruling, 2026-11-05).
-- Their text is "Not included in this translation." and included = false, so lesson tools can skip them.
alter table public.verse_text add column included boolean not null default true;
alter table public.verse_text add constraint verse_text_not_included_text
  check (included or text = 'Not included in this translation.');
comment on column public.verse_text.included is
  'false: the translation leaves this verse out; text is "Not included in this translation."';
comment on table public.verse_text is
  'Whole-Bible translations other than KJV (BSB for lessons, WEB for reference), one row for each of the 31,102 verses. KJV stays in public.verse.text. A verse the translation leaves out has included = false.';
