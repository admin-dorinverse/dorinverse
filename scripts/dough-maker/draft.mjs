// Writes a first-draft ingredients file from a section plan, filling each flavor's
// People and Places from the reference layer. After this the file is edited by hand;
// coverage.mjs keeps its counts current.
//
//   node scripts/dough-maker/draft.mjs <plan.json> <Recipe> [--force]
//
// plan.json: [{ book?, title, range, parallel?, frame?, split?, turn?, notes?,
//               lessons: [{ range, title, why? }] }], in flavor order.
import fs from 'node:fs';
import path from 'node:path';
import { INGREDIENTS_DIR, COUNTS_START, COUNTS_END, RECIPES, loadReference, expand, peoplePlaces } from './lib.mjs';

const [planFile, recipe, flag] = process.argv.slice(2);
if (!planFile || !RECIPES.includes(recipe)) {
  console.error(`usage: draft.mjs <plan.json> <${RECIPES.join('|')}> [--force]`);
  process.exit(1);
}
const out = path.join(INGREDIENTS_DIR, `${recipe.toLowerCase().replace(/ /g, '-')}.md`);
if (fs.existsSync(out) && flag !== '--force') {
  console.error(`${out} exists and may hold hand edits; pass --force to overwrite`);
  process.exit(1);
}

const ref = loadReference();
const plan = JSON.parse(fs.readFileSync(planFile, 'utf8'));
const names = (list) => list.map((x) => x.name).join(', ') || '—';
const today = new Date().toISOString().slice(0, 10);

const lines = [
  `# ${recipe} — Ingredients`,
  '',
  `**Recipe:** ${recipe}`,
  '**Rules version:** v1',
  '**Source:** staging-dorinverse only (KJV verse text; people and places from the reference layer)',
  `**Drafted:** ${today}`,
  '',
  COUNTS_START,
  COUNTS_END,
  '',
  '_The counts above are rewritten by `node scripts/dough-maker/coverage.mjs`. Edit the entries, not the counts._',
  '',
  'How to read an entry:',
  '- **Title** — after the book name, what the player learns from the whole flavor, as this recipe teaches and tests it (2.10).',
  '- **Range** — the verses the flavor teaches and reveals (Question Rules 2.12 format).',
  '- **Parallel** — other accounts of the same events: revealed after the base, never a question source (2.17).',
  '- **Frame** — verses outside the range that lesson 1 also draws on (Letters: who wrote it, to whom, and why, 7.L2).',
  '- **Lessons** — one numbered line per lesson: its range, then its title in plain words (2.10). The line under it says what the lesson teaches toward the flavor title.',
  '- **Split option** — where the flavor could become two flavors that each still have 2–5 lessons (2.4), or "None".',
  '- **People / Places** — who and where the reference layer links to the range, most-mentioned first.',
  '- **Turn** — the words in the text where the section begins.',
];

let book = null;
plan.forEach((f, i) => {
  if (f.book && f.book !== book) {
    book = f.book;
    lines.push('', `## ${book}`);
  }
  const { people, places } = peoplePlaces(ref, expand(ref, f.range));
  lines.push('', `### ${i + 1}. ${f.title}`, `- **Range:** ${f.range}`);
  if (f.parallel) lines.push(`- **Parallel:** ${f.parallel}`);
  if (f.frame) lines.push(`- **Frame:** ${f.frame}`);
  lines.push(`- **Lessons:** ${f.lessons.length}`);
  f.lessons.forEach((l, n) => {
    lines.push(`  ${n + 1}. ${l.range} — ${l.title}`);
    if (l.why) lines.push(`     - ${l.why}`);
  });
  if (f.split) lines.push(`- **Split option:** ${f.split}`);
  lines.push(`- **People (${people.length}):** ${names(people)}`, `- **Places (${places.length}):** ${names(places)}`);
  if (f.turn) lines.push(`- **Turn:** ${f.turn}`);
  if (f.notes) lines.push(`- **Notes:** ${f.notes}`);
});

fs.mkdirSync(INGREDIENTS_DIR, { recursive: true });
fs.writeFileSync(out, lines.join('\n') + '\n');
console.log(`wrote ${out} (${plan.length} flavors)`);
