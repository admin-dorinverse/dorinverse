// Sample Table (sample-table.md), the last free step: every list together, one file per passage, in the doc's shape.
//   output/sample/ten-commandments.json, prophecy.json, characters.json  (run/sample-place.mjs)
//   output/sample/prayers.json, commands-shortlist.json                  (run/sample-lists.mjs, then the owner's review)
// Owner's calls, 2026-11-15: cut Hannah's prayer and the Pharisee's; keep all 52 commands; a prophecy half told only on
// a choice card sits on the nearest story card in the same stop.
// Writes output/sample/passages/<id and range>.json and output/sample/sample-table.json. Checks every cookie sits on
// a story card that exists.
import fs from 'node:fs';
import path from 'node:path';
import { OUTPUT } from './events.mjs';
import { verseIndex, parseRefs } from './bsb.mjs';
import { PREP_DIR, folder } from './prep.mjs';
import { SAMPLE_DIR } from './sample-place.mjs';

const readJson = (f) => JSON.parse(fs.readFileSync(path.join(SAMPLE_DIR, f), 'utf8'));
const writeJson = (f, d) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(d, null, 1) + '\n'); };
const passages = JSON.parse(fs.readFileSync(path.join(OUTPUT, 'passages.json'), 'utf8'));
const byId = new Map(passages.map((p) => [p.id, p]));
const prepOf = new Map();
const prep = (pid) => { if (!prepOf.has(pid)) prepOf.set(pid, JSON.parse(fs.readFileSync(path.join(PREP_DIR, folder(byId.get(pid)), 'prep.json'), 'utf8'))); return prepOf.get(pid); };
const cookies = [];
const add = (c) => cookies.push(c);

// Ten Commandments: one pack
const ten = readJson('ten-commandments.json');
add({ type: 'ten_commandments', passage_id: ten.passage_id, stop: ten.stop, card: ten.card, commandments: ten.commandments });

// Commands: the 52
for (const c of readJson('commands-shortlist.json').shortlist)
  add({ type: 'instruction', passage_id: c.passage_id, stop: c.stop, card: c.card, instruction: c.instruction, who: c.who, reason: c.reason ?? null, reference: c.reference });

// Prayers: less the two the owner cut
const CUT = new Set(['1 Samuel 2:1-10', 'Luke 18:11-12']);
for (const p of readJson('prayers.json').prayers.filter((x) => !CUT.has(x.reference)))
  add({ type: 'prayer', passage_id: p.passage_id, stop: p.stop, card: p.card, who: p.who, what_just_happened: p.what_just_happened, reference: p.reference, key_line: p.key_line });

// Prophecy: the placed halves, and the 4 told only on choice cards on the nearest story card in their stop
const pro = readJson('prophecy.json');
for (const h of pro.halves) add({ type: 'prophecy', passage_id: h.passage_id, stop: h.stop, card: h.card, link_id: h.link_id, half: h.half, quote: h.quote, reference: h.reference });
const links = JSON.parse(fs.readFileSync(path.join(OUTPUT, '..', 'data', 'prophecy-links.json'), 'utf8'));
const linkList = Array.isArray(links) ? links : (links.links ?? Object.values(links)[0]);
const { verses } = await import('./bsb.mjs');
const V = verses();
const stillOut = [];
for (const n of pro.not_placed) {
  const k = verseIndex(n.ref);
  const p = passages.find((x) => k >= verseIndex(x.start) && k <= verseIndex(x.end));
  let best = null;
  for (const s of prep(p.id).stops) for (const c of s.cards) {
    if (c.kind === 'story' || !(parseRefs(c.verses) ?? []).some(([a, b]) => k >= a && k <= b)) continue;
    // the choice card telling it: the nearest story card in the same stop (an earlier one wins a tie)
    const story = s.cards.filter((x) => x.kind === 'story').sort((a, b) => Math.abs(a.card - c.card) - Math.abs(b.card - c.card) || a.card - b.card)[0];
    if (story && !best) best = { stop: s.stop, card: story.card };
  }
  if (!best) { stillOut.push(n); continue; }
  add({ type: 'prophecy', passage_id: p.id, stop: best.stop, card: best.card, link_id: n.link_id, half: n.half, quote: V[k].text, reference: n.ref, placed_by: 'nearest story card (told only on a choice card)' });
}

// Characters: each once
for (const c of readJson('characters.json').characters) add({ type: 'character', passage_id: c.passage_id, stop: c.stop, card: c.card, character_id: c.character_id, name: c.name });

// check: every cookie on a story card that exists
const bad = cookies.filter((c) => { const s = prep(c.passage_id).stops.find((x) => x.stop === c.stop); const card = s?.cards.find((x) => x.card === c.card); return !card || card.kind !== 'story'; });
// every link whole?
const halves = (id, h) => cookies.filter((c) => c.type === 'prophecy' && c.link_id === id && c.half === h).length;
const broken = linkList.filter((l) => !halves(l.id, 'promise') || !halves(l.id, 'fulfillment')).map((l) => l.id);

const per = new Map();
for (const c of cookies) { const { passage_id, ...rest } = c; if (!per.has(passage_id)) per.set(passage_id, []); per.get(passage_id).push(rest); }
fs.rmSync(path.join(SAMPLE_DIR, 'passages'), { recursive: true, force: true });
for (const [pid, list] of per) writeJson(path.join(SAMPLE_DIR, 'passages', folder(byId.get(pid)) + '.json'), { cookies: list.sort((a, b) => a.stop - b.stop || a.card - b.card) });
const count = {}; for (const c of cookies) count[c.type] = (count[c.type] ?? 0) + 1;
writeJson(path.join(SAMPLE_DIR, 'sample-table.json'), { made: new Date().toISOString(), counts: count, passages_with_cookies: per.size, cookies });
console.log('cookies:', JSON.stringify(count), '| passages with cookies:', per.size, 'of', passages.length);
console.log('not on a story card:', bad.length, '| prophecy halves still not placed:', stillOut.length, '| links that can\'t be made whole:', broken.join(', ') || 'none');
