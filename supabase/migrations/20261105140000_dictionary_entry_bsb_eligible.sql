-- Easton's entries whose term the BSB prints (owner ruling, 2026-11-05: lessons use the BSB).
-- Set by scripts/translations/easton-bsb.mjs; see that script for how a term is matched.
alter table public.dictionary_entry add column bsb_eligible boolean not null default false;
comment on column public.dictionary_entry.bsb_eligible is
  'BSB Eligible: the term (whole word or phrase) appears in the BSB text. Set by scripts/translations/easton-bsb.mjs.';
