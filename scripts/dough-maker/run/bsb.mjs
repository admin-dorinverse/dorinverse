// The BSB text, from bsb.json in the data folder (scripts/translations/load.mjs). Written out one verse per line,
// "Ruth 1:1 In the days when…", always the same way, so calls that include it start the same (models.md "Caching"
// rule 3). Verses the BSB leaves out (empty text) are not written.
//
//   bookText('Ruth')   the whole book
//   BOOKS              the 66 book names, in Bible order
//   verses()           every verse number in Bible order: [{ ref: 'Ruth 1:1', book, leftOut, text }]; leftOut is true
//                      for the verses the BSB leaves out (Matthew 23:14 and the like). The same list every call:
//                      don't change it.
//   verseIndex(ref)    a verse's place in verses(), or undefined
//   passageText(start, end)   the verses from start to end, written the same way as bookText
//   span(start, end)   'Genesis 1:1-2:3' or 'Ruth 1:1-22': a range the way the lesson outputs write it
//   parseRefs('Genesis 22:6, 8')   [[first, last], ...] as places in verses(), or null if any part isn't a real verse
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const DATA = process.env.DORINVERSE_DATA || path.join(os.homedir(), 'OneDrive', 'Desktop', 'dorinverse-data');
let rows = null;
const load = () => (rows ??= JSON.parse(fs.readFileSync(path.join(DATA, 'bsb.json'), 'utf8'))
  .sort((a, b) => a.book_num - b.book_num || a.chapter - b.chapter || a.verse - b.verse));

export const BOOKS = [...new Set(load().map((r) => r.book))];

let all = null, index = null;
export const verses = () => (all ??= load().map((r) => ({ ref: `${r.book} ${r.chapter}:${r.verse}`, book: r.book,
  leftOut: !r.text.trim(), text: r.text.trim() })));
export const verseIndex = (ref) => (index ??= new Map(verses().map((v, i) => [v.ref, i]))).get(ref);

export function bookText(book) {
  const verses = load().filter((r) => r.book === book && r.text.trim());
  if (!verses.length) throw new Error(`No BSB text for "${book}"`);
  return verses.map((r) => `${r.book} ${r.chapter}:${r.verse} ${r.text.trim()}`).join('\n') + '\n';
}

export function passageText(start, end) {
  const a = verseIndex(start), b = verseIndex(end);
  if (a === undefined || b === undefined || a > b) throw new Error(`Not a BSB range: ${start} to ${end}`);
  return verses().slice(a, b + 1).filter((v) => !v.leftOut).map((v) => `${v.ref} ${v.text}`).join('\n') + '\n';
}

const bookOf = (ref) => ref.replace(/\s+\d+:\d+$/, '');
export function span(start, end) {
  const [c1] = start.slice(bookOf(start).length + 1).split(':');
  const [c2, v2] = end.slice(bookOf(end).length + 1).split(':');
  return `${start}-${c1 === c2 ? v2 : `${c2}:${v2}`}`;
}

// "Book 3:1", "Book 3:1-20", "Book 3:1-4:2"; a part after a comma or semicolon can leave out the book ("23:4") or
// the book and chapter ("8"). Any kind of dash counts as the range hyphen.
export function parseRefs(text) {
  if (typeof text !== 'string' || !text.trim()) return null;
  const out = [];
  let book = null, chapter = null;
  for (const part of text.split(/[,;]/).map((p) => p.trim())) {
    const m = part.match(/^(?:(.*?\D)\s+)?(?:(\d+):)?(\d+)(?:\s*[-‐-―]\s*(?:(\d+):)?(\d+))?$/);
    if (!m) return null;
    if (m[1]) { book = m[1]; if (!m[2]) return null; }
    if (m[2]) chapter = m[2];
    if (!book || !chapter) return null;
    const a = verseIndex(`${book} ${chapter}:${m[3]}`);
    if (m[4]) chapter = m[4];
    const b = m[5] ? verseIndex(`${book} ${chapter}:${m[5]}`) : a;
    if (a === undefined || b === undefined || a > b) return null;
    out.push([a, b]);
  }
  return out;
}
