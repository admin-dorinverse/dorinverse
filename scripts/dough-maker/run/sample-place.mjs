// Sample Table (sample-table.md), the free part: where the Ten Commandments, the prophecy halves and the characters
// sit. A cookie sits on the Prep story card that tells its verse (never a choice card); if no story card tells the
// first verse, the next verse that one does.
//   - Ten Commandments: one pack, from Exodus 20, on the story card that tells the first commandment (20:3).
//   - Prophecy: each half of each approved link (data/prophecy-links.json), on the card that tells its first verse.
//   - Characters: each of the 270 character cards once, in the first passage with a story card telling one of its
//     verses (the database's character_card_verse).
// Writes output/sample/ten-commandments.json, prophecy.json, characters.json. Free: no model.
import fs from 'node:fs';
import path from 'node:path';
import { OUTPUT } from './events.mjs';
import { verses, verseIndex, parseRefs } from './bsb.mjs';
import { PREP_DIR, folder } from './prep.mjs';
import { agg } from '../lib.mjs';

export const SAMPLE_DIR = path.join(OUTPUT, 'sample');
const DATA = path.join(OUTPUT, '..', 'data');
const V = verses();
const readJson = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const writeJson = (f, d) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(d, null, 1) + '\n'); };

// verse index -> the story cards that tell it, in Bible order
export function storyCards() {
  const tells = new Map();
  for (const p of readJson(path.join(OUTPUT, 'passages.json'))) {
    const prep = readJson(path.join(PREP_DIR, folder(p), 'prep.json'));
    for (const s of prep.stops) for (const c of s.cards) {
      if (c.kind !== 'story') continue;
      for (const [a, b] of parseRefs(c.verses) ?? []) for (let k = a; k <= b; k++) {
        if (!tells.has(k)) tells.set(k, []);
        tells.get(k).push({ passage_id: p.id, stop: s.stop, card: c.card });
      }
    }
  }
  return tells;
}
// the first of these verses that a story card tells, and that card
const place = (tells, ks) => { for (const k of [...ks].sort((a, b) => a - b)) if (tells.has(k)) return { k, ...tells.get(k)[0] }; return null; };
const ref = (k) => V[k].ref;
const span = (a, b) => (a === b ? ref(a) : `${ref(a)}-${V[b].ref.split(':')[1]}`);

export function placeAll() {
  const tells = storyCards();
  const out = { made: new Date().toISOString() };

  // Ten Commandments (Exodus 20:3-17)
  const TEN = [['20:3', '20:3'], ['20:4', '20:6'], ['20:7', '20:7'], ['20:8', '20:11'], ['20:12', '20:12'], ['20:13', '20:13'], ['20:14', '20:14'], ['20:15', '20:15'], ['20:16', '20:16'], ['20:17', '20:17']];
  const ten = TEN.map(([a, b]) => { const i = verseIndex(`Exodus ${a}`), j = verseIndex(`Exodus ${b}`); return { text: V[i].text, reference: span(i, j), k: i }; });
  // the pack sits on the first story card that tells any commandment (Exodus 20:3 and 20:4 are told only on choice cards)
  const at = place(tells, TEN.flatMap(([a, b]) => { const out = []; for (let k = verseIndex(`Exodus ${a}`); k <= verseIndex(`Exodus ${b}`); k++) out.push(k); return out; }));
  out.tenCommandments = at ? { type: 'ten_commandments', passage_id: at.passage_id, stop: at.stop, card: at.card,
    commandments: ten.map(({ text, reference }) => ({ text, reference })) } : null;

  // Prophecy halves
  const links = readJson(path.join(DATA, 'prophecy-links.json'));
  const list = Array.isArray(links) ? links : (links.links ?? Object.values(links)[0]);
  out.prophecy = [], out.prophecyNotPlaced = [];
  for (const l of list) for (const half of ['promise', 'fulfillment']) for (const r of l[half] ?? []) {
    const bk = r.book === 'Psalms' ? 'Psalm' : r.book;   // the list says Psalms; the BSB's book name is Psalm
    const i = verseIndex(`${bk} ${r.chapter}:${r.verse_start}`), j = verseIndex(`${bk} ${r.chapter}:${r.verse_end ?? r.verse_start}`);
    if (i == null || j == null) { out.prophecyNotPlaced.push({ link_id: l.id, half, ref: r.ref, why: 'not a BSB verse' }); continue; }
    const ks = []; for (let k = i; k <= j; k++) ks.push(k);
    const p = place(tells, ks);
    if (!p) { out.prophecyNotPlaced.push({ link_id: l.id, half, ref: r.ref, why: 'no story card tells it' }); continue; }
    out.prophecy.push({ type: 'prophecy', passage_id: p.passage_id, stop: p.stop, card: p.card, link_id: l.id, title: l.title, half,
      quote: ks.map((k) => V[k].text).join(' '), reference: span(i, j) });
  }

  // Characters, each once
  const rows = agg(`select c.bible_character_id id, c.name, c.name_tag, v.sequence s from public.character_card c
    join public.character_card_verse cv on cv.bible_character_id = c.bible_character_id join public.verse v on v.id = cv.verse_id`);
  const by = new Map();
  for (const r of rows) { if (!by.has(r.id)) by.set(r.id, { name: r.name, name_tag: r.name_tag, ks: [] }); by.get(r.id).ks.push(r.s - 1); }   // sequence 1 = Genesis 1:1
  out.characters = [], out.charactersNotPlaced = [];
  for (const [id, c] of by) {
    const p = place(tells, c.ks);
    if (!p) { out.charactersNotPlaced.push({ character_id: id, name: c.name, why: 'no story card tells any of their verses' }); continue; }
    out.characters.push({ type: 'character', passage_id: p.passage_id, stop: p.stop, card: p.card, character_id: id, name: c.name, name_tag: c.name_tag, first_verse: ref(p.k) });
  }
  out.characters.sort((a, b) => a.passage_id - b.passage_id || a.stop - b.stop || a.card - b.card);
  return out;
}

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  const r = placeAll();
  writeJson(path.join(SAMPLE_DIR, 'ten-commandments.json'), r.tenCommandments);
  writeJson(path.join(SAMPLE_DIR, 'prophecy.json'), { made: r.made, halves: r.prophecy, not_placed: r.prophecyNotPlaced });
  writeJson(path.join(SAMPLE_DIR, 'characters.json'), { made: r.made, characters: r.characters, not_placed: r.charactersNotPlaced });
  console.log(`Ten Commandments: ${r.tenCommandments ? 'passage ' + r.tenCommandments.passage_id + ', stop ' + r.tenCommandments.stop + ', card ' + r.tenCommandments.card : 'NOT PLACED'}`);
  console.log(`Prophecy halves placed: ${r.prophecy.length} | not placed: ${r.prophecyNotPlaced.length}`);
  console.log(`Characters placed: ${r.characters.length} | not placed: ${r.charactersNotPlaced.length}`);
}
