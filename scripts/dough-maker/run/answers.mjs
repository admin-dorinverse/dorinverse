// Answer explanations (answer-explanations.md) for every choice card, decided by the owner on 2026-11-14:
//   1. Sonnet writes each passage's explanations, in OpenRouter batches (half price, Anthropic only).
//   2. A script checks the countable rules, and Opus (low thinking) checks the rest, also in batches.
//   3. Sonnet fixes only what was found; the script and Opus check the fixed ones again; one more Sonnet fix if
//      needed, then Sonnet's version stands. No flags and no questions: every passage ends with a finished list.
// Everything is saved under output/answers/<id and range>/ as it happens, so running it again picks up where it
// left off (batches already sent are waited for, not sent again). Waits out the internet, credits and busy servers.
//
//   node scripts/dough-maker/run/answers.mjs --passages 1-1558 [--agents 20]
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { OUTPUT, PASSAGES, logEvent, notify } from './events.mjs';
import { doc } from './docs.mjs';
import { passageText, span } from './bsb.mjs';
import { saveToGit } from './save.mjs';
import { PREP_DIR, about, theText, folder, passing } from './prep.mjs';
import { chat, submitBatch, waitBatch, SONNET_OR, OPUS_OR } from './openrouter.mjs';

const STEP = 'answer_explanations';
export const ANSWERS_DIR = path.join(OUTPUT, 'answers');
const RUN = path.join(ANSWERS_DIR, '_run.json');
const CHUNK = 300;
const WAIT = Number(process.env.DOUGH_WAIT_MS) || 5 * 60_000;
const OPUS_THINKING = { effort: 'low' };
// Sonnet can't turn thinking off on OpenRouter; left alone it thought for 60% of its output, which cost most of the
// writing and cut 7 of 51 answers off at the token cap (50-passage test, 2026-11-14). Low keeps it short.
const SONNET_THINKING = { effort: 'low' };

const readJson = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };
function writeJson(f, d) { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f + '.tmp', JSON.stringify(d, null, 2) + '\n'); fs.renameSync(f + '.tmp', f); }
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
function json(text) {
  const a = String(text ?? '').indexOf('{'), b = String(text ?? '').lastIndexOf('}');
  try { if (a >= 0 && b > a) return JSON.parse(text.slice(a, b + 1)); } catch { /* below */ }
  return null;
}

// --- one passage's material ----------------------------------------------------------------------------------------
export function material(p) {
  const prep = readJson(path.join(PREP_DIR, folder(p), 'prep.json'));
  const choices = [], story = [];
  for (const s of prep.stops) for (const c of s.cards) {
    if (c.kind === 'choice') choices.push({ stop: s.stop, card: c.card, type: c.type, verses: c.verses, question: c.question,
      answers: c.answers.map((a) => ({ text: a.text, correct: !!a.correct })) });
    else story.push(c.text);
  }
  const cards = { passage: prep.passage, stops: prep.stops.map((s) => ({ ...s, cards: s.cards.map(({ needs_agent_fix, needs_human_decision, ...c }) => c) })) };
  return { p, prep, cards, choices, story, head: about(p) + '\n\n' + theText(p) };
}

// --- prompts -------------------------------------------------------------------------------------------------------
export const SYSTEM = () => [doc('papa-dorin.md'), doc('answer-explanations.md')].join('\n\n');
export const WRITE = (m) => `${m.head}

The Prep cards:
${JSON.stringify(m.cards, null, 2)}

Write the answer explanations for every choice card above, following answer-explanations.md and papa-dorin.md.
- Every answer gets its own explanation, the right one too, in the same order as the card's answers.
- 3 to 5 sentences each. Short fragments like "Never." don't count as sentences.
- Never use a reaction phrase; the code shows those: Underbaked, Still doughy, Came out burnt, Baked just right, Fine work baker, Box-worthy, That's a keeper, Perfect bake.
- Never reuse a line from the Prep cards word for word. Quoting the Bible is fine.
- Every Bible fact from outside this passage carries its reference.
- Never add a reason, purpose or feeling the text doesn't state, unless it's marked as his own guess ("I think").
- No em dashes or en dashes. Cookies are the only food he mentions, except a food in the passage itself.
- Make it sound like Papa Dorin: warm, plain words, funny where a laugh fits, never preachy.
- Reply with only the JSON described in answer-explanations.md "Output". No other text.`;

export const CHECK = (m, items) => `${m.head}

The choice cards:
${JSON.stringify(m.choices.filter((c) => items.some((x) => x.stop === c.stop && x.card === c.card)), null, 2)}

Answer explanations to check (the "answer" number is the explanation's position on its card, starting at 1):
${JSON.stringify(items, null, 2)}

Check every answer explanation above against answer-explanations.md, papa-dorin.md and the BSB text. Report each one that:
- gets the Bible wrong, or adds a fact, reason or feeling the text doesn't give (unless marked as his own guess) ("bible"),
- breaks a rule in answer-explanations.md or papa-dorin.md ("rule"),
- doesn't sound like Papa Dorin: flat, generic, preachy, or no laugh where one clearly fits ("tone").
Only clear problems. Reply with only JSON: {"findings": [{"stop": n, "card": n, "answer": n, "kind": "bible" | "rule" | "tone", "problem": "..."}]}. Nothing found: {"findings": []}.`;

const FIX = (m, all, findings) => `${m.head}

The choice cards:
${JSON.stringify(m.choices, null, 2)}

All the answer explanations so far ("answer" is the position on its card, starting at 1):
${JSON.stringify(all, null, 2)}

Problems found in some of them:
${JSON.stringify(findings, null, 2)}

Rewrite each explanation that has a problem so the problem is gone, following answer-explanations.md and papa-dorin.md. Keep the rest of what it says if it's good. Don't touch explanations without a problem.
Reply with only JSON: {"fixes": [{"stop": n, "card": n, "answer": n, "explanation": "..."}]}.`;

// --- the script check ----------------------------------------------------------------------------------------------
const REACTIONS = /\b(underbaked|still doughy|came out burnt|baked just right|fine work,? baker|box-worthy|that's a keeper|perfect bake)\b/i;
const sentences = (t) => String(t ?? '').replace(/“[^”]*”|"[^"]*"/g, 'Q').split(/[.!?]+(?=\s|$)/).map((s) => s.trim()).filter((s) => s.split(/\s+/).length > 2).length;
const words = (s) => String(s).toLowerCase().replace(/[‘’]/g, "'").match(/[a-z']+/g) ?? [];
const unquoted = (t) => String(t).replace(/“[^”]*”|"[^"]*"/g, ' ');
export function scriptCheck(m, list) {
  const grams = new Set(), bible = new Set(), out = [];
  const add = (set, t) => { const w = words(t); for (let i = 0; i + 8 <= w.length; i++) set.add(w.slice(i, i + 8).join(' ')); };
  for (const t of m.story) add(grams, unquoted(t));
  add(bible, passageText(m.p.start, m.p.end));
  for (const e of list) {
    const t = String(e.explanation ?? '');
    const say = (problem) => out.push({ stop: e.stop, card: e.card, answer: e.answer, kind: 'rule', problem });
    const n = sentences(t);
    if (n < 3 || n > 5) say(`It has ${n} sentences. Explanations are 3 to 5 sentences.`);
    if (/[–—]/.test(unquoted(t))) say('It uses a dash. No em dashes or en dashes.');
    if (REACTIONS.test(t)) say('It uses a reaction phrase. The code shows reactions; the explanation never does.');
    const w = words(unquoted(t));
    for (let k = 0; k + 8 <= w.length; k++) {
      const g = w.slice(k, k + 8).join(' ');
      if (grams.has(g) && !bible.has(g)) { say('It reuses a line from the Prep cards word for word.'); break; }
    }
  }
  return out;
}
// The written cards as a flat list, one entry per answer; missing ones come back as findings
export function flatten(m, out) {
  const list = [], missing = [];
  for (const c of m.choices) {
    const g = (out?.cards ?? []).find((k) => k.stop === c.stop && k.card === c.card);
    c.answers.forEach((a, i) => {
      const e = g?.explanations?.[i];
      if (!e?.explanation) missing.push({ stop: c.stop, card: c.card, answer: i + 1, kind: 'rule', problem: `There is no explanation for the answer "${a.text}". Write one.` });
      list.push({ stop: c.stop, card: c.card, answer: i + 1, answerText: a.text, explanation: e?.explanation ?? '' });
    });
  }
  return { list, missing };
}
const merge = (list, fixes) => list.map((e) => {
  const f = fixes.find((x) => x.stop === e.stop && x.card === e.card && x.answer === e.answer && x.explanation);
  return f ? { ...e, explanation: f.explanation } : e;
});
const finalOut = (m, list) => ({ cards: m.choices.map((c) => ({ stop: c.stop, card: c.card,
  explanations: c.answers.map((a, i) => ({ answer: a.text, explanation: list.find((e) => e.stop === c.stop && e.card === c.card && e.answer === i + 1)?.explanation ?? '' })) })) });

// --- the run -------------------------------------------------------------------------------------------------------
export async function runAnswers(ids, { agents = 20 } = {}) {
  const list = readJson(PASSAGES);
  const byId = new Map(list.map((p) => [p.id, p]));
  const dir = (p) => path.join(ANSWERS_DIR, folder(p));
  const run = readJson(RUN) ?? { batches: [], cost: { batch: 0, sync: 0 } };
  const saveRun = () => writeJson(RUN, run);
  const system = SYSTEM();
  const chosen = ids.map((id) => byId.get(id)).filter((p) => p && fs.existsSync(path.join(PREP_DIR, folder(p), 'prep.json')));
  const mats = new Map();
  const mat = (p) => { if (!mats.has(p.id)) mats.set(p.id, material(p)); return mats.get(p.id); };

  logEvent({ type: 'run', status: 'running', note: `Answer explanations: ${chosen.length} passages.` });
  await notify('Answer explanations started', [`${chosen.length} passages`, 'Sonnet writes in batches, Opus checks, Sonnet fixes, no flags']);

  // A call that waits out passing problems, and tries an unreadable answer once more
  let down = null;
  async function ask(fn, read) {
    let tried = false;
    for (;;) {
      try {
        const r = await fn();
        if (down) { notify('Answer explanations going again', [`After ${Math.round((Date.now() - down) / 60000)} min`]); down = null; }
        run.cost.sync += r.cost ?? 0;
        const v = read(r.text);
        if (v) return v;
        if (tried) return null;
        tried = true;
      } catch (e) {
        if (!passing(e)) throw e;
        if (!down) { down = Date.now(); await notify('Answer explanations waiting', [e.message, 'It tries again every 5 minutes and carries on by itself.'], { problem: true }); }
        await sleep(WAIT);
      }
    }
  }

  // Send a batch for every passage that needs one, wait for them all, and hand each result to save()
  async function batchPhase(phase, model, needs, build, save) {
    const pending = run.batches.filter((b) => b.phase === phase && !b.done);
    const sent = new Set(pending.flatMap((b) => b.ids));
    const todo = chosen.filter((p) => needs(p) && !sent.has(p.id));
    for (let i = 0; i < todo.length; i += CHUNK) {
      const part = todo.slice(i, i + CHUNK);
      let id;
      for (;;) {
        try { id = await submitBatch({ ...model, items: part.map((p) => ({ id: p.id, system, ...build(p) })) }); break; }
        catch (e) { if (!passing(e)) throw e; await sleep(WAIT); }
      }
      const b = { phase, id, ids: part.map((p) => p.id), sent: new Date().toISOString() };
      run.batches.push(b); pending.push(b); saveRun();
      logEvent({ type: 'note', title: `Sent a ${phase} batch`, lines: [`${part.length} passages`, id] });
    }
    await Promise.all(pending.map(async (b) => {
      let r;
      for (;;) { try { r = await waitBatch(b.id); break; } catch (e) { if (!passing(e)) throw e; await sleep(WAIT); } }
      run.cost.batch += r.cost ?? 0;
      await Promise.all(b.ids.map((pid) => save(byId.get(pid), r.results.get(String(pid))?.text ?? null)));
      Object.assign(b, { done: new Date().toISOString(), status: r.status, cost: r.cost, provider: r.provider }); saveRun();
      logEvent({ type: 'note', title: `${phase} batch back`, lines: [`${b.ids.length} passages, ${r.status}`, `$${(r.cost ?? 0).toFixed(2)}`] });
    }));
  }

  // 1. Sonnet writes, in batches. Anything that comes back empty or garbled is written again right away.
  const has = (p, f) => fs.existsSync(path.join(dir(p), f));
  await batchPhase('write', SONNET_OR, (p) => !has(p, 'written.json') && !has(p, 'done.json'),
    (p) => ({ user: WRITE(mat(p)), reasoning: SONNET_THINKING, maxTokens: 32000 }),
    async (p, text) => {
      let out = json(text);
      if (!out?.cards) out = await ask(() => chat({ ...SONNET_OR, system, user: WRITE(mat(p)), reasoning: SONNET_THINKING, maxTokens: 32000, passage: p.id, step: STEP, role: 'writer' }), (t) => json(t)?.cards ? json(t) : null);
      writeJson(path.join(dir(p), 'written.json'), out ?? { cards: [] });
    });

  // 2. The script and Opus check everything that was written, Opus in batches
  await batchPhase('check', OPUS_OR, (p) => has(p, 'written.json') && !has(p, 'check-1.json') && !has(p, 'done.json'),
    (p) => { const m = mat(p); return { user: CHECK(m, flatten(m, readJson(path.join(dir(p), 'written.json'))).list), reasoning: OPUS_THINKING, maxTokens: 16000 }; },
    async (p, text) => {
      const m = mat(p);
      const { list: all, missing } = flatten(m, readJson(path.join(dir(p), 'written.json')));
      let opus = json(text)?.findings;
      if (!Array.isArray(opus)) opus = await ask(() => chat({ ...OPUS_OR, system, user: CHECK(m, all), reasoning: OPUS_THINKING, passage: p.id, step: STEP, role: 'reviewer' }),
        (t) => Array.isArray(json(t)?.findings) ? json(t).findings : null) ?? [];
      writeJson(path.join(dir(p), 'check-1.json'), { script: [...missing, ...scriptCheck(m, all.filter((e) => e.explanation))], opus });
    });

  // 3. Fix what was found, check the fixed ones again, one more fix if needed; then it's done
  const queue = chosen.filter((p) => has(p, 'check-1.json') && !has(p, 'done.json'));
  let finished = 0;
  async function finish(p) {
    const m = mat(p), d = dir(p);
    let { list: all } = flatten(m, readJson(path.join(d, 'written.json')));
    const c1 = readJson(path.join(d, 'check-1.json'));
    let found = [...c1.script, ...c1.opus];
    let rounds = 0;
    for (let n = 1; n <= 2 && found.length; n++) {
      const fixFile = path.join(d, `fix-${n}.json`);
      let fixes = readJson(fixFile)?.fixes;
      if (!fixes) {
        fixes = await ask(() => chat({ ...SONNET_OR, system, user: FIX(m, all, found), reasoning: SONNET_THINKING, maxTokens: 32000, passage: p.id, step: STEP, role: 'fixer' }),
          (t) => Array.isArray(json(t)?.fixes) ? json(t).fixes : null) ?? [];
        writeJson(fixFile, { fixes });
      }
      all = merge(all, fixes);
      rounds = n;
      if (n === 2) break;   // after the 2nd fix, Sonnet's version stands
      const changed = all.filter((e) => fixes.some((x) => x.stop === e.stop && x.card === e.card && x.answer === e.answer));
      const c2File = path.join(d, 'check-2.json');
      let c2 = readJson(c2File);
      if (!c2) {
        const opus = changed.length ? await ask(() => chat({ ...OPUS_OR, system, user: CHECK(m, changed), reasoning: OPUS_THINKING, passage: p.id, step: STEP, role: 'reviewer' }),
          (t) => Array.isArray(json(t)?.findings) ? json(t).findings : null) ?? [] : [];
        c2 = { script: [...flatten(m, finalOut(m, all)).missing, ...scriptCheck(m, changed)], opus };
        writeJson(c2File, c2);
      }
      found = [...c2.script, ...c2.opus];
    }
    writeJson(path.join(d, 'answer-explanations.json'), finalOut(m, all));
    writeJson(path.join(d, 'done.json'), { rounds, firstFindings: c1.script.length + c1.opus.length, t: new Date().toISOString() });
    logEvent({ type: 'step', passage: p.id, step: STEP, status: 'done', model: null });
    if (++finished % 100 === 0) { saveRun(); saveToGit(`Answer explanations: ${finished} passages done (automatic backup)`); }
  }
  await Promise.all(Array.from({ length: Math.max(1, Math.min(agents, queue.length)) }, async () => {
    while (queue.length) {
      const p = queue.shift();
      try { await finish(p); }
      catch (e) { logEvent({ type: 'note', title: 'Answer explanations: a passage failed', lines: [`${span(p.start, p.end)}: ${e.message}`], problem: true }); }
    }
  }));

  saveRun();
  const done = chosen.filter((p) => has(p, 'done.json')).length;
  saveToGit(`Answer explanations: ${done} of ${chosen.length} passages done (automatic backup)`);
  const cost = run.cost.batch + run.cost.sync;
  logEvent({ type: 'run', status: 'finished', note: `Answer explanations: ${done} of ${chosen.length}.` });
  await notify('Answer explanations finished', [`${done} of ${chosen.length} passages done`,
    `Cost so far: $${cost.toFixed(2)} ($${run.cost.batch.toFixed(2)} batches, $${run.cost.sync.toFixed(2)} fixes and rechecks)`]);
  return { done, total: chosen.length, cost: run.cost };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const opt = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
  const ids = [];
  for (const part of String(opt('--passages') ?? '').split(',').filter(Boolean)) {
    const [a, b] = part.split('-').map(Number);
    for (let i = a; i <= (b || a); i++) ids.push(i);
  }
  if (!ids.length) { console.error('Say which passages: --passages 1-1558'); process.exit(1); }
  runAnswers(ids, { agents: Number(opt('--agents') ?? 20) }).then((r) => console.log(JSON.stringify(r)), (e) => { console.error(e.message); process.exit(1); });
}
