// Checks every ingredients file against Question Rules 2.4 and 2.12, rewrites each
// file's counts, and writes ingredients/coverage.md: what all the recipes reveal
// together, and the verses no flavor holds yet (2.14).
//
//   node scripts/dough-maker/coverage.mjs
//
// Exits 1 when a file has errors; coverage.md is still written from what parsed.
import fs from 'node:fs';
import path from 'node:path';
import {
  INGREDIENTS_DIR, COUNTS_START, COUNTS_END, RECIPES, HOME_BOOKS, ONE_LESSON_BOOKS, EXACT_LESSONS, TITLE_MAX, FIXED_LESSON_TITLES,
  loadReference, expand, formatRefs, parseIngredients,
} from './lib.mjs';

const ref = loadReference();
const order = Object.keys(JSON.parse(fs.readFileSync(path.join(import.meta.dirname, '.cache', 'verses.json'), 'utf8')));
const seq = new Map(order.map((r, i) => [r, i]));
const bookOf = (r) => r.slice(0, r.indexOf('.'));
const fmt = (n) => n.toLocaleString('en-US');
const pct = (n, d) => (d ? `${((100 * n) / d).toFixed(1)}%` : '—');

const errors = [];
const recipes = [];   // { recipe, file, flavors, lessons, people:Set, places:Set, verses:Set }

const files = fs.existsSync(INGREDIENTS_DIR)
  ? fs.readdirSync(INGREDIENTS_DIR).filter((f) => f.endsWith('.md') && f !== 'coverage.md') : [];

for (const name of files) {
  const file = path.join(INGREDIENTS_DIR, name);
  const rel = path.relative(process.cwd(), file);
  let text = fs.readFileSync(file, 'utf8');
  let parsed;
  try { parsed = parseIngredients(text, rel); } catch (e) { errors.push(e.message); continue; }
  const { recipe, flavors } = parsed;
  const r = { recipe, file: name, flavors: flavors.length, lessons: 0, people: new Set(), places: new Set(), verses: new Set() };

  const tryExpand = (t, at) => { try { return expand(ref, t); } catch (e) { errors.push(`${at}: ${e.message}`); return []; } };
  flavors.forEach((f, i) => {
    if (f.order !== i + 1) errors.push(`${f.at}: flavor numbered ${f.order}, expected ${i + 1}`);
    if (!f.range) { errors.push(`${f.at}: no Range`); return; }
    const base = tryExpand(f.range, f.at);
    const extra = [f.parallel, f.frame].filter(Boolean).flatMap((t) => tryExpand(t, f.at));
    const lessonRefs = f.lessons.map((l) => tryExpand(l.range, l.at));
    for (const v of [...base, ...extra, ...lessonRefs.flat()]) r.verses.add(v);
    f.people.forEach((p) => r.people.add(p));
    f.places.forEach((p) => r.places.add(p));
    r.lessons += f.lessons.length;

    // 2.10: title length, and the person named rather than "I", "me", or "my"
    const flavorTitle = f.title.replace(/^.+?: /, '');
    const titles = [[f.at, 'flavor', flavorTitle], ...f.lessons.map((l) => [l.at, 'lesson', l.note])];
    for (const [at, kind, title] of titles) {
      // a block's fixed title form (Words and Idioms list their four terms) is kept as is
      const fixedForm = kind === 'lesson' && FIXED_LESSON_TITLES.includes(recipe);
      if (title.length > TITLE_MAX && !fixedForm) errors.push(`${at}: ${kind} title is ${title.length} characters (max ${TITLE_MAX}, 2.10)`);
      if (/\b(I|me|my)\b/i.test(title)) errors.push(`${at}: ${kind} title says "I", "me", or "my"; name the person (2.10)`);
    }

    // 2.4: lesson count per flavor
    const n = f.lessons.length;
    const books = new Set(base.map(bookOf));
    const oneOk = recipe === 'Letters' && books.size === 1 &&
      ONE_LESSON_BOOKS.includes(ref.books.find((b) => b.osis === [...books][0])?.name);
    if (EXACT_LESSONS[recipe] ? n !== EXACT_LESSONS[recipe] : !((n >= 2 && n <= 5) || (n === 1 && oneOk))) {
      errors.push(`${f.at}: ${n} lessons breaks 2.4 for ${recipe}`);
    }
    // lessons tile the flavor's base range: same verses, no overlap, in order
    if (n && base.length) {
      const flat = lessonRefs.flat();
      const dupes = flat.length !== new Set(flat).size;
      const same = flat.length === base.length && flat.every((v, k) => v === base[k]);
      if (dupes || !same) {
        const missing = base.filter((v) => !flat.includes(v));
        const outside = flat.filter((v) => !base.includes(v));
        errors.push(`${f.at}: lessons do not tile the range` +
          (missing.length ? `; missing ${formatRefs(ref, missing)}` : '') +
          (outside.length ? `; outside ${formatRefs(ref, outside)}` : '') +
          (dupes ? '; a verse sits in two lessons' : '') +
          (!missing.length && !outside.length && !dupes ? '; out of order' : ''));
      }
    }
  });
  recipes.push(r);

  // rewrite the per-entry counts and the file's counts block
  text = text.replace(/^- \*\*(People|Places)(?: \(\d+\))?:\*\*\s*(.*)$/gm, (_, k, v) => {
    const count = v.trim() === '—' || v.trim() === '' ? 0 : v.split(',').filter((s) => s.trim()).length;
    return `- **${k} (${count}):** ${v.trim() || '—'}`;
  });
  const home = HOME_BOOKS[recipe];
  const homeVerses = home && ref.books.filter((b) => home.includes(b.order)).reduce((s, b) => s + b.verse_count, 0);
  const homeRevealed = home && [...r.verses].filter((v) => home.includes(ref.books.find((b) => b.osis === bookOf(v)).order)).length;
  const block = [
    COUNTS_START,
    '| Flavors | Lessons | Characters | Places | Verses revealed |',
    '|---|---|---|---|---|',
    `| ${r.flavors} | ${r.lessons} | ${r.people.size} | ${r.places.size} | ${fmt(r.verses.size)} (${pct(r.verses.size, ref.totalVerses)} of the Bible)` +
      (home ? `; home books ${fmt(homeRevealed)} of ${fmt(homeVerses)} (${pct(homeRevealed, homeVerses)})` : '') + ' |',
    COUNTS_END,
  ].join('\n');
  const a = text.indexOf(COUNTS_START), b = text.indexOf(COUNTS_END);
  if (a < 0 || b < a) errors.push(`${rel}: counts markers missing`);
  else text = text.slice(0, a) + block + text.slice(b + COUNTS_END.length);
  fs.writeFileSync(file, text);
}

// --- coverage.md -------------------------------------------------------------
const all = new Set(recipes.flatMap((r) => [...r.verses]));
const byVerse = new Map();
for (const r of recipes) for (const v of r.verses) (byVerse.get(v) ?? byVerse.set(v, []).get(v)).push(r.recipe);
const allPeople = new Set(recipes.flatMap((r) => [...r.people]));
const allPlaces = new Set(recipes.flatMap((r) => [...r.places]));
const sorted = (set) => [...set].sort((x, y) => seq.get(x) - seq.get(y));

const md = [
  '# Coverage — All Recipes',
  '',
  '_Generated by `node scripts/dough-maker/coverage.mjs`. Do not edit by hand._',
  '',
  `Generated ${new Date().toISOString().slice(0, 10)} from ${recipes.length} of ${RECIPES.length} recipe files. ` +
    'A verse is revealed when it sits in any flavor\'s range, parallel, frame, or lesson. ' +
    'Characters and places are counted by distinct name across the entries.',
  '',
  '## Grand totals',
  '',
  '| Flavors | Lessons | Verses revealed | Characters | Places |',
  '|---|---|---|---|---|',
  `| ${recipes.reduce((s, r) => s + r.flavors, 0)} | ${recipes.reduce((s, r) => s + r.lessons, 0)} | ` +
    `${fmt(all.size)} of ${fmt(ref.totalVerses)} (${pct(all.size, ref.totalVerses)}) | ${allPeople.size} | ${allPlaces.size} |`,
  '',
  '## By recipe',
  '',
  '| Recipe | Flavors | Lessons | Verses revealed | Only this recipe | Shared | Characters | Places |',
  '|---|---|---|---|---|---|---|---|',
];
for (const name of RECIPES) {
  const r = recipes.find((x) => x.recipe === name);
  if (!r) { md.push(`| ${name} | — | — | — | — | — | — | — |`); continue; }
  const only = [...r.verses].filter((v) => byVerse.get(v).length === 1).length;
  md.push(`| ${name} | ${r.flavors} | ${r.lessons} | ${fmt(r.verses.size)} | ${fmt(only)} | ${fmt(r.verses.size - only)} | ${r.people.size} | ${r.places.size} |`);
}
md.push('', '## By book', '', '| Book | Verses | Revealed | Recipes |', '|---|---|---|---|');
for (const b of ref.books) {
  const inBook = sorted(all).filter((v) => bookOf(v) === b.osis);
  const which = new Set(inBook.flatMap((v) => byVerse.get(v)));
  md.push(`| ${b.name} | ${fmt(b.verse_count)} | ${fmt(inBook.length)} (${pct(inBook.length, b.verse_count)}) | ${[...which].join(', ') || '—'} |`);
}
md.push('', '## Gaps', '');
const gaps = order.filter((v) => !all.has(v));
if (!gaps.length) md.push('None. Every verse is revealed by at least one flavor.');
else {
  md.push(`${fmt(gaps.length)} verses are not in any flavor yet.`, '');
  for (const b of ref.books) {
    const g = gaps.filter((v) => bookOf(v) === b.osis);
    if (g.length) md.push(`- **${b.name}** (${fmt(g.length)}): ${formatRefs(ref, g)}`);
  }
}
if (errors.length) md.push('', '## Errors', '', ...errors.map((e) => `- ${e}`));
fs.mkdirSync(INGREDIENTS_DIR, { recursive: true });
fs.writeFileSync(path.join(INGREDIENTS_DIR, 'coverage.md'), md.join('\n') + '\n');

console.log(`${recipes.length} recipe files; ${fmt(all.size)} of ${fmt(ref.totalVerses)} verses revealed; ${fmt(gaps.length)} uncovered`);
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
