// Pulls the Bible reference layer from the linked Supabase project (staging-dorinverse)
// into scripts/dough-maker/.cache/, so the ingredients tools run offline.
//
//   node scripts/dough-maker/fetch-reference.mjs
//
// Read-only. Writes reference.json (books, chapters, people, places, and the verse
// links), verses.json (KJV text by osis ref) and bsb.json (BSB text by osis ref, the
// lesson text; null where the BSB leaves the verse out). Re-run after the reference layer changes.
import fs from 'node:fs';
import path from 'node:path';
import { agg } from './lib.mjs';

const cacheDir = path.join(import.meta.dirname, '.cache');

const books = agg(`select "order", name, testament, chapter_count, verse_count from public.book order by "order"`);
const chapters = agg(`select b."order" as book, c.chapter_number as chapter, c.verse_count
  from public.chapter c join public.book b on b.id = c.book_id order by b."order", c.chapter_number`);
const people = agg(`select lookup, name, display_title from public.bible_character order by lookup`);
const places = agg(`select lookup, name, feature_type from public.place order by lookup`);

const verses = {};
const links = {};   // osis ref -> { p: [person lookups], l: [place lookups] }
for (let lo = 1; lo <= 31102; lo += 4000) {
  const hi = lo + 3999;
  for (const v of agg(`select osis_ref as r, text as t from public.verse where sequence between ${lo} and ${hi} order by sequence`)) {
    verses[v.r] = v.t;
  }
}
const bsb = {};   // osis ref -> BSB text, or null where verse_text.included is false
for (let lo = 1; lo <= 31102; lo += 4000) {
  const hi = lo + 3999;
  for (const v of agg(`select v.osis_ref as r, case when t.included then t.text end as t from public.verse_text t
      join public.verse v on v.id = t.verse_id where t.translation_code = 'BSB' and v.sequence between ${lo} and ${hi}
      order by v.sequence`)) {
    bsb[v.r] = v.t;
  }
}
if (Object.keys(bsb).length !== Object.keys(verses).length) throw new Error(`BSB has ${Object.keys(bsb).length} verses, KJV ${Object.keys(verses).length}`);
for (const row of agg(`select v.osis_ref as r, c.lookup as k from public.verse_bible_character x
    join public.verse v on v.id = x.verse_id join public.bible_character c on c.id = x.bible_character_id`)) {
  (links[row.r] ??= { p: [], l: [] }).p.push(row.k);
}
for (const row of agg(`select v.osis_ref as r, p.lookup as k from public.verse_place x
    join public.verse v on v.id = x.verse_id join public.place p on p.id = x.place_id`)) {
  (links[row.r] ??= { p: [], l: [] }).l.push(row.k);
}

fs.mkdirSync(cacheDir, { recursive: true });
fs.writeFileSync(path.join(cacheDir, 'reference.json'), JSON.stringify({ books, chapters, people, places, links }));
fs.writeFileSync(path.join(cacheDir, 'verses.json'), JSON.stringify(verses));
fs.writeFileSync(path.join(cacheDir, 'bsb.json'), JSON.stringify(bsb));
console.log(`${books.length} books, ${chapters.length} chapters, ${Object.keys(verses).length} verses, ` +
  `${people.length} people, ${places.length} places cached in ${cacheDir}`);
