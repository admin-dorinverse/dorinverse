// The BSB text, from bsb.json in the data folder (scripts/translations/load.mjs). Written out one verse per line,
// "Ruth 1:1 In the days when…", always the same way, so calls that include it start the same (models.md "Caching"
// rule 3). Verses the BSB leaves out (empty text) are not written.
//
//   bookText('Ruth')   the whole book
//   BOOKS              the 66 book names, in Bible order
//   verses()           every verse number in Bible order: [{ ref: 'Ruth 1:1', book, leftOut }]; leftOut is true for
//                      the verses the BSB leaves out (Matthew 23:14 and the like)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const DATA = process.env.DORINVERSE_DATA || path.join(os.homedir(), 'OneDrive', 'Desktop', 'dorinverse-data');
let rows = null;
const load = () => (rows ??= JSON.parse(fs.readFileSync(path.join(DATA, 'bsb.json'), 'utf8'))
  .sort((a, b) => a.book_num - b.book_num || a.chapter - b.chapter || a.verse - b.verse));

export const BOOKS = [...new Set(load().map((r) => r.book))];

export const verses = () => load().map((r) => ({ ref: `${r.book} ${r.chapter}:${r.verse}`, book: r.book, leftOut: !r.text.trim() }));

export function bookText(book) {
  const verses = load().filter((r) => r.book === book && r.text.trim());
  if (!verses.length) throw new Error(`No BSB text for "${book}"`);
  return verses.map((r) => `${r.book} ${r.chapter}:${r.verse} ${r.text.trim()}`).join('\n') + '\n';
}
