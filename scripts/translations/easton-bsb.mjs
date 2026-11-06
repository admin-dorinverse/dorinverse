// BSB Eligible: flags each Easton's entry (public.dictionary_entry) that a BSB lesson could teach as a word.
//
//   node scripts/dough-maker/fetch-reference.mjs        # first, so the BSB cache is current
//   node scripts/translations/easton-bsb.mjs [--list]   # write .cache/easton-bsb.sql (--list: also .cache/easton-bsb.json)
//   supabase db query --linked -f scripts/translations/.cache/easton-bsb.sql
//
// An entry is eligible when (owner rulings, 2026-11-05):
//   * its term is printed in at least 2 BSB verses, and
//   * it is not a person or a geographic place. Objects and structures (altar, street) are fine.
// People and places: an entry tagged as a character or place (match_type, or a link row) counts only
// where the BSB prints the term in lower case, as an ordinary word ("street", "hail"); a name is always
// capitalised. An untagged entry the BSB only ever capitalises is taken as a name unless it is in WORDS.
// Both lists were checked by hand against the Easton's text.
// How a term is found:
//   * whole word or phrase; case and punctuation are ignored, and a possessive ("Aaron's") counts as the word;
//   * an inverted term is read the normal way round ("Gilead, Balm of" is "Balm of Gilead");
//   * "Azur and Azzur" is found by either spelling;
//   * a hyphen matches a hyphen, a space, or nothing ("Battle-axe" finds "battle axe");
//   * no plurals or other word forms: "Giant" is not found by "giants".
import fs from 'node:fs';
import path from 'node:path';
import { loadReference, agg } from '../dough-maker/lib.mjs';

const OUT_DIR = path.join(import.meta.dirname, '.cache');
const MIN_VERSES = 2;

// Untagged entries the BSB only capitalises that are words, not people or places. "Term#id" picks one
// entry of a term shared with a person (Mahalath the lute, not Esau's wife).
const WORDS = new Set(['Abba', 'Abib', 'Ah!', 'Alamoth', 'Ancient of Days', 'Asherah', 'Atonement, Day of', 'Baal',
  'Baal-berith', 'Baptism, John’s', 'Behemoth', 'Bel', 'Christian', 'Christs, False', 'Chronicles',
  'Commandments, the Ten', 'Coral', 'Dispersion', 'Gentiles', 'Gittith', 'Greek', 'Hades', 'Hallelujah', 'Hebrew',
  'Hebrews', 'Herodians', 'Hosanna', 'Immanuel', 'Jew', 'Jubilee', 'Law of Moses', 'Legion', 'Leviathan',
  'Lord’s day', 'Mahalath#5e54de75', 'Mene', 'Messiah', 'Nephilim', 'Nisan', 'Nisroch', 'Omega', 'Orion', 'Paradise',
  'Passover', 'Pentecost', 'Pharisees', 'Pleiades', 'Potsherd', 'Praetorium', 'Queen of heaven', 'Rabbi', 'Rabboni',
  'Sabbath', 'Sadducees', 'Scripture', 'Selah', 'Sheminith', 'Sheol', 'Son of God', 'Spirit, Holy',
  'Tabernacles, Feast of', 'Tekel', 'Thummim', 'Urim', 'Weeks, Feast of', 'Word of God']);
// Tagged entries the BSB prints in lower case that are still about a person or a named place:
// Mark, On, So, Ram (3), Ephah (Midian's son, Caleb's concubine), South (the Negeb), Brook (the Nile),
// East gate (the Potter's gate), Passage (the Jordan crossing)
const NOT_WORDS = ['2be90a16', '6723ecec', 'aebe36c3', 'ebf5fb1c', '48cfc35b', '620af862', 'daf66cc8', '0fe635ec',
  'dc863d49', 'e7aa879d', 'fa5f87e7', '37a11542'];
const isWord = (e) => WORDS.has(e.term) || WORDS.has(`${e.term}#${e.id.slice(0, 8)}`);

const clean = (s) => ' ' + s.replace(/[’‘`]/g, "'").replace(/[^A-Za-z0-9'\- ]+/g, ' ')
  .replace(/'s\b/g, '').replace(/'/g, '').replace(/\s+/g, ' ').trim() + ' ';
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const ref = loadReference({ bsb: true });
const verses = Object.values(ref.bsb).filter(Boolean).map(clean);   // case kept
const index = new Map();   // lower-case word or word part -> verse indexes
verses.forEach((v, i) => {
  for (const tok of v.toLowerCase().trim().split(' ')) {
    for (const w of new Set([tok, tok.replace(/-/g, ''), ...tok.split('-')])) {
      if (!index.has(w)) index.set(w, new Set());
      index.get(w).add(i);
    }
  }
});

function variants(term) {
  let t = term.replace(/[!?.]+$/, '').trim();
  const m = t.match(/^([^,]+),\s*(.+)$/);
  if (m) t = `${m[2]} ${m[1]}`;
  return t.split(/\s+(?:and|or)\s+(?=[A-Z])/).map((v) => clean(v).trim()).filter(Boolean);
}

// Verse indexes where the variant is printed; lowerOnly: only where its first letter is lower case
function hits(v, lowerOnly) {
  const parts = v.toLowerCase().split(/[ -]/);
  const cands = index.get(parts[0]);
  if (!cands) return [];
  const first = lowerOnly ? `${parts[0][0]}` : `[${parts[0][0]}${parts[0][0].toUpperCase()}]`;
  const re = new RegExp(` ${first}${esc(parts[0].slice(1))}${parts.slice(1).map((p) => `[- ]?${esc(p)}`).join('')} `,
    lowerOnly ? '' : 'i');
  const joined = parts.length === 1 ? null : new RegExp(` ${first}${esc(parts.join('').slice(1))} `, lowerOnly ? '' : 'i');
  return [...cands].filter((i) => re.test(verses[i]) || joined?.test(verses[i]));
}

const entries = agg(`select e.id, e.term, e.match_type,
    exists (select 1 from public.dictionary_entry_bible_character x where x.dictionary_entry_id = e.id)
    or exists (select 1 from public.dictionary_entry_place x where x.dictionary_entry_id = e.id) as linked
  from public.dictionary_entry e order by e.term`);

const rows = entries.map((e) => {
  const named = e.linked || ['character', 'place', 'multi'].includes(e.match_type);
  const found = new Set(variants(e.term).flatMap((v) => hits(v, named)));
  const lower = named ? found.size : new Set(variants(e.term).flatMap((v) => hits(v, true))).size;
  const name = NOT_WORDS.some((p) => e.id.startsWith(p)) || (!named && found.size >= MIN_VERSES && lower < MIN_VERSES && !isWord(e));
  const why = name ? 'person or place'
    : found.size >= MIN_VERSES ? null
    : found.size === 1 ? 'in only 1 BSB verse'
    : named ? 'person or place' : 'not in the BSB';
  return { id: e.id, term: e.term, named, verses: found.size, eligible: !why, why };
});
const eligible = rows.filter((r) => r.eligible);

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(path.join(OUT_DIR, 'easton-bsb.sql'), `-- Written by node scripts/translations/easton-bsb.mjs. ${eligible.length} of ${entries.length} entries are BSB Eligible.
begin;
update public.dictionary_entry set bsb_eligible = false where bsb_eligible;
update public.dictionary_entry set bsb_eligible = true where id in (
${eligible.map((e) => `'${e.id}'`).join(',\n')}
);
commit;
`);
if (process.argv.includes('--list')) fs.writeFileSync(path.join(OUT_DIR, 'easton-bsb.json'), JSON.stringify(rows, null, 1));
const count = (w) => rows.filter((r) => r.why === w).length;
console.log(`${eligible.length} of ${entries.length} Easton's entries are BSB Eligible. Left out: ` +
  `${count('person or place')} people or places, ${count('in only 1 BSB verse')} in only 1 BSB verse, ${count('not in the BSB')} not in the BSB.`);
