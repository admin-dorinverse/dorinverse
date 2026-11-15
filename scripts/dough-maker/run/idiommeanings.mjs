// Idioms (idioms.md "Meanings"), 2026-11-15: each of the 436 idioms the app shows (data/idioms.json) gets a meaning
// checked against every verse it's in and the public-domain commentaries' notes on those verses
// (data/commentaries/idiom-verse-notes.json), at a 5th-grade level.
//   1. Free: the idiom's verses, its cards (with their sentence and verse) and the part of each note about the idiom.
//   2. Sonnet checks the list's meaning against the verses and notes and writes the meaning (or one per way the
//      idiom is used). Not explained by the notes: the idiom is left out.
//   3. The script checks the shape, the sources (commentaries given), the length, the copy check. GPT-6.1 Terra
//      checks it's true to the notes, fits every verse, plain for a 10-year-old. Sonnet fixes up to 2 times, then a
//      final fix; the script checks that fix and anything countable still broken gets one last fix. No flags.
//   4. Sonnet says which meaning each card uses, or 0 where the card doesn't use the phrase as the idiom (no pop-up).
//      A use no meaning fits gets its own meaning if the notes explain it.
// Saved per idiom under output/idioms/each/<id>/ as it goes, and together in output/idioms/idioms.json.
//
//   node scripts/dough-maker/run/idiommeanings.mjs [--ids 1,2,3] [--agents 20]
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { OUTPUT, logEvent, notify } from './events.mjs';
import { verses, verseIndex, parseRefs } from './bsb.mjs';
import { saveToGit } from './save.mjs';
import { PREP_DIR, folder, passing } from './prep.mjs';
import { chat, SONNET_OR } from './openrouter.mjs';
import { json } from './burnt.mjs';
import { copied } from './copycheck.mjs';
import { sentences } from './answers.mjs';

const STEP = 'idioms';
export const IDIOM_DIR = path.join(OUTPUT, 'idioms');
const DATA = path.join(OUTPUT, '..', 'data');
const WAIT = Number(process.env.DOUGH_WAIT_MS) || 5 * 60_000;
const SONNET = { ...SONNET_OR, reasoning: { effort: 'low' }, maxTokens: 16000 };
const TERRA = { model: 'openai/gpt-6.1-terra', only: ['openai'], name: 'gpt-6.1-terra', maxTokens: 16000 };
const NOTE_CHARS = 900, NOTES_PER_VERSE = 3, VERSES_WITH_NOTES = 4, UNCOVERED_MIN = 2;
const MAX_WORDS = 35, MAX_SENTENCES = 2;   // idioms.md: 1 or 2 sentences, about 30 words at most

const readJson = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };
function writeJson(f, d) { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f + '.tmp', JSON.stringify(d, null, 2) + '\n'); fs.renameSync(f + '.tmp', f); }
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const lower = (s) => String(s ?? '').replace(/[‘’]/g, "'").toLowerCase();
const words = (s) => (lower(s).match(/[a-z']+/g) ?? []);
const STOP = new Set('the and of to in a an his her their my your our its is was be on at for with from by that this as he she they it you me him them we us i will shall not or up out o'.split(' '));

// The part of a note about the idiom: the window around the spot where most of the idiom's words appear
export function aboutIdiom(text, idiom, n = NOTE_CHARS) {
  const t = String(text).replace(/\s+/g, ' ').trim();
  if (t.length <= n) return t;
  const keys = [...new Set(words(idiom).filter((w) => w.length > 2 && !STOP.has(w)))];
  const lt = lower(t);
  let best = 0, at = 0;
  for (let i = 0; i < lt.length; i += 100) {
    const win = lt.slice(i, i + n);
    const score = keys.filter((k) => win.includes(k)).length;
    if (score > best) { best = score; at = i; }
  }
  const start = Math.max(0, at - 100), cut = t.slice(start, start + n).replace(/^\S*\s/, '').replace(/\s\S*$/, '');
  return (start > 0 ? '…' : '') + cut + '…';
}

export function material({ list = readJson(path.join(DATA, 'idioms.json')) } = {}) {
  const V = verses();
  const verseText = (ref) => { const r = parseRefs(ref); return r ? r.map(([a, b]) => V.slice(a, b + 1).map((v) => v.text).join(' ')).join(' ') : ''; };
  const notes = readJson(path.join(DATA, 'commentaries', 'idiom-verse-notes.json')).verses;
  const passages = new Map(readJson(path.join(OUTPUT, 'passages.json')).map((p) => [p.id, p]));
  const prep = new Map();
  const cardOf = (pid, stop, card) => {
    if (!prep.has(pid)) prep.set(pid, readJson(path.join(PREP_DIR, folder(passages.get(pid)), 'prep.json')));
    const s = prep.get(pid).stops.find((x) => x.stop === stop), c = s?.cards.find((x) => x.card === card);
    return c ? { verses: c.verses, text: c.kind === 'story' ? c.text : `${c.question} ${(c.answers ?? []).map((a) => a.text).join(' ')}` } : null;
  };
  return list.map((i) => {
    const vs = i.occurrences.map((o) => ({ ref: o.verse, text: V[verseIndex(o.verse)]?.text ?? '' }));
    // notes: for up to 4 verses, the 3 notes that say most about the idiom
    const keys = words(i.idiom).filter((w) => w.length > 2 && !STOP.has(w));
    const byVerse = vs.slice(0, VERSES_WITH_NOTES).map((v) => ({ ref: v.ref,
      notes: (notes[v.ref] ?? []).map((n) => ({ source: n.source, text: aboutIdiom(n.text, i.idiom) }))
        .map((n) => ({ ...n, score: keys.filter((k) => lower(n.text).includes(k)).length })).sort((a, b) => b.score - a.score)
        .slice(0, NOTES_PER_VERSE).map(({ source, text }) => ({ source, text })) }));
    // a note covering several verses (Calvin on Psalm 24:7-10) is shown once
    const seen = new Set();
    for (const v of byVerse) v.notes = v.notes.filter((n) => { const k = n.source + n.text.slice(0, 200); if (seen.has(k)) return false; seen.add(k); return true; });
    const cards = i.cards.map((c) => { const k = cardOf(c.passage_id, c.stop, c.card); return k && { ...c, verses: k.verses,
      card_text: k.text.replace(/\s+/g, ' ').split(/(?<=[.!?])\s+/).find((s) => lower(s).includes(lower(i.idiom).slice(0, 12))) ?? k.text.slice(0, 300),
      verse_text: verseText(k.verses).slice(0, 400) }; }).filter(Boolean);
    return { id: i.id, idiom: i.idiom, meaning: i.meaning, debated: !!i.debated, verses: vs, notes: byVerse, cards,
      sources: [...new Set(byVerse.flatMap((v) => v.notes.map((n) => n.source)))] };
  });
}

// --- prompts -------------------------------------------------------------------------------------------------------
const RULES = `You write pop-up meanings for Bible idioms in a children's Bible app. Readers are about 10 years old (5th grade). The Bible text is the BSB.

- Write in your own plain words, for about a 5th-grade reader. Never copy a note's wording.
- Each meaning is 1 or 2 sentences, about 30 words at most.
- When a meaning refers to God, capitalize He, Him and His.
- Say only what the commentary notes given say. Never add anything from your own knowledge. If the notes don't explain the idiom, write no meaning.
- When the notes disagree, say so simply, like "Bible teachers aren't sure. It may mean…"
- One meaning for all its verses, unless the idiom means something different in some of them. Then one meaning per way. A card will show only the meaning that fits it.
- The meaning from the idiom list may be wrong (some were written for a different verse). Check it against every verse and the notes.
- Name the commentaries you used, exactly as they're listed.`;
const show = (m) => `Idiom: "${m.idiom}"${m.debated ? ' (the list marks it as debated: scholars disagree)' : ''}

Its verses:
${m.verses.map((v) => `- ${v.ref}: ${v.text}`).join('\n')}

The meaning in the idiom list (may be wrong): ${m.meaning}

Commentary notes:
${m.notes.map((v) => `On ${v.ref}:\n${v.notes.map((n) => `[${n.source}] ${n.text}`).join('\n') || '(none)'}`).join('\n\n')}`;
const WRITE = (m) => `${show(m)}

Write the meaning.
Reply with only JSON: {"meanings": [{"id": 1, "meaning": "...", "sources": ["..."]}]}. If the notes don't explain the idiom: {"meanings": [], "why": "..."}`;
const FIX = (m, meanings, found) => `${show(m)}

The meanings so far:
${JSON.stringify(meanings, null, 2)}

Problems found:
${found.map((f) => `- ${f.id ? `Meaning ${f.id}: ` : ''}${f.problem}`).join('\n')}

Rewrite the meanings so every problem is gone. Keep what has no problem.
Reply with only JSON: {"meanings": [{"id": 1, "meaning": "...", "sources": ["..."]}]}`;
const TERRA_SYSTEM = 'You check pop-up meanings of Bible idioms for a children\'s Bible app (readers about 10 years old). The Bible text is the BSB.';
const CHECK = (m, meanings) => `${show(m)}

The meanings written:
${meanings.map((x) => `Meaning ${x.id}: ${x.meaning} (sources: ${(x.sources ?? []).join(', ')})`).join('\n')}

For each meaning, check: it is true to the commentary notes and says nothing they don't (nothing added from outside them); it fits every verse it's for; it is plain enough for a 10-year-old; He, Him and His are capitalized when they refer to God; if the notes disagree, it says so simply. Also: is there a verse no meaning fits?
Reply with only JSON: {"findings": [{"id": n, "problem": "..."}]} (id 0 for a verse no meaning fits). All fine: {"findings": []}`;
const RECHECK = (m, meanings, had) => `${show(m)}

The meanings, after a fix:
${meanings.map((x) => `Meaning ${x.id}: ${x.meaning} (sources: ${(x.sources ?? []).join(', ')})`).join('\n')}

They had these problems:
${had.map((f) => `- ${f.id ? `Meaning ${f.id}: ` : ''}${f.problem}`).join('\n')}

Check only whether those problems are fixed. Don't report anything else.
Reply with only JSON: {"findings": [{"id": n, "problem": "the problem still there"}]}. All fixed: {"findings": []}`;
const MORE = (m, meanings, cards) => `${show(m)}

The meanings so far:
${meanings.map((x) => `${x.id}. ${x.meaning}`).join('\n')}

These cards use the idiom in a way none of the meanings fits:
${cards.map((c, i) => `${i + 1}. ${c.card_text}\n   Verse (${c.verses}): ${c.verse_text}`).join('\n')}

If the notes explain that use, write a meaning for it. If they don't, write none: those cards will get no pop-up.
Reply with only JSON: {"meanings": [{"id": 1, "meaning": "...", "sources": ["..."]}]} for the new meaning only, or {"meanings": [], "why": "..."}`;
const ASSIGN = (m, meanings, batch) => `Idiom: "${m.idiom}"
Meanings:
${meanings.map((x) => `${x.id}. ${x.meaning}`).join('\n')}

For each card below, which meaning fits how it uses the idiom? 0 if the card doesn't use the phrase as this idiom (for example the same words in their plain, everyday sense) or no meaning fits.
${batch.map((c, i) => `${i + 1}. ${c.card_text}\n   Verse (${c.verses}): ${c.verse_text}`).join('\n')}

Reply with only JSON: {"cards": [{"n": 1, "meaning": 1}]} with one entry for every card.`;

// --- the script check ----------------------------------------------------------------------------------------------
export function scriptCheck(m, meanings) {
  const found = [], say = (id, problem) => found.push({ id, kind: 'rule', problem });
  if (!Array.isArray(meanings)) return [{ id: 0, kind: 'rule', problem: 'There is no list of meanings.' }];
  const names = new Set(m.sources), noteTexts = m.notes.flatMap((v) => v.notes.map((n) => n.text));
  meanings.forEach((x, i) => {
    const id = x?.id;
    if (id !== i + 1) say(id ?? i + 1, `Meaning ${i + 1} has the id ${JSON.stringify(id)}. Number them 1, 2, 3 in order.`);
    if (!String(x?.meaning ?? '').trim()) { say(id, 'It is empty.'); return; }
    const src = Array.isArray(x.sources) ? x.sources : [];
    if (!src.length) say(id, 'It names no source.');
    for (const s of src) if (!names.has(s)) say(id, `It names "${s}", which isn't one of the commentaries given. Use the names exactly as listed.`);
    const n = String(x.meaning).trim().split(/\s+/).length, k = sentences(x.meaning);
    if (n > MAX_WORDS) say(id, `It has ${n} words. A meaning is about 30 words at most.`);
    if (k > MAX_SENTENCES) say(id, `It has ${k} sentences. A meaning is 1 or 2 sentences.`);
    const c = copied(m.idiom, x.meaning, noteTexts);
    if (c) say(id, `It copies ${c.source === 'the given entry' ? 'a commentary note' : c.source}: "${c.words}". Write it in your own words.`);
  });
  return found;
}

// --- the run -------------------------------------------------------------------------------------------------------
export async function runIdioms({ only = null, agents = 20, chatFn = chat, outDir = IDIOM_DIR, dry = false, items = null } = {}) {
  const tell = dry ? async () => {} : notify, log = dry ? () => {} : logEvent, backup = dry ? () => {} : saveToGit;
  let all = items ?? material();
  if (only) all = all.filter((m) => only.includes(m.id));
  const dir = (m) => path.join(outDir, 'each', String(m.id).padStart(4, '0'));
  const todo = all.filter((m) => !fs.existsSync(path.join(dir(m), 'done.json')));
  log({ type: 'run', status: 'running', note: `Idioms: ${all.length} idioms.` });
  await tell('Idioms started', [`${todo.length} idioms (${all.length - todo.length} already done)`, 'Sonnet writes, the script and Terra check, no flags']);

  let down = null;
  async function ask(fn, read, keep = null) {
    let tried = 0, cost = 0;
    for (;;) {
      try {
        const r = await fn();
        cost += r.cost ?? 0;
        if (down) { tell('Idioms going again', [`After ${Math.round((Date.now() - down) / 60000)} min`]); down = null; }
        const v = read(r.text);
        if (!v && keep) { fs.mkdirSync(path.dirname(keep), { recursive: true }); fs.appendFileSync(keep, `--- ${new Date().toISOString()}\n${r.text}\n`); }
        if (v || ++tried >= 2) return { v, cost };
      } catch (e) {
        if (!passing(e)) throw e;
        if (!down) { down = Date.now(); await tell('Idioms waiting', [e.message, 'It tries again every 5 minutes and carries on by itself.'], { problem: true }); }
        await sleep(WAIT);
      }
    }
  }
  const stage = async (file, fn) => { const got = readJson(file); if (got) return got; const out = await fn(); writeJson(file, out); return out; };
  const meaningsOf = (t) => { const v = json(t); return Array.isArray(v?.meanings) ? v : null; };
  const findings = (t) => { const v = json(t); return Array.isArray(v?.findings) ? v.findings : null; };

  async function one(m) {
    const d = dir(m), keep = path.join(d, 'unreadable.txt');
    if (!m.sources.length) { writeJson(path.join(d, 'done.json'), { left_out: 'no commentary note', cost: 0, t: new Date().toISOString() }); return; }
    const written = await stage(path.join(d, 'written.json'), async () => {
      const r = await ask(() => chatFn({ ...SONNET, system: RULES, user: WRITE(m), step: STEP, role: 'writer' }), meaningsOf, keep);
      if (!r.v) throw Object.assign(new Error(`Sonnet's reply for "${m.idiom}" couldn't be read twice ($${r.cost.toFixed(3)}); it's kept in unreadable.txt.`), { detail: '' });
      return { meanings: r.v.meanings, why: r.v.why ?? null, cost: r.cost };
    });
    let meanings = written.meanings;
    if (!meanings.length) { writeJson(path.join(d, 'done.json'), { left_out: `the notes don't explain it: ${written.why ?? ''}`.trim(), cost: written.cost, t: new Date().toISOString() }); return; }
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
    // Which meaning each card uses; 0 where the card doesn't use the phrase as the idiom (no pop-up there)
    const assign = (file, ms, cardsIn) => stage(path.join(d, file), async () => {
      const ids = new Set(ms.map((x) => x.id)), ok = (x) => ids.has(x?.meaning) || x?.meaning === 0;
      const read = (t) => { const v = json(t); return Array.isArray(v?.cards) ? v.cards : null; };
      const r = cardsIn.length ? await ask(() => chatFn({ ...SONNET, system: RULES, user: ASSIGN(m, ms, cardsIn), step: STEP, role: 'assigner' }), read, keep) : { v: [], cost: 0 };
      let cost = r.cost;
      const got = new Map((r.v ?? []).filter((x) => ok(x) && x.n >= 1 && x.n <= cardsIn.length).map((x) => [x.n, x.meaning]));
      const missed = cardsIn.map((c, k) => ({ c, k })).filter(({ k }) => !got.has(k + 1));
      if (missed.length) {
        const again = await ask(() => chatFn({ ...SONNET, system: RULES, user: ASSIGN(m, ms, missed.map((x) => x.c)), step: STEP, role: 'assigner' }), read, keep);
        cost += again.cost;
        for (const x of again.v ?? []) { const hit = missed[x?.n - 1]; if (hit && ok(x)) got.set(hit.k + 1, x.meaning); }
      }
      return { cards: cardsIn.map((c, k) => ({ ...c, meaning: got.has(k + 1) ? got.get(k + 1) : null })), cost };   // null: no answer
    });
    const a1 = await assign('assign.json', meanings, m.cards);
    let assigned = a1.cards, extra = a1.cost;
    const zeros = assigned.filter((c) => c.meaning === 0);
    if (zeros.length >= UNCOVERED_MIN) {
      const more = await stage(path.join(d, 'more.json'), async () => {
        const r = await ask(() => chatFn({ ...SONNET, system: RULES, user: MORE(m, meanings, zeros), step: STEP, role: 'writer' }), meaningsOf, keep);
        let add = (r.v?.meanings ?? []).map((x, i) => ({ ...x, id: meanings.length + i + 1 }));
        let cost = r.cost;
        if (add.length) {
          const script = scriptCheck(m, [...meanings, ...add]).filter((f) => f.id > meanings.length);
          const t = await ask(() => chatFn({ ...TERRA, system: TERRA_SYSTEM, user: CHECK(m, add), step: STEP, role: 'reviewer' }), findings);
          cost += t.cost;
          const found2 = [...script, ...(t.v ?? []).filter((f) => f.id).map((f) => ({ ...f, id: f.id > meanings.length ? f.id : f.id + meanings.length }))];
          if (found2.length) {   // one fix; if it can't be read or still breaks a rule, the new meaning is dropped
            const f = await ask(() => chatFn({ ...SONNET, system: RULES, user: FIX(m, add, found2), step: STEP, role: 'fixer' }), meaningsOf, keep);
            cost += f.cost;
            add = (f.v?.meanings ?? []).map((x, i) => ({ ...x, id: meanings.length + i + 1 }));
            if (scriptCheck(m, [...meanings, ...add]).some((x) => x.id > meanings.length)) add = [];
          }
        }
        return { meanings: add, why: r.v?.why ?? null, cost };
      });
      extra += more.cost;
      if (more.meanings.length) {
        const allMs = [...meanings, ...more.meanings];
        const a2 = await assign('assign-more.json', allMs, zeros.map(({ meaning, ...c }) => c));
        extra += a2.cost;
        const again = new Map(a2.cards.map((c) => [`${c.passage_id}/${c.stop}/${c.card}`, c.meaning]));
        assigned = assigned.map((c) => c.meaning === 0 ? { ...c, meaning: again.get(`${c.passage_id}/${c.stop}/${c.card}`) ?? 0 } : c);
        meanings = allMs;
      }
    }
    assigned = assigned.map(({ passage_id, stop, card, meaning }) => ({ passage_id, stop, card, meaning: meaning ?? 0 }));
    const used = new Set(assigned.map((c) => c.meaning));
    const renumber = new Map(meanings.filter((x) => used.has(x.id)).map((x, i) => [x.id, i + 1]));
    meanings = meanings.filter((x) => used.has(x.id)).map((x) => ({ ...x, id: renumber.get(x.id) }));
    assigned = assigned.map((c) => ({ ...c, meaning: c.meaning === 0 ? 0 : renumber.get(c.meaning) }));
    const names = new Set(m.sources);
    writeJson(path.join(d, 'idiom.json'), { id: m.id, idiom: m.idiom, debated: m.debated,
      meanings: meanings.map(({ id, meaning, sources }) => ({ id, meaning, sources: (sources ?? []).filter((s) => names.has(s)) })),
      occurrences: m.verses.map((v) => v.ref), cards: assigned.filter((c) => c.meaning !== 0) });
    const unread = ['check-1', 'check-2', 'check-3'].some((f) => readJson(path.join(d, `${f}.json`))?.terra_unread);
    const c = (f) => readJson(path.join(d, f))?.cost ?? 0;
    const total = ['written', 'check-1', 'fix-1', 'check-2', 'fix-2', 'check-3', 'fix-3', 'fix-rules'].reduce((k, f) => k + c(`${f}.json`), 0) + extra;
    const left = readJson(path.join(d, 'fix-3.json'))?.problems?.length ?? 0;
    writeJson(path.join(d, 'done.json'), { firstFindings: first, finalFix: left, meanings: meanings.length, cards: assigned.filter((x) => x.meaning !== 0).length, ...(unread && { terra_unread: true }), flags: 0, cost: Math.round(total * 10000) / 10000, t: new Date().toISOString() });
    log({ type: 'note', title: `Idioms: ${m.idiom}`, lines: [`${first} problems at first, ${left} needed the final fix`, `$${total.toFixed(3)}`] });
  }

  const fail = (m, e) => log({ type: 'note', title: 'Idioms: one failed', lines: [`${m.idiom}: ${e.message}`, e.detail ?? ''], problem: true });
  const queue = [...todo];
  const firstPaid = queue.find((m) => m.sources.length);
  if (firstPaid && queue.length > 1) { queue.splice(queue.indexOf(firstPaid), 1); try { await one(firstPaid); } catch (e) { fail(firstPaid, e); } }
  let finished = 0;
  await Promise.all(Array.from({ length: Math.max(1, Math.min(agents, queue.length)) }, async () => {
    while (queue.length) {
      const m = queue.shift();
      try { await one(m); if (++finished % 100 === 0) backup(`Idioms: ${finished} done (automatic backup)`); }
      catch (e) { fail(m, e); }
    }
  }));
  const done = all.map((m) => ({ m, d: readJson(path.join(dir(m), 'done.json')) })).filter((x) => x.d);
  const result = { made: new Date().toISOString(), idioms: [], left_out: [] };
  for (const { m, d } of done) {
    if (d.left_out) result.left_out.push({ id: m.id, idiom: m.idiom, why: d.left_out });
    else { const w = readJson(path.join(dir(m), 'idiom.json')); if (w && w.cards.length) result.idioms.push(w); else if (w) result.left_out.push({ id: m.id, idiom: m.idiom, why: 'no card uses it as the idiom' }); }
  }
  writeJson(path.join(outDir, only ? 'idioms-test.json' : 'idioms.json'), result);
  const cost = done.reduce((k, x) => k + (x.d.cost ?? 0), 0);
  backup(`Idioms: ${done.length} of ${all.length} done (automatic backup)`);
  log({ type: 'run', status: 'finished', note: `Idioms: ${done.length} of ${all.length}.` });
  await tell('Idioms finished', [`${done.length} of ${all.length} done`, `Cost: $${cost.toFixed(2)}`]);
  return { done: done.length, total: all.length, withMeaning: result.idioms.length, leftOut: result.left_out.length, cost };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const opt = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
  runIdioms({ only: opt('--ids')?.split(',').map(Number) ?? null, agents: Number(opt('--agents') ?? 20) })
    .then((r) => console.log(JSON.stringify(r)), (e) => { console.error(e.message); process.exit(1); });
}
