// Pulls the Bible reference layer from the linked Supabase project (staging-dorinverse)
// into scripts/dough-maker/.cache/, so the ingredients tools run offline.
//
//   node scripts/dough-maker/fetch-reference.mjs
//
// Read-only. Writes reference.json (books, chapters, people, places, and the verse
// links) and verses.json (KJV text by osis ref, for drafting). Re-run after the
// reference layer changes.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';

const CLI = 'supabase@2.122.0';   // the version supabase/config.toml is written for
const cacheDir = path.join(import.meta.dirname, '.cache');

function query(sql) {
  // The SQL goes through a file: quoting it on a Windows command line is not reliable.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dough-'));
  const file = path.join(dir, 'q.sql');
  fs.writeFileSync(file, sql);
  const r = spawnSync('npx', ['-y', CLI, 'db', 'query', '--linked', '--output-format', 'json', '-f', `"${file}"`], {
    encoding: 'utf8', shell: process.platform === 'win32', maxBuffer: 512 * 1024 * 1024,
  });
  fs.rmSync(dir, { recursive: true, force: true });
  if (r.status !== 0) throw new Error(`query failed: ${r.stderr || r.stdout}`);
  const start = r.stdout.indexOf('{');
  return JSON.parse(r.stdout.slice(start)).rows;
}

// One json_agg cell per query keeps the Management API payload to a single row.
const agg = (sql) => query(`select coalesce(json_agg(agg_row), '[]') as j from (${sql}) agg_row`)[0].j;

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
console.log(`${books.length} books, ${chapters.length} chapters, ${Object.keys(verses).length} verses, ` +
  `${people.length} people, ${places.length} places cached in ${cacheDir}`);
