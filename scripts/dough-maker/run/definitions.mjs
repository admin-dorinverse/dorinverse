// Definitions (definitions.md), step 2: the meanings for the owner's Bible word list (2026-11-15).
// For each base word (output/definitions/bible-words-grouped.json, the owner's approved 902):
//   1. Free: the cards it pops up on. A story or choice card counts only if its own verses use the word (any form),
//      so Papa Dorin's sprinkles never get one. And its sources: the BSB footnotes on the word, Easton's
//      (.cache/dictionary.json), Smith's, Schaff's, Webster's 1913 and 1828 (data/dictionaries). No source, no meaning.
//   2. Sonnet writes the meaning (5th grade, own words), or one meaning per way the Bible uses the word, from the
//      sources and a spread of the cards. It may say no source explains it: then the word is left out.
//   3. The script checks what it can: the shape, a real source named, the copy check (copycheck.mjs).
//      GPT-6.1 Terra checks each meaning is true to its sources, plain for a 10-year-old, and fits the cards.
//      Sonnet fixes up to 2 times, then a final fix; the script checks that fix and anything countable still
//      broken gets one last fix. No flags.
//   4. A word with more than one meaning: Sonnet says which meaning each card uses, or none (no pop-up there).
// Saved per word under output/definitions/words/ as it goes (running again picks up where it left off), and all
// together in output/definitions/definitions.json at the end.
//
//   node scripts/dough-maker/run/definitions.mjs [--words priest,ephod] [--limit 20] [--agents 20]
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

const STEP = 'definitions';
export const DEF_DIR = path.join(OUTPUT, 'definitions');
const DATA = path.join(OUTPUT, '..', 'data');
const WAIT = Number(process.env.DOUGH_WAIT_MS) || 5 * 60_000;
const SONNET = { ...SONNET_OR, reasoning: { effort: 'low' }, maxTokens: 16000 };
const TERRA = { model: 'openai/gpt-6.1-terra', only: ['openai'], name: 'gpt-6.1-terra', maxTokens: 16000 };
const SAMPLE = 12, ASSIGN_BATCH = 100, SOURCE_CHARS = 1500, UNCOVERED_MIN = 3;
const MAX_WORDS = 35, MAX_SENTENCES = 2;   // definitions.md: 1 or 2 sentences, about 30 words at most

const readJson = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };
function writeJson(f, d) { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f + '.tmp', JSON.stringify(d, null, 2) + '\n'); fs.renameSync(f + '.tmp', f); }
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const WORD = /(?<![A-Za-z'-])[A-Za-z][a-z]+(?![A-Za-z-])/g;
const lower = (s) => String(s ?? '').replace(/[‘’]/g, "'").toLowerCase();
const words = (s) => (lower(s).match(/[a-z']+/g) ?? []);
const clip = (s, n = SOURCE_CHARS) => { const t = String(s ?? '').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n).replace(/\s\S*$/, '') + '…' : t; };
const sentenceWith = (text, forms) => {
  const parts = String(text).replace(/\s+/g, ' ').split(/(?<=[.!?])\s+/);
  return parts.find((p) => words(p).some((w) => forms.has(w))) ?? parts[0];
};

// --- the material: cards and sources for every word (free) ------------------------------------------------------------
export function material({ list = readJson(path.join(DEF_DIR, 'bible-words-grouped.json')) } = {}) {
  const V = verses();
  const verseText = (ref) => { const r = parseRefs(ref); return r ? r.map(([a, b]) => V.slice(a, b + 1).map((v) => v.text).join(' ')).join(' ') : ''; };
  const formOf = new Map();
  for (const g of list) for (const f of g.forms) formOf.set(f, g.word);
  const cards = new Map(list.map((g) => [g.word, []]));
  for (const p of readJson(path.join(OUTPUT, 'passages.json'))) {
    const prep = readJson(path.join(PREP_DIR, folder(p), 'prep.json'));
    for (const s of prep.stops) for (const c of s.cards) {
      const text = c.kind === 'story' ? c.text : `${c.question} ${(c.answers ?? []).map((a) => a.text).join(' ')}`;
      const onCard = new Set((text.replace(/[‘’]/g, "'").match(WORD) ?? []).map((w) => w.toLowerCase()));
      const vt = verseText(c.verses), inVerses = new Set(words(vt));
      for (const g of new Set([...onCard].map((w) => formOf.get(w)).filter(Boolean))) {
        const forms = new Set(list.find((x) => x.word === g).forms);
        if (![...forms].some((f) => inVerses.has(f))) continue;   // the card's own verses don't use it (definitions.md "When")
        // snippet: about 12 words either side of the word in its verse, for matching (only the verse decides the meaning)
        const vs = sentenceWith(vt, forms), vw = vs.split(/\s+/), at = Math.max(0, vw.findIndex((w) => words(w).some((x) => forms.has(x))));
        cards.get(g).push({ passage_id: p.id, stop: s.stop, card: c.card, verses: c.verses,
          card_text: sentenceWith(text, forms), verse_text: vs,
          snippet: (at > 12 ? '…' : '') + vw.slice(Math.max(0, at - 12), at + 13).join(' ') + (at + 13 < vw.length ? '…' : '') });
      }
    }
  }
  // sources. Keys are letters only, so "lampstand" finds "lamp-stand" and "Lamp stand"
  const key = (s) => lower(s).replace(/[^a-z]/g, '');
  const easton = new Map();
  for (const e of readJson(path.join(OUTPUT, '..', '.cache', 'dictionary.json')) ?? []) {
    const k = key(e.term); easton.set(k, [...(easton.get(k) ?? []), e.text]);
  }
  const book = (f, field = 'term') => {
    const m = new Map();
    for (const e of readJson(path.join(DATA, 'dictionaries', f)).entries) {
      const k = key(e[field]); const t = e.senses ? e.senses.map((s) => (typeof s === 'string' ? s : s.text)) : [e.definition];
      m.set(k, [...(m.get(k) ?? []), ...t]);
    }
    return m;
  };
  // the forms a dictionary may list the word under: oxen -> ox, sheaves -> sheaf, fasted -> fast, offers -> offer
  const IRREGULAR = { oxen: 'ox', men: 'man', women: 'woman', children: 'child', feet: 'foot', teeth: 'tooth', mice: 'mouse', geese: 'goose', cherubim: 'cherub', seraphim: 'seraph' };
  const bases = (w) => [...new Set([w, IRREGULAR[w], w.replace(/ves$/, 'f'), w.replace(/ves$/, 'fe'), w.replace(/ies$/, 'y'), w.replace(/es$/, ''), w.replace(/s$/, ''),
    w.replace(/ied$/, 'y'), w.replace(/ed$/, ''), w.replace(/ed$/, 'e'), w.replace(/(.)\1ed$/, '$1'), w.replace(/ing$/, ''), w.replace(/ing$/, 'e')].filter((x) => x && x.length > 1))];
  const books = [["Easton's Bible Dictionary", easton], ["Smith's Bible Dictionary", book('smith.json')],
    ["Schaff's Dictionary of the Bible", book('schaff.json')], ["Webster's 1913", book('webster-1913.json', 'word')],
    ["Webster's 1828", book('webster-1828.json', 'word')]];
  const notes = readJson(path.join(DATA, 'bsb-footnotes.json')).notes;
  const out = [];
  for (const g of list) {
    const forms = new Set(g.forms);
    const sources = [];
    // a footnote explains the word it comes right after
    const fn = [...new Set(notes.filter((n) => forms.has(words(n.after).at(-1))).map((n) => n.text))].slice(0, 4);
    if (fn.length) sources.push({ name: 'BSB footnote', text: clip(fn.join(' | ')) });
    for (const [name, m] of books) {
      // the word's own forms first; a base form only if none of them is listed
      let texts = [...new Set([g.word, ...g.forms].flatMap((f) => m.get(key(f)) ?? []))];
      if (!texts.length) texts = [...new Set([g.word, ...g.forms].flatMap(bases).flatMap((f) => m.get(key(f)) ?? []))];
      if (texts.length) sources.push({ name, text: clip(texts.join(' | ')) });
    }
    const all = cards.get(g.word);
    // a spread of cards across the Bible, so different uses show up
    const step = Math.max(1, Math.floor(all.length / SAMPLE));
    const sample = all.filter((_, i) => i % step === 0).slice(0, SAMPLE);
    out.push({ word: g.word, forms: g.forms, cards: all, sample, sources });
  }
  return out;
}

// --- prompts -------------------------------------------------------------------------------------------------------
const RULES = `You write pop-up definitions for Bible words in a children's Bible app. Readers are about 10 years old (5th grade). The Bible text is the BSB.

- Write in your own plain words, for about a 5th-grade reader. Never copy a source's wording.
- Each meaning is 1 or 2 sentences, about 30 words at most.
- When a meaning refers to God, capitalize He, Him and His.
- Say only what the sources given say. Never add anything from your own knowledge. If none of the sources explains the word, write no meaning.
- One meaning, unless the Bible uses the word in clearly different ways in the cards shown (like law: the Law of Moses, or a rule). Then one meaning per way. A card will show only the meaning that fits it.
- No set template. Each meaning is written for its own word.
- Name the sources you used, exactly as they're listed.`;
const show = (m) => `Word: ${m.word}${m.forms.length > 1 ? ` (forms: ${m.forms.join(', ')})` : ''}

Sources:
${m.sources.map((s) => `[${s.name}] ${s.text}`).join('\n\n')}

How the cards use it (card sentence, then its verse):
${m.sample.map((c, i) => `${i + 1}. ${c.card_text}\n   Verse (${c.verses}): ${c.verse_text}`).join('\n')}`;
const WRITE = (m) => `${show(m)}

Write the meaning${m.forms.length > 1 ? ' (one entry for all its forms)' : ''}.
Reply with only JSON: {"meanings": [{"id": 1, "meaning": "...", "sources": ["..."]}]}. If no source explains the word: {"meanings": [], "why": "..."}`;
const FIX = (m, meanings, found) => `${show(m)}

The meanings so far:
${JSON.stringify(meanings, null, 2)}

Problems found:
${found.map((f) => `- ${f.id ? `Meaning ${f.id}: ` : ''}${f.problem}`).join('\n')}

Rewrite the meanings so every problem is gone. Keep what has no problem.
Reply with only JSON: {"meanings": [{"id": 1, "meaning": "...", "sources": ["..."]}]}`;
const TERRA_SYSTEM = 'You check pop-up definitions of Bible words for a children\'s Bible app (readers about 10 years old). The Bible text is the BSB.';
const CHECK = (m, meanings) => `${show(m)}

The meanings written:
${meanings.map((x) => `Meaning ${x.id}: ${x.meaning} (sources: ${(x.sources ?? []).join(', ')})`).join('\n')}

For each meaning, check: it is true to its sources and says nothing they don't (nothing added from outside them); it is plain enough for a 10-year-old; it fits how the cards use the word; He, Him and His are capitalized when they refer to God. Also: is there a way the cards use the word that no meaning fits?
Reply with only JSON: {"findings": [{"id": n, "problem": "..."}]} (id 0 for a use no meaning fits). All fine: {"findings": []}`;
const RECHECK = (m, meanings, had) => `${show(m)}

The meanings, after a fix:
${meanings.map((x) => `Meaning ${x.id}: ${x.meaning} (sources: ${(x.sources ?? []).join(', ')})`).join('\n')}

They had these problems:
${had.map((f) => `- ${f.id ? `Meaning ${f.id}: ` : ''}${f.problem}`).join('\n')}

Check only whether those problems are fixed. Don't report anything else.
Reply with only JSON: {"findings": [{"id": n, "problem": "the problem still there"}]}. All fixed: {"findings": []}`;
const MORE = (m, meanings) => `${show(m)}

The meanings so far:
${meanings.map((x) => `${x.id}. ${x.meaning}`).join('\n')}

The cards above use the word in a way none of these meanings fits. If the sources explain that use, write a meaning for it. If they don't, write none: those cards will get no pop-up.
Reply with only JSON: {"meanings": [{"id": 1, "meaning": "...", "sources": ["..."]}]} for the new meaning only, or {"meanings": [], "why": "..."}`;
const ASSIGN = (m, meanings, batch) => `Word: ${m.word}
Meanings:
${meanings.map((x) => `${x.id}. ${x.meaning}`).join('\n')}

For each card below, which meaning fits how it uses the word? 0 if none fits.
${batch.map((c, i) => `${i + 1}. ${c.card_text}\n   Verse (${c.verses}): ${c.verse_text}`).join('\n')}

Reply with only JSON: {"cards": [{"n": 1, "meaning": 1}]} with one entry for every card.`;
// (2026-11-15: a bare list of numbers and short verse pieces were tried for cost; Sonnet lost its place in the list
// and matched worse, so each card keeps its number, its sentence and its whole verse)

// --- the script check ----------------------------------------------------------------------------------------------
export function scriptCheck(m, meanings) {
  const found = [], say = (id, problem) => found.push({ id, kind: 'rule', problem });
  if (!Array.isArray(meanings)) return [{ id: 0, kind: 'rule', problem: 'There is no list of meanings.' }];
  const names = new Set(m.sources.map((s) => s.name));
  meanings.forEach((x, i) => {
    const id = x?.id;
    if (id !== i + 1) say(id ?? i + 1, `Meaning ${i + 1} has the id ${JSON.stringify(id)}. Number them 1, 2, 3 in order.`);
    if (!String(x?.meaning ?? '').trim()) { say(id, 'It is empty.'); return; }
    const src = Array.isArray(x.sources) ? x.sources : [];
    if (!src.length) say(id, 'It names no source.');
    for (const s of src) if (!names.has(s)) say(id, `It names "${s}", which isn't one of the sources given. Use the names exactly as listed.`);
    const n = String(x.meaning).trim().split(/\s+/).length, s = sentences(x.meaning);
    if (n > MAX_WORDS) say(id, `It has ${n} words. A meaning is about 30 words at most.`);
    if (s > MAX_SENTENCES) say(id, `It has ${s} sentences. A meaning is 1 or 2 sentences.`);
    const c = copied(m.word, x.meaning, m.sources.map((s) => s.text));
    if (c) say(id, `It copies ${c.source}: "${c.words}". Write it in your own words.`);
  });
  return found;
}

// --- the run -------------------------------------------------------------------------------------------------------
export async function runDefinitions({ only = null, limit = Infinity, agents = 20, chatFn = chat, outDir = DEF_DIR, dry = false, items = null } = {}) {
  const tell = dry ? async () => {} : notify, log = dry ? () => {} : logEvent, backup = dry ? () => {} : saveToGit;
  let all = items ?? material();
  if (only) all = all.filter((m) => only.includes(m.word));
  all = all.slice(0, limit);
  const dir = (m) => path.join(outDir, 'words', m.word);
  const todo = all.filter((m) => !fs.existsSync(path.join(dir(m), 'done.json')));
  log({ type: 'run', status: 'running', note: `Definitions: ${all.length} words.` });
  await tell('Definitions started', [`${todo.length} words (${all.length - todo.length} already done)`, 'Sonnet writes, the script and Terra check, no flags']);

  let down = null;
  async function ask(fn, read, keep = null) {
    let tried = 0, cost = 0;
    for (;;) {
      try {
        const r = await fn();
        cost += r.cost ?? 0;
        if (down) { tell('Definitions going again', [`After ${Math.round((Date.now() - down) / 60000)} min`]); down = null; }
        const v = read(r.text);
        if (!v && keep) { fs.mkdirSync(path.dirname(keep), { recursive: true }); fs.appendFileSync(keep, `--- ${new Date().toISOString()}\n${r.text}\n`); }
        if (v || ++tried >= 2) return { v, cost };
      } catch (e) {
        if (!passing(e)) throw e;
        if (!down) { down = Date.now(); await tell('Definitions waiting', [e.message, 'It tries again every 5 minutes and carries on by itself.'], { problem: true }); }
        await sleep(WAIT);
      }
    }
  }
  const stage = async (file, fn) => { const got = readJson(file); if (got) return got; const out = await fn(); writeJson(file, out); return out; };
  const meaningsOf = (t) => { const v = json(t); return Array.isArray(v?.meanings) ? v : null; };
  const findings = (t) => { const v = json(t); return Array.isArray(v?.findings) ? v.findings : null; };

  async function one(m) {
    const d = dir(m), keep = path.join(d, 'unreadable.txt');
    if (!m.sources.length || !m.cards.length) {   // no source explains it, or no card's verses use it: left out, free
      writeJson(path.join(d, 'done.json'), { left_out: !m.sources.length ? 'no source' : 'no card whose verses use it', cost: 0, t: new Date().toISOString() });
      return;
    }
    const written = await stage(path.join(d, 'written.json'), async () => {
      const r = await ask(() => chatFn({ ...SONNET, system: RULES, user: WRITE(m), step: STEP, role: 'writer' }), meaningsOf, keep);
      if (!r.v) throw Object.assign(new Error(`Sonnet's reply for "${m.word}" couldn't be read twice ($${r.cost.toFixed(3)}); it's kept in unreadable.txt.`), { detail: '' });
      return { meanings: r.v.meanings, why: r.v.why ?? null, cost: r.cost };
    });
    let meanings = written.meanings;
    if (!meanings.length) {   // Sonnet says no source explains it
      writeJson(path.join(d, 'done.json'), { left_out: `no source explains it: ${written.why ?? ''}`.trim(), cost: written.cost, t: new Date().toISOString() });
      return;
    }
    const check = (file, before = null) => stage(path.join(d, file), async () => {
      const script = scriptCheck(m, meanings);
      const had = before?.filter((f) => f.kind === 'terra') ?? null;
      const r = !had || had.length
        ? await ask(() => chatFn({ ...TERRA, system: TERRA_SYSTEM, user: had ? RECHECK(m, meanings, had) : CHECK(m, meanings), step: STEP, role: 'reviewer' }), findings)
        : { v: [], cost: 0 };
      return { script, terra: (r.v ?? []).map((f) => ({ ...f, kind: 'terra' })), cost: r.cost, ...(r.v === null && { terra_unread: true }) };
    });
    const c1 = await check('check-1.json');
    let found = [...c1.script, ...c1.terra];
    const first = found.length;
    for (let n = 1; n <= 3 && found.length; n++) {
      const fix = await stage(path.join(d, `fix-${n}.json`), async () => {
        const r = await ask(() => chatFn({ ...SONNET, system: RULES, user: FIX(m, meanings, found), step: STEP, role: 'fixer' }), meaningsOf, keep);
        return { meanings: r.v?.meanings ?? null, cost: r.cost, ...(n === 3 && { problems: found }) };
      });
      if (!Array.isArray(fix.meanings) || !fix.meanings.length) break;   // a fix that can't be read: keep the meanings as they are
      meanings = fix.meanings;
      if (n === 3) {
        const after = await stage(path.join(d, 'check-final.json'), async () => ({ script: scriptCheck(m, meanings), cost: 0 }));
        if (after.script.length) {
          const last = await stage(path.join(d, 'fix-rules.json'), async () => {
            const r = await ask(() => chatFn({ ...SONNET, system: RULES, user: FIX(m, meanings, after.script), step: STEP, role: 'fixer' }), meaningsOf, keep);
            return { meanings: r.v?.meanings ?? null, cost: r.cost, problems: after.script };
          });
          if (Array.isArray(last.meanings) && last.meanings.length) meanings = last.meanings;
        }
        break;
      }
      const cn = await check(`check-${n + 1}.json`, found);
      found = [...cn.script, ...cn.terra];
    }
    // Which meaning each card uses, for every word (one meaning or more): a card whose use no meaning fits gets 0,
    // no pop-up, so a meaning is never shown where it's wrong (owner, 2026-11-15)
    const assign = (file, ms, cardsIn) => stage(path.join(d, file), async () => {
      const ids = new Set(ms.map((x) => x.id)), ok = (x) => ids.has(x?.meaning) || x?.meaning === 0;
      const read = (t) => { const v = json(t); return Array.isArray(v?.cards) ? v.cards : null; };
      const out = [];
      let cost = 0, unanswered = 0;
      for (let i = 0; i < cardsIn.length; i += ASSIGN_BATCH) {
        const batch = cardsIn.slice(i, i + ASSIGN_BATCH);
        const r = await ask(() => chatFn({ ...SONNET, system: RULES, user: ASSIGN(m, ms, batch), step: STEP, role: 'assigner' }), read, keep);
        cost += r.cost;
        const got = new Map((r.v ?? []).filter((x) => ok(x) && x.n >= 1 && x.n <= batch.length).map((x) => [x.n, x.meaning]));
        // cards it skipped are asked once more, on their own
        const missed = batch.map((c, k) => ({ c, k })).filter(({ k }) => !got.has(k + 1));
        if (missed.length) {
          const again = await ask(() => chatFn({ ...SONNET, system: RULES, user: ASSIGN(m, ms, missed.map((x) => x.c)), step: STEP, role: 'assigner' }), read, keep);
          cost += again.cost;
          for (const x of again.v ?? []) { const hit = missed[x?.n - 1]; if (hit && ok(x)) got.set(hit.k + 1, x.meaning); }
        }
        // still no answer: no pop-up on that card
        batch.forEach((c, k) => { if (!got.has(k + 1)) unanswered++; out.push({ ...c, meaning: got.has(k + 1) ? got.get(k + 1) : null }); });   // null: no answer
      }
      return { cards: out, unanswered, cost };
    });
    const a1 = await assign('assign.json', meanings, m.cards);
    let assigned = a1.cards, assignCost = a1.cost;
    // Uses no meaning fits (spirit: "a spirit of deep sleep"): if the sources explain that use, it gets its own
    // meaning, checked by the script and Terra, and those cards are matched again. One round; else no pop-up there.
    const zeros = assigned.filter((c) => c.meaning === 0);
    if (zeros.length >= UNCOVERED_MIN) {
      const more = await stage(path.join(d, 'more.json'), async () => {
        const sample = zeros.filter((_, i) => i % Math.max(1, Math.floor(zeros.length / SAMPLE)) === 0).slice(0, SAMPLE);
        const r = await ask(() => chatFn({ ...SONNET, system: RULES, user: MORE({ ...m, sample }, meanings), step: STEP, role: 'writer' }), meaningsOf, keep);
        let add = (r.v?.meanings ?? []).map((x, i) => ({ ...x, id: meanings.length + i + 1 }));
        let cost = r.cost, terra = [];
        if (add.length) {
          const script = scriptCheck(m, [...meanings, ...add]).filter((f) => f.id > meanings.length);
          const t = await ask(() => chatFn({ ...TERRA, system: TERRA_SYSTEM, user: CHECK({ ...m, sample }, add), step: STEP, role: 'reviewer' }), findings);
          cost += t.cost; terra = (t.v ?? []).filter((f) => f.id);
          const found2 = [...script, ...terra.map((f) => ({ ...f, id: f.id > meanings.length ? f.id : f.id + meanings.length }))];
          if (found2.length) {   // one fix; if it can't be read or still breaks a rule, the new meaning is dropped
            const f = await ask(() => chatFn({ ...SONNET, system: RULES, user: FIX({ ...m, sample }, add, found2), step: STEP, role: 'fixer' }), meaningsOf, keep);
            cost += f.cost;
            add = (f.v?.meanings ?? []).map((x, i) => ({ ...x, id: meanings.length + i + 1 }));
            if (scriptCheck(m, [...meanings, ...add]).some((x) => x.id > meanings.length)) add = [];
          }
        }
        return { meanings: add, why: r.v?.why ?? null, cost };
      });
      assignCost += more.cost;
      if (more.meanings.length) {
        const all = [...meanings, ...more.meanings];
        const a2 = await assign('assign-more.json', all, zeros.map(({ meaning, ...c }) => c));
        assignCost += a2.cost;
        const again = new Map(a2.cards.map((c) => [`${c.passage_id}/${c.stop}/${c.card}`, c.meaning]));
        assigned = assigned.map((c) => c.meaning === 0 ? { ...c, meaning: again.get(`${c.passage_id}/${c.stop}/${c.card}`) ?? 0 } : c);
        meanings = all;
      }
    }
    // no answer at all (null): no pop-up there either, but it never asks for a new meaning
    assigned = assigned.map(({ passage_id, stop, card, meaning }) => ({ passage_id, stop, card, meaning: meaning ?? 0 }));
    // a meaning no card uses isn't kept
    const used = new Set(assigned.map((c) => c.meaning));
    const renumber = new Map(meanings.filter((x) => used.has(x.id)).map((x, i) => [x.id, i + 1]));
    meanings = meanings.filter((x) => used.has(x.id)).map((x) => ({ ...x, id: renumber.get(x.id) }));
    assigned = assigned.map((c) => ({ ...c, meaning: c.meaning === 0 ? 0 : renumber.get(c.meaning) }));
    // only real source names are saved (a fix that couldn't be read may leave a wrong one)
    const names = new Set(m.sources.map((s) => s.name));
    writeJson(path.join(d, 'word.json'), { word: m.word, forms: m.forms,
      meanings: meanings.map(({ id, meaning, sources }) => ({ id, meaning, sources: (sources ?? []).filter((s) => names.has(s)) })), cards: assigned.filter((c) => c.meaning !== 0) });
    const unread = ['check-1', 'check-2', 'check-3'].some((f) => readJson(path.join(d, `${f}.json`))?.terra_unread);
    const c = (f) => readJson(path.join(d, f))?.cost ?? 0;
    const total = ['written', 'check-1', 'fix-1', 'check-2', 'fix-2', 'check-3', 'fix-3', 'fix-rules'].reduce((k, f) => k + c(`${f}.json`), 0) + assignCost;
    const left = readJson(path.join(d, 'fix-3.json'))?.problems?.length ?? 0;
    writeJson(path.join(d, 'done.json'), { firstFindings: first, finalFix: left, meanings: meanings.length, cards: assigned.filter((x) => x.meaning !== 0).length, ...(unread && { terra_unread: true }), flags: 0, cost: Math.round(total * 10000) / 10000, t: new Date().toISOString() });
    log({ type: 'note', title: `Definitions: ${m.word}`, lines: [`${first} problems at first, ${left} needed the final fix`, `$${total.toFixed(3)}`] });
  }

  const fail = (m, e) => log({ type: 'note', title: 'Definitions: a word failed', lines: [`${m.word}: ${e.message}`, e.detail ?? ''], problem: true });
  const paid = todo.filter((m) => m.sources.length && m.cards.length);
  const queue = [...todo];
  // the first paid word goes alone so the rules are in the cache before the rest start
  if (paid.length > 1) { const f = paid[0]; queue.splice(queue.indexOf(f), 1); try { await one(f); } catch (e) { fail(f, e); } }
  let finished = 0;
  await Promise.all(Array.from({ length: Math.max(1, Math.min(agents, queue.length)) }, async () => {
    while (queue.length) {
      const m = queue.shift();
      try { await one(m); if (++finished % 100 === 0) backup(`Definitions: ${finished} words done (automatic backup)`); }
      catch (e) { fail(m, e); }
    }
  }));
  // everything together (free): words with a meaning, and the ones left out and why
  const done = all.map((m) => ({ m, d: readJson(path.join(dir(m), 'done.json')) })).filter((x) => x.d);
  const result = { made: new Date().toISOString(), words: [], left_out: [] };
  for (const { m, d } of done) {
    if (d.left_out) result.left_out.push({ word: m.word, why: d.left_out });
    else { const w = readJson(path.join(dir(m), 'word.json')); if (w) result.words.push(w); }
  }
  writeJson(path.join(outDir, only || Number.isFinite(limit) ? 'definitions-test.json' : 'definitions.json'), result);
  const cost = done.reduce((k, x) => k + (x.d.cost ?? 0), 0);
  backup(`Definitions: ${done.length} of ${all.length} words done (automatic backup)`);
  log({ type: 'run', status: 'finished', note: `Definitions: ${done.length} of ${all.length}.` });
  await tell('Definitions finished', [`${done.length} of ${all.length} words done`, `Cost: $${cost.toFixed(2)}`]);
  return { done: done.length, total: all.length, withMeaning: result.words.length, leftOut: result.left_out.length, cost };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const opt = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
  runDefinitions({ only: opt('--words')?.split(',') ?? null, limit: Number(opt('--limit') ?? Infinity), agents: Number(opt('--agents') ?? 20) })
    .then((r) => console.log(JSON.stringify(r)), (e) => { console.error(e.message); process.exit(1); });
}
