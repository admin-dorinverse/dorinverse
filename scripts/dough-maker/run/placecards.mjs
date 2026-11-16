// Place cards (sample-table.md "Place cookies"), the writing (owner, 2026-11-15): for each place on the approved
// list (output/sample/places-shortlist.json, 396), a one-line description and its biblical moments, plus its kind
// when the database has none. The rest of the card is the database's (map, verses, connected characters) and the
// photo (data/place-images/).
//   1. Free: its lesson verses (verses public.verse_place links to it that a Prep card tells), its sources (Easton's
//      through public.dictionary_entry_place; Smith's and Schaff's by name) and Theographic's events there, as hints.
//   2. Sonnet writes: one line (1 sentence, about 25 words), 1 to 5 moments (a short title, 1 or 2 sentences, the
//      passage), and the kind if missing. Only what the verses and sources say.
//   3. The script checks the shape, lengths, that every moment's passage is real and includes one of the place's
//      lesson verses, and the copy check. Terra checks it's true to the verses and sources and the moment happens
//      there. Sonnet fixes up to 2 times, then a final fix; the script checks that fix too. No flags.
// Saved per place under output/sample/place-cards/<lookup>/ as it goes, and together in output/sample/place-cards.json.
//   node scripts/dough-maker/run/placecards.mjs [--names Bethlehem,Jabbok] [--limit 20] [--agents 20]
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { OUTPUT, logEvent, notify } from './events.mjs';
import { verses, parseRefs } from './bsb.mjs';
import { saveToGit } from './save.mjs';
import { PREP_DIR, folder, passing } from './prep.mjs';
import { chat, SONNET_OR } from './openrouter.mjs';
import { json } from './burnt.mjs';
import { copied } from './copycheck.mjs';
import { sentences } from './answers.mjs';
import { agg } from '../lib.mjs';

const STEP = 'place_cards';
const DIR = path.join(OUTPUT, 'sample', 'place-cards');
const DATA = path.join(OUTPUT, '..', 'data');
const WAIT = Number(process.env.DOUGH_WAIT_MS) || 5 * 60_000;
const SONNET = { ...SONNET_OR, reasoning: { effort: 'low' }, maxTokens: 16000 };
const TERRA = { model: 'openai/gpt-6.1-terra', only: ['openai'], name: 'gpt-6.1-terra', maxTokens: 16000 };
const AUD = 'a Bible app for all ages (written for adults; kids use it too)';
const LINE_WORDS = 30, MOMENT_WORDS = 45, MAX_MOMENTS = 5, VERSES_SHOWN = 30, SOURCE_CHARS = 1500;
const KINDS = ['City', 'Region', 'Mountain', 'Water', 'Valley', 'Island', 'Landmark', 'Path'];

const readJson = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };
function writeJson(f, d) { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f + '.tmp', JSON.stringify(d, null, 2) + '\n'); fs.renameSync(f + '.tmp', f); }
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const words = (s) => String(s ?? '').trim().split(/\s+/).filter(Boolean).length;
const clip = (s, n = SOURCE_CHARS) => { const t = String(s ?? '').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n).replace(/\s\S*$/, '') + '…' : t; };
const spread = (a, n) => (a.length <= n ? a : Array.from({ length: n }, (_, i) => a[Math.floor((i * a.length) / n)]));

export function material() {
  const V = verses();
  const list = readJson(path.join(OUTPUT, 'sample', 'places-shortlist.json')).shortlist;
  const ids = [...new Set(list.flatMap((p) => p.ids))].map((i) => `'${i}'`).join(',');
  const places = agg(`select id, lookup, name, feature_type, latitude, longitude from public.place where id in (${ids})`);
  const links = agg(`select vp.place_id id, v.sequence s from public.verse_place vp join public.verse v on v.id = vp.verse_id where vp.place_id in (${ids})`);
  const easton = agg(`select dp.place_id id, e.text from public.dictionary_entry_place dp join public.dictionary_entry e on e.id = dp.dictionary_entry_id where dp.place_id in (${ids})`);
  // verses a Prep card tells
  const told = new Set();
  for (const p of readJson(path.join(OUTPUT, 'passages.json'))) {
    const prep = readJson(path.join(PREP_DIR, folder(p), 'prep.json'));
    for (const s of prep.stops) for (const c of s.cards) for (const [a, b] of parseRefs(c.verses) ?? []) for (let k = a; k <= b; k++) told.add(k);
  }
  const book = (f) => { const m = new Map(); for (const e of readJson(path.join(DATA, 'dictionaries', f)).entries) { const k = String(e.term).toLowerCase(); m.set(k, [...(m.get(k) ?? []), e.definition]); } return m; };
  const smith = book('smith.json'), schaff = book('schaff.json');
  // the kind: the database's, else OpenBible's place type (owner, 2026-11-15: never invented; no source, no kind)
  const OB = path.join(OUTPUT, '..', 'run', '.cache', 'openbible');
  const obTypes = new Map(fs.readFileSync(path.join(OB, 'ancient.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l)).map((a) => [a.id, a.types ?? []]));
  const obOf = new Map();
  for (const f of readJson(path.join(OB, 'bible-places.geojson')).features) {
    const ls = (f.links ?? []).map((l) => l.identifier);
    const ob = ls.map((u) => /openbible\.info\/geo\/ancient\/(a[0-9a-f]+)/.exec(u)?.[1]).filter(Boolean);
    for (const t of ls.map((u) => /theographic\.netlify\.app\/place\/([^/]+)\//.exec(u)?.[1]).filter(Boolean)) obOf.set(t, [...(obOf.get(t) ?? []), ...ob]);
  }
  const KIND_OF = { settlement: 'City', region: 'Region', 'people group': 'Region', 'district in settlement': 'Region', 'natural area': 'Region',
    mountain: 'Mountain', hill: 'Mountain', 'mountain range': 'Mountain', 'mountain ridge': 'Mountain', 'mountain pass': 'Mountain', promontory: 'Mountain', cliff: 'Mountain',
    river: 'Water', spring: 'Water', 'body of water': 'Water', wadi: 'Water', pool: 'Water', well: 'Water', ford: 'Water', canal: 'Water',
    valley: 'Valley', island: 'Island', road: 'Path',
    gate: 'Landmark', structure: 'Landmark', tree: 'Landmark', altar: 'Landmark', field: 'Landmark', garden: 'Landmark', hall: 'Landmark', rock: 'Landmark',
    'stone heap': 'Landmark', room: 'Landmark', fortification: 'Landmark', mine: 'Landmark', forest: 'Landmark', campsite: 'Landmark' };   // "special": no kind
  const obKind = (lookups) => { for (const l of lookups) for (const a of obOf.get(l) ?? []) for (const t of obTypes.get(a) ?? []) if (KIND_OF[t]) return { kind: KIND_OF[t], from: `OpenBible (${t})` }; return null; };
  const theo = readJson(path.join(OUTPUT, '..', 'run', '.cache', 'theographic', 'places.json')) ?? [];
  const events = new Map((readJson(path.join(OUTPUT, '..', 'run', '.cache', 'theographic', 'events.json')) ?? []).map((e) => [e.id, e.fields?.title]));
  return list.map((p) => {
    const rows = places.filter((x) => p.ids.includes(x.id));
    const lookup = rows[0]?.lookup ?? p.name;
    const ks = [...new Set(links.filter((l) => p.ids.includes(l.id)).map((l) => l.s - 1))].filter((k) => told.has(k)).sort((a, b) => a - b);
    const sources = [];
    const e = [...new Set(easton.filter((x) => p.ids.includes(x.id)).map((x) => x.text))];
    if (e.length) sources.push({ name: "Easton's Bible Dictionary", text: clip(e.join(' | ')) });
    for (const [name, m] of [["Smith's Bible Dictionary", smith], ["Schaff's Dictionary of the Bible", schaff]]) {
      const t = [p.name, ...p.also].flatMap((n) => m.get(n.toLowerCase()) ?? []); if (t.length) sources.push({ name, text: clip(t.join(' | ')) });
    }
    const lookups = rows.map((r) => r.lookup);
    const evs = [...new Set(theo.filter((t) => lookups.includes(t.fields?.placeLookup)).flatMap((t) => t.fields?.eventsHere ?? []).map((id) => events.get(id)).filter(Boolean))];
    const dbKind = rows.find((r) => r.feature_type)?.feature_type ?? null, ob = dbKind ? null : obKind(lookups);
    return { name: p.name, also: p.also, lookup, ids: p.ids, kind: dbKind ?? ob?.kind ?? null, kind_from: dbKind ? 'database' : ob?.from ?? null,
      // each naming verse with a little around it, so what happens there is in view (Jacob wrestles in Genesis
      // 32:24-30; only 32:22 says "Jabbok"); overlapping stretches are shown once
      lessonVerses: ks, shown: (() => { const pick = spread(ks, VERSES_SHOWN / 3), seen = new Set(), out = [];
        for (const k of pick) for (let x = Math.max(0, k - 1); x <= Math.min(V.length - 1, k + 6); x++) if (!seen.has(x)) { seen.add(x); out.push({ ref: V[x].ref, text: V[x].text, names: ks.includes(x) }); }
        return out; })(), sources, events: evs.slice(0, 15) };
  });
}

// --- prompts ---------------------------------------------------------------------------------------------------------
const RULES = `You write place cards for ${AUD}, at about a 5th-grade reading level. The Bible text is the BSB.
- Say only what the verses and sources given say. Never add anything from your own knowledge.
- The one line: one sentence, about 25 words, saying what the place is and why it matters in the Bible.
- The moments: 1 to 5 things that happen at this place in the verses given, in Bible order. Each has a short title (a few words), 1 or 2 sentences, and the passage (BSB book name, like "Genesis 32:22-30"). The passage must include a verse marked * below.
- When text refers to God, capitalize He, Him and His. No em dashes or en dashes.
- Name the sources you used, exactly as listed ("BSB" for the verses).`;
const show = (m) => `Place: ${m.name}${m.also.length ? ` (also called: ${m.also.join(', ')})` : ''}${m.kind ? `, a ${m.kind.toLowerCase()}` : ''}

Verses from the lessons (* names the place; the others are around them):
${m.shown.map((v) => `${v.names ? '*' : ' '} ${v.ref} ${v.text}`).join('\n')}

Sources:
${m.sources.map((s) => `[${s.name}] ${s.text}`).join('\n\n') || '(none: use the verses)'}
${m.events.length ? `\nEvents listed there (hints only; use them only if the verses show them): ${m.events.join('; ')}` : ''}`;
const ASK = (m) => `${show(m)}

Write the place card.
Reply with only JSON: {"line": "...", "moments": [{"title": "...", "text": "...", "passage": "..."}], "sources": ["..."]}`;
const FIX = (m, card, found) => `${show(m)}

The card so far:
${JSON.stringify(card, null, 2)}

Problems found:
${found.map((f) => `- ${f.problem}`).join('\n')}

Rewrite the card so every problem is gone. Keep what has no problem.
Reply with only JSON in the same shape.`;
const TERRA_SYSTEM = `You check place cards for ${AUD} against the BSB.`;
const CHECK = (m, card) => `${show(m)}

The card:
${JSON.stringify(card, null, 2)}

Check: the line and every moment are true to the verses and sources and say nothing they don't; each moment really happens at ${m.name}; each moment's passage tells it; it reads at about a 5th-grade level.
Reply with only JSON: {"findings": [{"problem": "..."}]}. All fine: {"findings": []}`;
const RECHECK = (m, card, had) => `${show(m)}

The card, after a fix:
${JSON.stringify(card, null, 2)}

It had these problems:
${had.map((f) => `- ${f.problem}`).join('\n')}

Check only whether those are fixed. Reply with only JSON: {"findings": [{"problem": "the problem still there"}]}. All fixed: {"findings": []}`;

// --- the script check ------------------------------------------------------------------------------------------------
export function scriptCheck(m, card) {
  const found = [], say = (problem) => found.push({ kind: 'rule', problem });
  if (!card || typeof card !== 'object') return [{ kind: 'rule', problem: 'There is no card.' }];
  const line = String(card.line ?? '').trim();
  if (!line) say('The one line is empty.');
  else { if (words(line) > LINE_WORDS) say(`The one line has ${words(line)} words. It is about 25 at most.`); if (sentences(line) > 1) say('The one line is more than one sentence.'); }
  const ms = Array.isArray(card.moments) ? card.moments : [];
  if (!ms.length || ms.length > MAX_MOMENTS) say(`There are ${ms.length} moments. There are 1 to 5.`);
  const lesson = new Set(m.lessonVerses);
  ms.forEach((x, i) => {
    const n = i + 1;
    if (!String(x?.title ?? '').trim()) say(`Moment ${n} has no title.`); else if (words(x.title) > 8) say(`Moment ${n}'s title is ${words(x.title)} words. Keep it short.`);
    const t = String(x?.text ?? '').trim();
    if (!t) say(`Moment ${n} is empty.`); else { if (sentences(t) > 2) say(`Moment ${n} is more than 2 sentences.`); if (words(t) > MOMENT_WORDS) say(`Moment ${n} has ${words(t)} words. Keep it to 1 or 2 short sentences.`); }
    const r = parseRefs(String(x?.passage ?? '').replace(/–/g, '-'));
    if (!r) say(`Moment ${n}'s passage "${x?.passage}" is not a BSB reference.`);
    else if (!r.some(([a, b]) => { for (let k = a; k <= b; k++) if (lesson.has(k)) return true; return false; })) say(`Moment ${n}'s passage ${x.passage} doesn't include a verse that names ${m.name} in the lessons.`);
  });
  const all = [line, ...ms.map((x) => `${x?.title ?? ''} ${x?.text ?? ''}`)].join(' ');
  if (/[–—]/.test(all)) say('It uses a dash. No em dashes or en dashes.');
  const names = new Set(['BSB', ...m.sources.map((s) => s.name)]);
  for (const s of Array.isArray(card.sources) ? card.sources : []) if (!names.has(s)) say(`It names the source "${s}", which isn't one given. Use the names exactly as listed.`);
  for (const piece of [line, ...ms.map((x) => x?.text ?? '')]) { const c = copied(m.name, piece, m.sources.map((s) => s.text)); if (c) { say(`It copies ${c.source}: "${c.words}". Write it in your own words.`); break; } }
  return found;
}

// --- the run ---------------------------------------------------------------------------------------------------------
export async function runPlaceCards({ only = null, limit = Infinity, agents = 20, chatFn = chat, outDir = DIR, dry = false, items = null } = {}) {
  const tell = dry ? async () => {} : notify, log = dry ? () => {} : logEvent, backup = dry ? () => {} : saveToGit;
  let all = items ?? material();
  if (only) all = all.filter((m) => only.includes(m.name));
  all = all.slice(0, limit);
  const dir = (m) => path.join(outDir, m.lookup);
  const todo = all.filter((m) => !fs.existsSync(path.join(dir(m), 'done.json')));
  log({ type: 'run', status: 'running', note: `Place cards: ${all.length}.` });
  await tell('Place cards started', [`${todo.length} places (${all.length - todo.length} already done)`]);
  let down = null;
  async function ask(fn, read, keep) {
    let tried = 0, cost = 0;
    for (;;) {
      try {
        const r = await fn(); cost += r.cost ?? 0;
        if (down) { tell('Place cards going again', []); down = null; }
        const v = read(r.text);
        if (!v && keep) { fs.mkdirSync(path.dirname(keep), { recursive: true }); fs.appendFileSync(keep, `--- ${new Date().toISOString()}\n${r.text}\n`); }
        if (v || ++tried >= 2) return { v, cost };
      } catch (e) {
        if (/^403:/.test(String(e.detail ?? ''))) return { v: null, cost, refused: String(e.detail) };   // OpenRouter's filter: skip, noted
        if (!passing(e)) throw e;
        if (!down) { down = Date.now(); await tell('Place cards waiting', [e.message, 'It tries again every 5 minutes.'], { problem: true }); }
        await sleep(WAIT);
      }
    }
  }
  const stage = async (file, fn) => { const got = readJson(file); if (got) return got; const out = await fn(); writeJson(file, out); return out; };
  const cardOf = (t) => { const v = json(t); return v && typeof v.line === 'string' && Array.isArray(v.moments) ? v : null; };
  const findings = (t) => { const v = json(t); return Array.isArray(v?.findings) ? v.findings : null; };
  async function one(m) {
    const d = dir(m), keep = path.join(d, 'unreadable.txt');
    if (!m.lessonVerses.length) { writeJson(path.join(d, 'done.json'), { left_out: 'no lesson verse names it', cost: 0 }); return; }
    const w = await stage(path.join(d, 'written.json'), async () => {
      const r = await ask(() => chatFn({ ...SONNET, system: RULES, user: ASK(m), step: STEP, role: 'writer' }), cardOf, keep);
      if (!r.v) throw Object.assign(new Error(r.refused ? `OpenRouter's filter refused "${m.name}"` : `Sonnet's reply for "${m.name}" couldn't be read twice`), { detail: r.refused ?? '' });
      return { card: r.v, cost: r.cost };
    });
    let card = w.card;
    const check = (file, before = null) => stage(path.join(d, file), async () => {
      const script = scriptCheck(m, card);
      const had = before?.filter((f) => f.kind === 'terra') ?? null;
      const r = !had || had.length ? await ask(() => chatFn({ ...TERRA, system: TERRA_SYSTEM, user: had ? RECHECK(m, card, had) : CHECK(m, card), step: STEP, role: 'reviewer' }), findings) : { v: [], cost: 0 };
      return { script, terra: (r.v ?? []).map((f) => ({ ...f, kind: 'terra' })), cost: r.cost, ...(r.v === null && { terra_unread: true }) };
    });
    const c1 = await check('check-1.json');
    let found = [...c1.script, ...c1.terra];
    const first = found.length;
    for (let n = 1; n <= 3 && found.length; n++) {
      const fix = await stage(path.join(d, `fix-${n}.json`), async () => {
        const r = await ask(() => chatFn({ ...SONNET, system: RULES, user: FIX(m, card, found), step: STEP, role: 'fixer' }), cardOf, keep);
        return { card: r.v, cost: r.cost, ...(n === 3 && { problems: found }) };
      });
      if (!fix.card) break;
      card = fix.card;
      if (n === 3) {
        const after = await stage(path.join(d, 'check-final.json'), async () => ({ script: scriptCheck(m, card), cost: 0 }));
        if (after.script.length) {
          const last = await stage(path.join(d, 'fix-rules.json'), async () => { const r = await ask(() => chatFn({ ...SONNET, system: RULES, user: FIX(m, card, after.script), step: STEP, role: 'fixer' }), cardOf, keep); return { card: r.v, cost: r.cost, problems: after.script }; });
          if (last.card) card = last.card;
        }
        break;
      }
      const cn = await check(`check-${n + 1}.json`, found);
      found = [...cn.script, ...cn.terra];
    }
    const names = new Set(['BSB', ...m.sources.map((s) => s.name)]);
    writeJson(path.join(d, 'card.json'), { name: m.name, lookup: m.lookup, place_ids: m.ids, kind: m.kind, kind_from: m.kind_from,   // from the database or OpenBible only; none if neither has one
      line: card.line, moments: card.moments.map(({ title, text, passage }) => ({ title, text, passage })), sources: (card.sources ?? []).filter((s) => names.has(s)) });
    const c = (f) => readJson(path.join(d, f))?.cost ?? 0;
    const total = ['written', 'check-1', 'fix-1', 'check-2', 'fix-2', 'check-3', 'fix-3', 'fix-rules'].reduce((k, f) => k + c(`${f}.json`), 0);
    const unread = ['check-1', 'check-2', 'check-3'].some((f) => readJson(path.join(d, `${f}.json`))?.terra_unread);
    writeJson(path.join(d, 'done.json'), { firstFindings: first, finalFix: readJson(path.join(d, 'fix-3.json'))?.problems?.length ?? 0, ...(unread && { terra_unread: true }), flags: 0, cost: Math.round(total * 10000) / 10000 });
  }
  const fail = (m, e) => log({ type: 'note', title: 'Place cards: one failed', lines: [`${m.name}: ${e.message}`, e.detail ?? ''], problem: true });
  const queue = [...todo];
  if (queue.length > 1) { const f = queue.shift(); try { await one(f); } catch (e) { fail(f, e); } }   // the first alone, to fill the cache
  let finished = 0;
  await Promise.all(Array.from({ length: Math.max(1, Math.min(agents, queue.length)) }, async () => {
    while (queue.length) { const m = queue.shift(); try { await one(m); if (++finished % 100 === 0) backup(`Place cards: ${finished} done (automatic backup)`); } catch (e) { fail(m, e); } }
  }));
  const done = all.map((m) => ({ m, d: readJson(path.join(dir(m), 'done.json')) })).filter((x) => x.d);
  const cards = done.filter((x) => !x.d.left_out).map((x) => readJson(path.join(dir(x.m), 'card.json'))).filter(Boolean);
  writeJson(path.join(outDir, '..', only || Number.isFinite(limit) ? 'place-cards-test.json' : 'place-cards.json'), { made: new Date().toISOString(), cards, left_out: done.filter((x) => x.d.left_out).map((x) => ({ name: x.m.name, why: x.d.left_out })) });
  const cost = done.reduce((k, x) => k + (x.d.cost ?? 0), 0);
  backup(`Place cards: ${done.length} of ${all.length} done (automatic backup)`);
  await tell('Place cards finished', [`${done.length} of ${all.length}`, `Cost: $${cost.toFixed(2)}`]);
  return { done: done.length, total: all.length, cards: cards.length, cost };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const opt = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
  runPlaceCards({ only: opt('--names')?.split(',') ?? null, limit: Number(opt('--limit') ?? Infinity), agents: Number(opt('--agents') ?? 20) })
    .then((r) => console.log(JSON.stringify(r)), (e) => { console.error(e.message); process.exit(1); });
}
