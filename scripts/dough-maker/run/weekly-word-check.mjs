// Checks the Weekly Word candidates against the BSB: is each word in it, spelled that way, and how often. Free: no
// model is called. Reads output/weekly-word/candidates.json and writes output/weekly-word/bsb-check.json.
//
//   node scripts/dough-maker/run/weekly-word-check.mjs
import fs from 'node:fs';
import path from 'node:path';
import { verses } from './bsb.mjs';
import { OUTPUT } from './events.mjs';

const dir = path.join(OUTPUT, 'weekly-word');
const candidates = JSON.parse(fs.readFileSync(path.join(dir, 'candidates.json'), 'utf8'));
const text = verses().filter((v) => !v.leftOut);

/** Counts the verses that hold the word as a whole word (any case), and gives the first one. */
function lookUp(word) {
  const pattern = new RegExp(`(^|[^A-Za-z’'])${word.replace(/ /g, '\\s+')}($|[^A-Za-z])`, 'i');
  const hits = text.filter((v) => pattern.test(v.text));
  return { verses: hits.length, first: hits[0]?.ref ?? null };
}

const seen = new Set();
const result = {};
for (const [kind, words] of Object.entries(candidates)) {
  result[kind] = words.map((word) => {
    const repeat = seen.has(word.toLowerCase());
    seen.add(word.toLowerCase());
    return { word, repeat, ...lookUp(word) };
  });
}
fs.writeFileSync(path.join(dir, 'bsb-check.json'), JSON.stringify(result, null, 2) + '\n');
for (const [kind, rows] of Object.entries(result)) {
  const bad = rows.filter((r) => !r.verses || r.repeat);
  console.log(`${kind}: ${rows.length} words, not in BSB or repeated: ${bad.map((r) => `${r.word}${r.repeat ? ' (repeat)' : ''}`).join(', ') || 'none'}`);
}
