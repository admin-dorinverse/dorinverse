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
import { verses, parseRefs } from './bsb.mjs';
import { PREP_DIR, folder, passing } from './prep.mjs';
import { chat, SONNET_OR } from './openrouter.mjs';
import { json } from './burnt.mjs';
import { SAMPLE_DIR } from './sample-place.mjs';
import { agg } from '../lib.mjs';

const SONNET = { ...SONNET_OR, reasoning: { effort: 'low' }, maxTokens: 16000 };
const BATCH = 40;   // no number limit (owner, 2026-11-15): every place worth it is kept
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const clean = (n) => String(n).replace(/\s*\(.*\)\s*/g, '').trim();

// In the lesson (owner, 2026-11-15): a place qualifies if any Prep card, story or choice, names it, or a card tells
// a verse the database links to it (public.verse_place). Tarshish: the Jonah 1:3 story card leaves the name out, but
// its verse says it and the choice card asks it.
const spread = (a, n) => (a.length <= n ? a : Array.from({ length: n }, (_, i) => a[Math.floor((i * a.length) / n)]));
export function candidates() {
  const V = verses();
  const lower = new Set(V.flatMap((v) => v.text.match(/(?<![\w'-])[a-z][a-z']*(?![\w-])/g) ?? []));
  const places = agg('select id, name, feature_type, verse_count from public.place');
  const links = agg('select vp.place_id id, v.sequence s from public.verse_place vp join public.verse v on v.id = vp.verse_id');
  const versesOf = new Map(); for (const l of links) { if (!versesOf.has(l.id)) versesOf.set(l.id, []); versesOf.get(l.id).push(l.s - 1); }   // sequence 1 = Genesis 1:1
  const byName = new Map();
  for (const p of places) {
    const n = clean(p.name);
    if (!byName.has(n)) byName.set(n, { name: n, ids: [], kinds: new Set(), verses: 0, ks: [],
      // name matching on card text only for names that aren't ordinary words (There, On, Rock)
      re: /^[A-Z]/.test(n) && !(n.split(' ').length === 1 && lower.has(n.toLowerCase())) ? new RegExp(`\\b${esc(n)}(?:'s|’s)?\\b`) : null });
    const e = byName.get(n); e.ids.push(p.id); if (p.feature_type) e.kinds.add(p.feature_type); e.verses += p.verse_count ?? 0; e.ks.push(...(versesOf.get(p.id) ?? []));
  }
  // every verse a card tells, and every card's words
  const told = new Map(), cards = [];
  for (const p of JSON.parse(fs.readFileSync(path.join(OUTPUT, 'passages.json'), 'utf8'))) {
    const prep = JSON.parse(fs.readFileSync(path.join(PREP_DIR, folder(p), 'prep.json'), 'utf8'));
    for (const s of prep.stops) for (const c of s.cards) {
      const text = c.kind === 'story' ? c.text : `${c.question} ${(c.answers ?? []).filter((a) => a.correct).map((a) => a.text).join(' ')}`;
      cards.push({ pid: p.id, text });
      for (const [a, b] of parseRefs(c.verses) ?? []) for (let k = a; k <= b; k++) if (!told.has(k)) told.set(k, p.id);
    }
  }
  const out = [];
  for (const e of byName.values()) {
    const ks = [...new Set(e.ks)].filter((k) => told.has(k)).sort((a, b) => a - b);
    const onCards = e.re ? cards.filter((c) => e.re.test(c.text)) : [];
    if (!ks.length && !onCards.length) continue;
    const passages = new Set([...ks.map((k) => told.get(k)), ...onCards.map((c) => c.pid)]);
    // what the judge sees: verses naming it, and card lines naming it, from across the Bible
    const sample = [...spread(ks, 8).map((k) => `${V[k].ref}: ${V[k].text}`),
      ...spread(onCards, 4).map((c) => 'Card: ' + (c.text.split(/(?<=[.!?])\s+/).find((x) => e.re.test(x)) ?? c.text).slice(0, 200))];
    out.push({ name: e.name, ids: e.ids, kinds: [...e.kinds], verses: e.verses, passages: passages.size, sample });
  }
  return out.sort((a, b) => b.passages - a.passages);
}

export async function shortlist({ chatFn = chat, out = SAMPLE_DIR } = {}) {
  const list = candidates();
  const judged = new Map();
  let cost = 0, unread = 0, refused = 0;
  for (let i = 0; i < list.length; i += BATCH) {
    const batch = list.slice(i, i + BATCH);
    // Worth it (owner, 2026-11-15: no number limit): something happens there that the cards tell, a moment people
    // would remember, or a name that comes up again and again. Only a name in a list of towns isn't.
    const user = `These names come from the lessons in a Bible app for all ages (written for adults; kids use it too). For each:
- place: is it used as a place in these lines from the lesson (not a person or a tribe; Judah can be the man, the tribe or the land)?
- worth: is it worth collecting? Yes if something happens there that the lesson tells, a moment people would remember (Jacob wrestling at the Jabbok, the ark kept at Kiriath-jearim), or if it's a name that comes up again and again (Jerusalem, Egypt). No if it's only a name in a list of towns or borders.
- reason: a few words why.
- known: how well known it is across the Bible (1-10).

${batch.map((p, n) => `${n + 1}. ${p.name} (${p.kinds.join('/') || 'kind unknown'}; in ${p.passages} lessons). In the lesson: ${p.sample.join(' | ')}`).join('\n')}

Reply with only JSON: {"places": [{"n": 1, "place": true, "worth": true, "reason": "...", "known": 8}]} with one entry for every name.`;
    let got = null;
    for (let t = 0; t < 2 && !got; t++) {
      let r;
      try { r = await chatFn({ ...SONNET, system: 'You read the BSB for a Bible app.', user, step: 'sample', role: 'places' }); }
      catch (e) { if (/^403:/.test(String(e.detail ?? ''))) { refused++; break; } if (!passing(e)) throw e; t--; await new Promise((res) => setTimeout(res, 60_000)); continue; }
      cost += r.cost ?? 0;
      const v = json(r.text); if (Array.isArray(v?.places)) got = v.places;
    }
    if (!got) { unread += batch.length; continue; }
    for (const x of got) { const p = batch[x?.n - 1]; if (p) judged.set(p.name, { place: !!x.place, worth: !!x.worth, reason: String(x.reason ?? ''), known: Number(x.known) || 0 }); }
  }
  // every judgment is kept, with its reason; the same place under two names is one entry
  const SAME = { "Zion's": 'Mount Zion', 'Zion': 'Mount Zion', "Jerusalem's": 'Jerusalem', "Samaria's": 'Samaria', "Egypt's": 'Egypt', 'Sinai': 'Mount Sinai', 'Horeb': 'Mount Sinai',
    'Mount Horeb': 'Mount Sinai', 'Hermon': 'Mount Hermon', 'Nebo': 'Mount Nebo', 'Tabor': 'Mount Tabor', 'Gilboa': 'Mount Gilboa', 'Moriah': 'Mount Moriah', 'Carmel': 'Mount Carmel',
    'Most Holy': 'Most Holy Place', 'Sea of Tiberias': 'Sea of Galilee', 'Jezreel': 'Valley of Jezreel', 'Ramoth': 'Ramoth-gilead', 'Paddan': 'Paddan-aram', 'Jabesh': 'Jabesh-gilead', 'Kiriath-arba': 'Hebron' };
  const all = list.filter((p) => judged.has(p.name)).map(({ sample, ...p }) => ({ ...p, ...judged.get(p.name) }));
  const merged = new Map();
  for (const p of all.filter((x) => x.place)) {
    const to = SAME[p.name] ?? p.name;
    if (!merged.has(to)) merged.set(to, { name: to, ids: [], also: [], kinds: p.kinds, passages: 0, known: 0, worth: false, reason: '' });
    const m = merged.get(to); m.ids.push(...p.ids); if (p.name !== to) m.also.push(p.name); m.passages += p.passages;
    if (p.known > m.known) { m.known = p.known; m.reason = p.reason; } if (p.worth) { m.worth = true; if (!m.reason) m.reason = p.reason; }
  }
  const places = [...merged.values()].map((p) => ({ ...p, ids: [...new Set(p.ids)] })).sort((a, b) => b.known - a.known || b.passages - a.passages);
  const short = places.filter((p) => p.worth);
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'places-shortlist.json'), JSON.stringify({ made: new Date().toISOString(), candidates: list.length, real_places: places.length, worth: short.length, unread, refused, cost,
    shortlist: short, left_out: places.filter((p) => !p.worth), not_places: all.filter((p) => !p.place).map((p) => ({ name: p.name, reason: p.reason })) }, null, 1) + '\n');
  const row = (p) => [p.worth ? 'yes' : 'no', p.known, `"${p.name}"`, `"${p.also.join(' / ')}"`, p.kinds.join('/'), p.passages, `"${p.reason.replace(/"/g, '""')}"`].join(',');
  fs.writeFileSync(path.join(out, 'places-shortlist.csv'), 'keep,known,place,also_named,kind,passages_on_cards,reason\n' + [...short, ...places.filter((p) => !p.worth)].map(row).join('\n') + '\n');
  return { candidates: list.length, realPlaces: places.length, worth: short.length, unread, refused, cost };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.includes('--dry')) { const c = candidates(); console.log('candidates after the free filter:', c.length, '| top:', c.slice(0, 30).map((p) => p.name).join(', ')); }
  else console.log(JSON.stringify(await shortlist()));
}
