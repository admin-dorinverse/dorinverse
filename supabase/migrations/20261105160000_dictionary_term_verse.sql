-- Every BSB verse each BSB Eligible Easton's term is printed in (owner ruling, 2026-11-05), so the
-- lesson tools can list a passage's words without matching text themselves.
--   * One row per term and verse. Easton's splits many entries into numbered senses (Grace has 7
--     dictionary_entry rows), so the verses are kept per term, not per row.
--   * Rows come from scripts/translations/easton-bsb.mjs, matched the same way as bsb_eligible.
create table public.dictionary_term_verse (
  term     text not null check (btrim(term) <> ''),
  verse_id uuid not null references public.verse (id) on delete restrict,
  primary key (term, verse_id)
);
comment on table public.dictionary_term_verse is
  'BSB verses each BSB Eligible Easton''s term is printed in. term matches dictionary_entry.term. Set by scripts/translations/easton-bsb.mjs.';
create index dictionary_term_verse_verse on public.dictionary_term_verse (verse_id);

-- Planning aid, like dictionary_entry: only the content admin reads it; nobody but the server writes
alter table public.dictionary_term_verse enable row level security;
create policy "dictionary_term_verse: admin may read" on public.dictionary_term_verse
  for select to authenticated using (private.is_content_admin());
grant select on public.dictionary_term_verse to authenticated;
