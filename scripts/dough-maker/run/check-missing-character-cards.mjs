// Finds people who are a main topic of a lesson but have no character card. Reads saved data only; no AI.
// Run: CC=<folder with people.json, links.json, verses.json from the database> node --import ./scripts/app/ts-alias.mjs scripts/dough-maker/run/check-missing-character-cards.mjs
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
const T = process.env.CC;
const rows = (f) => { const raw = readFileSync(join(T, f), 'utf8'); return JSON.parse(raw.slice(raw.indexOf('{'))).rows; };
const { BIBLE_OUTLINE } = await import('@/data/bibleOutline');
const people = new Map(rows('people.json').map((p) => [p.id, p]));
const seqOf = new Map(rows('verses.json').map((v) => [v.r, v.s]));
const bySeq = new Map();
for (const l of rows('links.json')) (bySeq.get(l.s) ?? bySeq.set(l.s, []).get(l.s)).push(l.c);
const nameToCode = new Map(BIBLE_OUTLINE.map((b) => [b.name, b.code]));
nameToCode.set("Psalm", nameToCode.get("Psalms"));
const toSeq = (ref) => { const m = ref.match(/^(.+?) (\d+):(\d+)$/); return m ? seqOf.get(`${nameToCode.get(m[1])}.${m[2]}.${m[3]}`) : undefined; };
const lessons = JSON.parse(readFileSync('scripts/dough-maker/output/passages.json', 'utf8'));
const bigDir = 'scripts/dough-maker/output/bigidea';
const folders = new Map(readdirSync(bigDir).map((f) => [Number(f.split(' ')[0]), f]));
const words = (name) => new RegExp(`(^|[^A-Za-z])${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^A-Za-z]|$)`, 'g');
const found = new Map();
let badRefs = 0;
for (const L of lessons) {
  const a = toSeq(L.start), b = toSeq(L.end);
  if (!a || !b) { badRefs++; continue; }
  const counts = new Map();
  for (let s = a; s <= b; s++) for (const c of bySeq.get(s) ?? []) counts.set(c, (counts.get(c) ?? 0) + 1);
  const total = b - a + 1;
  const f = folders.get(L.id);
  const bigFile = f && join(bigDir, f, 'big-idea.json');
  const big = bigFile && existsSync(bigFile) ? JSON.parse(readFileSync(bigFile, 'utf8')).paragraphs.join(' ') : '';
  for (const [c, n] of counts) {
    const p = people.get(c);
    if (!p || p.has_card) continue;
    const inTitle = words(p.name).test(L.title);
    const bigHits = (big.match(words(p.name)) ?? []).length;
    const share = n / total;
    const why = [inTitle && 'in title', bigHits >= 2 && `big idea names them ${bigHits}x`, share >= 0.25 && `in ${Math.round(share * 100)}% of verses`].filter(Boolean);
    if (!why.length) continue;
    const e = found.get(c) ?? { name: p.name, verses: p.verse_count, lessons: [] };
    e.lessons.push(`${L.id} ${L.title} (${L.start}–${L.end.split(' ').pop()}): ${why.join(', ')}`);
    found.set(c, e);
  }
}
const list = [...found.values()].sort((x, y) => y.lessons.length - x.lessons.length || y.verses - x.verses);
console.log(JSON.stringify({ badRefs, people: list.length, inTitle: list.filter((e) => e.lessons.some((l) => l.includes('in title'))).length, list }, null, 1));
