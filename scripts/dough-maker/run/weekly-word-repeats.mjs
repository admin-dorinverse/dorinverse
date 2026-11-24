// Finds Weekly Word clues that tell the same fact as a clue of another word (owner, 2026-11-23: rewrite one clue in
// each such pair). Free: no model is called. Two clues are a repeat when they cite a shared verse and at least half
// the longer words of the shorter clue are in the other.
//
//   node scripts/dough-maker/run/weekly-word-repeats.mjs           counts the repeats
//   node scripts/dough-maker/run/weekly-word-repeats.mjs --mark    also sets up a redo for one clue of each pair,
//                                                                  then weekly-word.mjs --words <the list> rewrites them
import fs from 'node:fs';
import path from 'node:path';
import { parseRefs, verses } from './bsb.mjs';
import { DIR, wordList } from './weekly-word.mjs';

const CLUES = path.join(DIR, 'clues');
const readJson = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };
const longWords = (s) => new Set(String(s).toLowerCase().match(/[a-z]{4,}/g) ?? []);

/** How alike two clues read: the share of the shorter clue's longer words found in the other. */
function alike(a, b) {
  const A = longWords(a), B = longWords(b);
  let n = 0;
  for (const w of A) if (B.has(w)) n++;
  return n / Math.max(1, Math.min(A.size, B.size));
}

/** Every pair of clues from different words that tell the same fact. */
export function repeats() {
  const words = wordList().map((w) => readJson(path.join(CLUES, w, 'done.json'))).filter((d) => d && !d.swap);
  const byVerse = new Map();
  for (const d of words) d.clues.forEach((c, i) => {
    for (const [a, b] of parseRefs(c.reference) ?? []) for (let k = a; k <= b; k++) {
      if (!byVerse.has(k)) byVerse.set(k, []);
      byVerse.get(k).push({ word: d.word, n: i + 1, text: c.text });
    }
  });
  const pairs = new Map();
  for (const list of byVerse.values()) for (let x = 0; x < list.length; x++) for (let y = x + 1; y < list.length; y++) {
    const [A, B] = [list[x], list[y]];
    if (A.word === B.word || alike(A.text, B.text) < 0.5) continue;
    pairs.set([`${A.word}#${A.n}`, `${B.word}#${B.n}`].sort().join('|'), [A, B]);
  }
  return [...pairs.values()];
}

// Which clue of a pair is rewritten: one that names the other word is really about it; otherwise the word the Bible
// says more about, since it has more facts to choose from.
const count = new Map();
const versesOf = (w) => count.get(w) ?? count.set(w, verses().filter((v) => new RegExp(`(^|[^A-Za-z])${w}($|[^A-Za-z])`, 'i').test(v.text)).length).get(w);
function toRedo([A, B]) {
  const names = (c, w) => new RegExp(`(^|[^A-Za-z])${w}($|[^A-Za-z])`, 'i').test(c.text);
  if (names(B, A.word) && !names(A, B.word)) return [B, A];
  if (names(A, B.word) && !names(B, A.word)) return [A, B];
  return versesOf(A.word) >= versesOf(B.word) ? [A, B] : [B, A];
}

if (process.argv[1]?.endsWith('weekly-word-repeats.mjs')) {
  const pairs = repeats();
  console.log(`${pairs.length} pairs of clues tell the same fact.`);
  if (process.argv.includes('--mark')) {
    const plan = new Map();
    for (const p of pairs) {
      const [redo, keep] = toRedo(p);
      const e = plan.get(redo.word) ?? plan.set(redo.word, { replace: new Set(), taken: [] }).get(redo.word);
      e.replace.add(redo.n);
      e.taken.push(keep.text);
    }
    for (const [word, e] of plan) {
      const dir = path.join(CLUES, word), was = readJson(path.join(dir, 'done.json'));
      const old = path.join(dir, `v${fs.readdirSync(dir).filter((f) => /^v\d+$/.test(f)).length + 1}`);
      fs.mkdirSync(old);
      for (const f of fs.readdirSync(dir)) if (f.endsWith('.json')) fs.renameSync(path.join(dir, f), path.join(old, f));
      fs.writeFileSync(path.join(dir, 'redo.json'), JSON.stringify({ was: { accepted: was.accepted, clues: was.clues },
        replace: [...e.replace].sort((a, b) => a - b), taken: e.taken }, null, 2) + '\n');
    }
    console.log(`Set up ${plan.size} words to redo:\n${[...plan.keys()].join(',')}`);
  }
}
