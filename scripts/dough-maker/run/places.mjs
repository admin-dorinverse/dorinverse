// Sample Table place cookies (sample-table.md "Place cookies"), step 1: the shortlist the owner picks from.
//   1. Free: every database place (public.place) named in the text of a Prep story card. Names that are ordinary
//      words in the BSB (There, On, River, Rock) are dropped; "Egypt's" counts as Egypt; places sharing a name are one
//      entry with all their ids.
//   2. Sonnet, in batches: is the name used as a place on those cards (Judah can be the man, the tribe or the land),
//      and how well known and important is the place across the Bible (1-10)?
//   3. The shortlist: real places, best known first -> output/sample/places-shortlist.json and .csv for review.
//   node scripts/dough-maker/run/places.mjs [--dry]
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { OUTPUT } from './events.mjs';
import { verses } from './bsb.mjs';
import { PREP_DIR, folder, passing } from './prep.mjs';
import { chat, SONNET_OR } from './openrouter.mjs';
import { json } from './burnt.mjs';
import { SAMPLE_DIR } from './sample-place.mjs';
import { agg } from '../lib.mjs';

const SONNET = { ...SONNET_OR, reasoning: { effort: 'low' }, maxTokens: 16000 };
const BATCH = 80, TOP = 150;
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const clean = (n) => String(n).replace(/\s*\(.*\)\s*/g, '').trim();

export function candidates() {
  const lower = new Set(verses().flatMap((v) => v.text.match(/(?<![\w'-])[a-z][a-z']*(?![\w-])/g) ?? []));
  const places = agg('select id, name, feature_type, verse_count from public.place');
  const byName = new Map();
  for (const p of places) {
    const n = clean(p.name);
    if (!/^[A-Z]/.test(n) || (n.split(' ').length === 1 && lower.has(n.toLowerCase()))) continue;   // an ordinary word: There, On, Rock
    if (!byName.has(n)) byName.set(n, { name: n, ids: [], kinds: new Set(), verses: 0, re: new RegExp(`\\b${esc(n)}(?:'s|’s)?\\b`) });
    const e = byName.get(n); e.ids.push(p.id); if (p.feature_type) e.kinds.add(p.feature_type); e.verses += p.verse_count ?? 0;
  }
  const list = [...byName.values()];
  const found = new Map();
  for (const p of JSON.parse(fs.readFileSync(path.join(OUTPUT, 'passages.json'), 'utf8'))) {
    const prep = JSON.parse(fs.readFileSync(path.join(PREP_DIR, folder(p), 'prep.json'), 'utf8'));
    for (const s of prep.stops) for (const c of s.cards) if (c.kind === 'story') for (const e of list) if (e.re.test(c.text)) {
      if (!found.has(e.name)) found.set(e.name, { name: e.name, ids: e.ids, kinds: [...e.kinds], verses: e.verses, passages: new Set(), sample: [] });
      const f = found.get(e.name); f.passages.add(p.id);
      if (f.sample.length < 3) f.sample.push(c.text.split(/(?<=[.!?])\s+/).find((x) => e.re.test(x)) ?? c.text.slice(0, 160));
    }
  }
  return [...found.values()].map((f) => ({ ...f, passages: f.passages.size })).sort((a, b) => b.passages - a.passages);
}

export async function shortlist({ chatFn = chat, out = SAMPLE_DIR } = {}) {
  const list = candidates();
  const judged = new Map();
  let cost = 0, unread = 0, refused = 0;
  for (let i = 0; i < list.length; i += BATCH) {
    const batch = list.slice(i, i + BATCH);
    const user = `These names come from story cards in a Bible app for all ages (written for adults; kids use it too). For each: is it used as a place on these cards (not a person or a tribe; Judah can be the man, the tribe or the land), and how well known and important is the place across the Bible (1-10, where Jerusalem is 10 and a town named once in a border list is 1)?\n\n${batch.map((p, n) => `${n + 1}. ${p.name} (${p.kinds.join('/') || 'kind unknown'}; named on cards in ${p.passages} passages). E.g.: ${p.sample.join(' | ')}`).join('\n')}\n\nReply with only JSON: {"places": [{"n": 1, "place": true, "known": 8}]} with one entry for every name.`;
    let got = null;
    for (let t = 0; t < 2 && !got; t++) {
      let r;
      try { r = await chatFn({ ...SONNET, system: 'You read the BSB for a Bible app.', user, step: 'sample', role: 'places' }); }
      catch (e) { if (/^403:/.test(String(e.detail ?? ''))) { refused++; break; } if (!passing(e)) throw e; t--; await new Promise((res) => setTimeout(res, 60_000)); continue; }
      cost += r.cost ?? 0;
      const v = json(r.text); if (Array.isArray(v?.places)) got = v.places;
    }
    if (!got) { unread += batch.length; continue; }
    for (const x of got) { const p = batch[x?.n - 1]; if (p) judged.set(p.name, { place: !!x.place, known: Number(x.known) || 0 }); }
  }
  const real = list.filter((p) => judged.get(p.name)?.place).map((p) => ({ ...p, known: judged.get(p.name).known }))
    .sort((a, b) => b.known - a.known || b.passages - a.passages);
  const short = real.slice(0, TOP);
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'places-shortlist.json'), JSON.stringify({ made: new Date().toISOString(), candidates: list.length, real_places: real.length, unread, refused, cost,
    shortlist: short.map(({ sample, ...p }) => p), not_places: list.filter((p) => judged.has(p.name) && !judged.get(p.name).place).map((p) => p.name) }, null, 1) + '\n');
  fs.writeFileSync(path.join(out, 'places-shortlist.csv'), 'keep,known,place,kind,passages_on_cards\n' + short.map((p) => ['yes', p.known, `"${p.name}"`, p.kinds.join('/'), p.passages].join(',')).join('\n') + '\n');
  return { candidates: list.length, realPlaces: real.length, shortlist: short.length, unread, refused, cost };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.includes('--dry')) { const c = candidates(); console.log('candidates after the free filter:', c.length, '| top:', c.slice(0, 30).map((p) => p.name).join(', ')); }
  else console.log(JSON.stringify(await shortlist()));
}
