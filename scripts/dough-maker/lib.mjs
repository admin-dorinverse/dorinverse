// Shared helpers for the dough-maker ingredients tools: the cached reference layer
// (fetch-reference.mjs), Question Rules 2.12 references, and the ingredients file format.
import fs from 'node:fs';
import path from 'node:path';

export const DIR = import.meta.dirname;
export const INGREDIENTS_DIR = path.join(DIR, 'ingredients');
const CACHE = path.join(DIR, '.cache');

export const RECIPES = ['Stories', 'Words', 'Idioms', 'Verses', 'Poems', 'Wisdom', 'Prophets',
  'Jesus Prophecies', 'Revelation', 'Parables', 'Letters'];

// 2.16: the books a recipe teaches in detail, by book order. Recipes that split books
// (Stories, Parables, Prophets' story chapters) or draw from anywhere have none here.
export const HOME_BOOKS = {
  Letters: range(45, 65),
  Revelation: [66],
  Poems: [19, 22, 25],
  Wisdom: [18, 20, 21],
};
function range(a, b) { return Array.from({ length: b - a + 1 }, (_, i) => a + i); }

// 2.4: lessons per flavor, by recipe; 1-lesson flavors only in these books
export const ONE_LESSON_BOOKS = ['Philemon', '2 John', '3 John', 'Jude'];
export const EXACT_LESSONS = { Idioms: 2, 'Jesus Prophecies': 2 };

// 2.10: characters in a lesson title, and in a flavor title after its "Book: " prefix
export const TITLE_MAX = 32;
// 2.10: recipes whose block fixes the lesson title form (the four terms), exempt from TITLE_MAX
export const FIXED_LESSON_TITLES = ['Words', 'Idioms'];

// --- reference layer --------------------------------------------------------

export function loadReference({ text = false } = {}) {
  const file = path.join(CACHE, 'reference.json');
  if (!fs.existsSync(file)) throw new Error('no reference cache: run node scripts/dough-maker/fetch-reference.mjs');
  const ref = JSON.parse(fs.readFileSync(file, 'utf8'));
  const verses = JSON.parse(fs.readFileSync(path.join(CACHE, 'verses.json'), 'utf8'));

  // verses.json keeps sequence order, so the osis book codes appear in book order
  const osis = [];
  for (const r of Object.keys(verses)) {
    const code = r.slice(0, r.indexOf('.'));
    if (osis[osis.length - 1] !== code) osis.push(code);
  }
  const books = ref.books.map((b, i) => ({ ...b, osis: osis[i] }));
  const chapterVerses = {};   // "<book order>:<chapter>" -> verse count
  for (const c of ref.chapters) chapterVerses[`${c.book}:${c.chapter}`] = c.verse_count;

  const people = Object.fromEntries(ref.people.map((p) => [p.lookup, p.display_title || p.name]));
  const places = Object.fromEntries(ref.places.map((p) => [p.lookup, p.name]));
  return { books, chapterVerses, people, places, links: ref.links, verses: text ? verses : null,
    totalVerses: Object.keys(verses).length };
}

// --- references (2.12) ------------------------------------------------------

const EN_DASH = '–';

function bookByName(ref, name) {
  const n = name === 'Psalm' ? 'Psalms' : name;
  return ref.books.find((b) => b.name === n);
}

// One passage: Book C:V | Book C:V–V | Book C:V–C:V | Book C | Book C–C
function parsePassage(ref, text) {
  const m = text.trim().match(/^(.+?)\s+(\d+)(?::(\d+))?(?:\s*([–-])\s*(\d+)(?::(\d+))?)?$/);
  if (!m) throw new Error(`cannot read reference "${text}"`);
  const [, name, c1s, v1s, dash, x, y] = m;
  if (dash === '-') throw new Error(`"${text}": ranges use an en dash (2.12)`);
  const book = bookByName(ref, name);
  if (!book) throw new Error(`"${text}": unknown book "${name}" (full book names only, 2.12)`);
  const count = (c) => {
    const n = ref.chapterVerses[`${book.order}:${c}`];
    if (!n) throw new Error(`"${text}": ${book.name} has no chapter ${c}`);
    return n;
  };
  const c1 = Number(c1s);
  let start, end;
  if (v1s === undefined) {                        // whole chapter(s)
    const c2 = x === undefined ? c1 : Number(x);
    if (y !== undefined) throw new Error(`"${text}": mixes a whole chapter with a verse`);
    start = [c1, 1]; end = [c2, count(c2)];
  } else if (x === undefined) {
    start = end = [c1, Number(v1s)];
  } else if (y === undefined) {
    start = [c1, Number(v1s)]; end = [c1, Number(x)];
  } else {
    start = [c1, Number(v1s)]; end = [Number(x), Number(y)];
  }
  const out = [];
  for (let c = start[0]; c <= end[0]; c++) {
    const last = count(c);
    const from = c === start[0] ? start[1] : 1;
    const to = c === end[0] ? end[1] : last;
    if (from < 1 || to > last || from > to) throw new Error(`"${text}": ${book.name} ${c} has verses 1–${last}`);
    for (let v = from; v <= to; v++) out.push(`${book.osis}.${c}.${v}`);
  }
  if (!out.length) throw new Error(`"${text}": empty range`);
  return out;
}

// "Matthew 7:6; Matthew 7:15" -> osis refs, in order
export function expand(ref, text) {
  return text.split(';').flatMap((p) => parsePassage(ref, p));
}

// osis refs -> "Romans 1:1–17; Romans 2:3" (2.12), assuming canonical order
export function formatRefs(ref, osisRefs) {
  const byOsis = Object.fromEntries(ref.books.map((b) => [b.osis, b]));
  const runs = [];
  for (const r of osisRefs) {
    const [code, c, v] = r.split('.');
    const prev = runs[runs.length - 1];
    const cur = { code, c: Number(c), v: Number(v) };
    const follows = prev && prev.code === code && (
      (prev.end.c === cur.c && prev.end.v + 1 === cur.v) ||
      (prev.end.c + 1 === cur.c && cur.v === 1 && prev.end.v === ref.chapterVerses[`${byOsis[code].order}:${prev.end.c}`]));
    if (follows) prev.end = cur; else runs.push({ code, start: cur, end: cur });
  }
  return runs.map(({ code, start, end }) => {
    const b = byOsis[code];
    const name = b.name === 'Psalms' && start.c === end.c ? 'Psalm' : b.name;
    const whole = start.v === 1 && end.v === ref.chapterVerses[`${b.order}:${end.c}`];
    if (whole) return start.c === end.c ? `${name} ${start.c}` : `${name} ${start.c}${EN_DASH}${end.c}`;
    if (start.c === end.c && start.v === end.v) return `${name} ${start.c}:${start.v}`;
    if (start.c === end.c) return `${name} ${start.c}:${start.v}${EN_DASH}${end.v}`;
    return `${name} ${start.c}:${start.v}${EN_DASH}${end.c}:${end.v}`;
  }).join('; ');
}

// People and places the reference layer links to these verses, most-mentioned first.
export function peoplePlaces(ref, osisRefs) {
  const p = new Map(), l = new Map();
  for (const r of osisRefs) {
    for (const k of ref.links[r]?.p ?? []) p.set(k, (p.get(k) ?? 0) + 1);
    for (const k of ref.links[r]?.l ?? []) l.set(k, (l.get(k) ?? 0) + 1);
  }
  const rank = (m, names) => [...m].sort((a, b) => b[1] - a[1] || names[a[0]].localeCompare(names[b[0]]))
    .map(([k, n]) => ({ name: names[k], verses: n }));
  return { people: rank(p, ref.people), places: rank(l, ref.places) };
}

// --- ingredients files --------------------------------------------------------
//
// A flavor is a "### <n>. <title>" heading followed by "- **Field:** value" lines.
// Lessons are numbered lines under "- **Lessons:**", each "<range> — <note>".

export const COUNTS_START = '<!-- counts:start -->';
export const COUNTS_END = '<!-- counts:end -->';

export function listNames(value) {
  return value.trim() === '' || value.trim() === '—' ? [] : value.split(',').map((s) => s.trim()).filter(Boolean);
}

export function parseIngredients(text, file) {
  const recipe = text.match(/^\*\*Recipe:\*\*\s*(.+)$/m)?.[1].trim();
  if (!RECIPES.includes(recipe)) throw new Error(`${file}: "**Recipe:** <name>" line missing or not one of the 11 recipes`);
  const flavors = [];
  let cur = null, inLessons = false;
  text.split(/\r?\n/).forEach((line, i) => {
    const at = `${file}:${i + 1}`;
    const h = line.match(/^###\s+(\d+)\.\s+(.+)$/);
    if (h) {
      cur = { order: Number(h[1]), title: h[2].trim(), at: `${file}:${i + 1}`, range: null, parallel: null,
        frame: null, lessons: [], people: [], places: [] };
      flavors.push(cur);
      inLessons = false;
      return;
    }
    if (!cur) return;
    const f = line.match(/^- \*\*(.+?):\*\*\s*(.*)$/);
    if (f) {
      const [, key, value] = f;
      inLessons = key === 'Lessons';
      const ref = value.trim() === '—' ? null : value.trim() || null;
      if (key === 'Range') cur.range = ref;
      else if (key === 'Parallel') cur.parallel = ref;
      else if (key === 'Frame') cur.frame = ref;
      else if (/^People/.test(key)) cur.people = listNames(value);
      else if (/^Places/.test(key)) cur.places = listNames(value);
      return;
    }
    const l = inLessons && line.match(/^\s+\d+\.\s+(.+?)(?:\s+—\s+(.*))?$/);
    if (l) cur.lessons.push({ range: l[1].trim(), note: l[2]?.trim() ?? '', at });
    else if (line.trim() && !/^\s/.test(line)) inLessons = false;
  });
  return { recipe, flavors };
}
