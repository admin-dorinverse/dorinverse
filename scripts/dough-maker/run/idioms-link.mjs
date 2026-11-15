// Idioms (idioms.md), the free part: links the idiom list to passages and Prep cards, and keeps only what the app
// will show (the owner's choice, 2026-11-15). For each idiom:
//   - each occurrence gets passage_id: the passage whose range holds its verse;
//   - cards: every Prep card in that passage whose text has the idiom's wording, as { passage_id, stop, card };
//   - an occurrence whose passage has no card with the wording is dropped, and an idiom left with none is dropped.
// The full list of 1,022 is in git history (data/idioms.json before 2026-11-15).
//
//   node scripts/dough-maker/run/idioms-link.mjs [--dry]
import fs from 'node:fs';
import path from 'node:path';
import { OUTPUT } from './events.mjs';
import { verseIndex } from './bsb.mjs';
import { PREP_DIR, folder } from './prep.mjs';

const FILE = path.join(OUTPUT, '..', 'data', 'idioms.json');
const norm = (s) => ' ' + String(s ?? '').toLowerCase().replace(/[‘’]/g, "'").replace(/[^a-z' ]+/g, ' ').replace(/\s+/g, ' ').trim() + ' ';
const cardText = (c) => c.kind === 'story' ? c.text : `${c.question} ${(c.answers ?? []).map((a) => a.text).join(' ')}`;

export function link(idioms, passages) {
  const ranges = passages.map((p) => [verseIndex(p.start), verseIndex(p.end), p]);
  const prep = new Map();
  const cardsOf = (p) => {
    if (!prep.has(p.id)) {
      const j = JSON.parse(fs.readFileSync(path.join(PREP_DIR, folder(p), 'prep.json'), 'utf8'));
      prep.set(p.id, j.stops.flatMap((s) => s.cards.map((c) => ({ stop: s.stop, card: c.card, text: norm(cardText(c)) }))));
    }
    return prep.get(p.id);
  };
  const kept = [];
  for (const i of idioms) {
    const want = norm(i.idiom), occurrences = [], cards = [];
    for (const o of i.occurrences) {
      const v = verseIndex(o.verse), r = ranges.find(([a, b]) => v >= a && v <= b);
      if (!r) continue;
      const hits = cardsOf(r[2]).filter((c) => c.text.includes(want));
      if (!hits.length) continue;
      occurrences.push({ ...o, passage_id: r[2].id });
      for (const h of hits) if (!cards.some((c) => c.passage_id === r[2].id && c.stop === h.stop && c.card === h.card)) cards.push({ passage_id: r[2].id, stop: h.stop, card: h.card });
    }
    if (occurrences.length) kept.push({ ...i, occurrences, cards });
  }
  return kept;
}

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  const all = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  const passages = JSON.parse(fs.readFileSync(path.join(OUTPUT, 'passages.json'), 'utf8'));
  const kept = link(all, passages);
  const refs = kept.reduce((k, i) => k + i.occurrences.length, 0), cards = kept.reduce((k, i) => k + i.cards.length, 0);
  console.log(`${all.length} idioms -> ${kept.length} kept, ${refs} references, ${cards} card links`);
  if (!process.argv.includes('--dry')) fs.writeFileSync(FILE, JSON.stringify(kept, null, 2) + '\n');
}
