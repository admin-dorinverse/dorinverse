// Full-Bible translations: public.verse_text, one row per verse for BSB and WEB.
//
//   node scripts/translations/load.mjs [data dir]   # write .cache/verse-text-<code>-<n>.sql
//   supabase db query --linked -f scripts/translations/.cache/verse-text-<code>-<n>.sql   # each file, in order
//
// The data dir (default ~/OneDrive/Desktop/dorinverse-data) holds bsb.json and web.json from its
// convert_bsb.js / convert_web.js: [{ translation, book, book_num, chapter, verse, text }].
// Every row is checked against the 31,102 KJV verses in the reference cache before any SQL is written.
// A verse the translation leaves out (empty text) gets NOT_INCLUDED with included = false. Psalm titles stay in verse 1.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadReference } from '../dough-maker/lib.mjs';

const DIR = import.meta.dirname;
const OUT_DIR = path.join(DIR, '.cache');
const DATA_DIR = process.argv[2] ?? path.join(os.homedir(), 'OneDrive', 'Desktop', 'dorinverse-data');
const CHUNK = 4000;   // rows per file, so each db query stays small
const NOT_INCLUDED = 'Not included in this translation.';

const TRANSLATIONS = [
  { code: 'BSB', file: 'bsb.json' },
  // WEB prints Romans 16:25-27 at the end of Romans 14; KJV numbering puts them in 16.
  { code: 'WEB', file: 'web.json', move: { 'Rom.14.24': 'Rom.16.25', 'Rom.14.25': 'Rom.16.26', 'Rom.14.26': 'Rom.16.27' } },
];

const ref = loadReference({ text: true });
const kjv = Object.keys(ref.verses);
const BOOKS = [...new Set(kjv.map((k) => k.split('.')[0]))];   // osis book codes in canon order
if (kjv.length !== 31102 || BOOKS.length !== 66) throw new Error(`reference cache has ${kjv.length} verses, ${BOOKS.length} books`);
const kjvSet = new Set(kjv);

const lit = (s) => `'${s.replaceAll("'", "''")}'`;

fs.rmSync(OUT_DIR, { recursive: true, force: true });
fs.mkdirSync(OUT_DIR, { recursive: true });

for (const t of TRANSLATIONS) {
  const rows = JSON.parse(fs.readFileSync(path.join(DATA_DIR, t.file), 'utf8'));
  const texts = new Map(), errors = [];
  for (const r of rows) {
    if (r.translation !== t.code) { errors.push(`${r.book} ${r.chapter}:${r.verse} is ${r.translation}`); continue; }
    let osis = `${BOOKS[r.book_num - 1]}.${r.chapter}.${r.verse}`;
    osis = t.move?.[osis] ?? osis;
    const text = r.text.trim();
    if (!text) continue;   // left out by this translation
    if (!kjvSet.has(osis)) errors.push(`${osis} is not a KJV verse`);
    else if (texts.has(osis)) errors.push(`${osis} appears twice`);
    else texts.set(osis, text);
  }
  if (errors.length) { console.error(`${t.code}:\n  ${errors.join('\n  ')}`); process.exit(1); }
  const omitted = kjv.filter((k) => !texts.has(k));

  const files = Math.ceil(kjv.length / CHUNK);
  for (let i = 0; i < files; i++) {
    const values = kjv.slice(i * CHUNK, (i + 1) * CHUNK).map((k) => texts.has(k)   // osis needs no escaping
      ? `('${k}', ${lit(texts.get(k))}, true)` : `('${k}', ${lit(NOT_INCLUDED)}, false)`);
    const name = `verse-text-${t.code.toLowerCase()}-${i + 1}.sql`;
    fs.writeFileSync(path.join(OUT_DIR, name), `-- Written by node scripts/translations/load.mjs. ${t.code} part ${i + 1} of ${files}.
insert into public.verse_text (verse_id, translation_code, text, included)
select v.id, '${t.code}', s.text, s.included
from (values
${values.join(',\n')}
) s (osis, text, included)
join public.verse v on v.osis_ref = s.osis
on conflict (verse_id, translation_code) do update set text = excluded.text, included = excluded.included;
`);
  }
  console.log(`${t.code}: ${texts.size} verses in ${files} files; ${omitted.length} not included: ${omitted.join(' ')}`);
}

fs.writeFileSync(path.join(OUT_DIR, 'verse-text-check.sql'), `-- Written by node scripts/translations/load.mjs. Run after the load: rows per translation.
select translation_code, count(*) filter (where included) as included, count(*) filter (where not included) as not_included
from public.verse_text group by translation_code order by 1;
`);
