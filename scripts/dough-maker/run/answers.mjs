// Answer explanations (answer-explanations.md) for every choice card, as the owner decided on 2026-11-14
// (models.md "Who does what"):
//   1. Sonnet writes each passage's explanations (normal speed, OpenRouter, Anthropic only).
//   2. The script adds a missing "…" to cut quotes (and the BSB's closing mark where a quote ends a sentence), then
//      checks the countable rules. GPT-6.1 Terra (OpenAI only) checks everything.
//   3. Sonnet fixes what was found, up to two times, with the script and Terra checking each fix (only the cards
//      with a problem go back). Anything still wrong gets a final Sonnet fix, and that version stands. No flags.
// Everything is saved under output/answers/<id and range>/ as it happens, so running it again picks up where it
// left off. Waits out the internet, credits and busy servers.
//
//   node scripts/dough-maker/run/answers.mjs --passages 1-1558 [--agents 20]
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { OUTPUT, PASSAGES, logEvent, notify } from './events.mjs';
import { doc } from './docs.mjs';
import { passageText, span, verses, verseIndex } from './bsb.mjs';
import { saveToGit } from './save.mjs';
import { PREP_DIR, about, theText, folder, passing } from './prep.mjs';
import { chat, SONNET_OR } from './openrouter.mjs';

const STEP = 'answer_explanations';
export const ANSWERS_DIR = path.join(OUTPUT, 'answers');
const WAIT = Number(process.env.DOUGH_WAIT_MS) || 5 * 60_000;
const SONNET = { ...SONNET_OR, reasoning: { effort: 'medium' }, maxTokens: 48000 };
const TERRA = { model: 'openai/gpt-6.1-terra', only: ['openai'], name: 'gpt-6.1-terra', maxTokens: 32000 };

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
- Every Bible fact or quote from outside this passage carries its reference, like (Matthew 9:36).
- The first time someone shows up in an explanation, say in a few words who they are, like "Solomon, David's son and Israel's king."
- A quote that starts or stops partway through a verse shows "…" where it's cut, like “…one named Orpah and the other named Ruth.” (Ruth 1:4)
- God, Jesus and holy things are never the joke.
- Never add a reason, purpose or feeling the text doesn't state, unless it's marked as his own guess ("I think").
- No em dashes or en dashes. Cookies are the only food he mentions, except a food in the passage itself.
- Make it sound like Papa Dorin: warm, plain words, funny where a laugh fits, never preachy.
- Reply with only the JSON described in answer-explanations.md "Output". No other text.`;

// A recheck only confirms that the problem found before is gone (owner, 2026-11-15): reading a fixed explanation
// fresh made Terra find new small things every round, so the fixes never settled (225-passage run: 563 left over)
export const RECHECK = (m, items, problems) => `${m.head}

The choice cards:
${JSON.stringify(m.choices.filter((c) => items.some((x) => x.stop === c.stop && x.card === c.card)), null, 2)}

These answer explanations were fixed. Each one is listed with the problem it had before ("answer" is the position on its card, starting at 1):
${JSON.stringify(items.map((x) => ({ ...x, problemItHad: problems.filter((f) => f.stop === x.stop && f.card === x.card && f.answer === x.answer).map((f) => f.problem) })), null, 2)}

For each one, check only whether the problem it had is now fixed. Don't report anything else.
Reply with only JSON: {"findings": [{"stop": n, "card": n, "answer": n, "kind": "bible" | "rule" | "tone", "problem": "the problem that is still there"}]}. All fixed: {"findings": []}.`;

export const CHECK = (m, items) => `${m.head}

The choice cards:
${JSON.stringify(m.choices.filter((c) => items.some((x) => x.stop === c.stop && x.card === c.card)), null, 2)}

Answer explanations to check (the "answer" number is the explanation's position on its card, starting at 1):
${JSON.stringify(items, null, 2)}

Check every answer explanation above against answer-explanations.md, papa-dorin.md and the BSB text. Report each one that:
- gets the Bible wrong, or adds a fact, reason or feeling the text doesn't give (unless marked as his own guess) ("bible"),
- breaks a rule in answer-explanations.md or papa-dorin.md ("rule"),
- doesn't sound like Papa Dorin: flat, generic, preachy, or no laugh where one clearly fits ("tone").
A script already checks the "…" on cut quotes, that quotes are the BSB's exact words, capitals and punctuation, sentence counts, dashes, reaction phrases and lines copied from the Prep cards. Don't report those.
Report tone only when an explanation is clearly flat, generic or preachy, not for small style choices.
Only clear problems. Reply with only JSON: {"findings": [{"stop": n, "card": n, "answer": n, "kind": "bible" | "rule" | "tone", "problem": "..."}]}. Nothing found: {"findings": []}.`;

// Only the cards with a problem go back to Sonnet (owner, 2026-11-15): less to read, and nothing else can change
export const FIX = (m, all, findings) => { const on = (x) => findings.some((f) => f.stop === x.stop && f.card === x.card); return `${m.head}

The choice cards that have a problem:
${JSON.stringify(m.choices.filter(on), null, 2)}

Their answer explanations ("answer" is the position on its card, starting at 1):
${JSON.stringify(all.filter(on), null, 2)}

Problems found in some of them:
${JSON.stringify(findings, null, 2)}

Rewrite each explanation that has a problem so the problem is gone, following answer-explanations.md and papa-dorin.md. Keep the rest of what it says if it's good. Don't touch explanations without a problem.
- Change only what the problem needs. Don't add new facts, jokes or sentences beyond that.
- Keep each explanation 3 to 5 sentences.
Reply with only JSON: {"fixes": [{"stop": n, "card": n, "answer": n, "explanation": "..."}]}.`; };

// --- the script check ----------------------------------------------------------------------------------------------
const REACTIONS = /\b(underbaked|still doughy|came out burnt|baked just right|fine work,? baker|box-worthy|that's a keeper|perfect bake)\b/i;
// Quotes count as one word; a quote (and its reference) followed by a capital letter ends a sentence
export const sentences = (t) => String(t ?? '')
  .replace(/(“[^”]*”|"[^"]*")(\s*\([^)]*\))?\s+(?=[A-Z])/g, (q, a, ref) => a + (ref ?? '') + '. ')
  .replace(/“[^”]*”|"[^"]*"/g, 'Q').replace(/\(([^)]*)\)/g, 'R')
  .split(/[.!?]+(?=\s|$)/).map((x) => x.trim()).filter((x) => x.split(/\s+/).length > 2).length;
const words = (s) => String(s).toLowerCase().replace(/[‘’]/g, "'").match(/[a-z']+/g) ?? [];
const unquoted = (t) => String(t).replace(/“[^”]*”|"[^"]*"/g, ' ');
export function scriptCheck(m, list) {
  const grams = new Set(), bible = new Set(), out = [];
  const add = (set, t) => { const w = words(t); for (let i = 0; i + 8 <= w.length; i++) set.add(w.slice(i, i + 8).join(' ')); };
  for (const t of m.story) add(grams, unquoted(t));
  add(bible, passageText(m.p.start, m.p.end));
  const bibleText = norm(passageText(m.p.start, m.p.end)).replace(/^.*? \d+:\d+ /gm, " ").replace(/\s+/g, " ").toLowerCase();
  const bibleWords = new Set(words(bibleText));
  for (const e of list) {
    const t = String(e.explanation ?? '');
    const say = (problem) => out.push({ stop: e.stop, card: e.card, answer: e.answer, kind: 'rule', problem });
    for (const q of t.match(/“[^”]+”|"[^"]+"/g) ?? []) {
      const inner = norm(q.slice(1, -1)).replace(/\s+/g, " ").trim().toLowerCase();
      // "…" marks skipped words, so each side of it is checked on its own
      const pieces = inner.split(/\s*(?:…|[.,;:!?])\s*/).filter((x) => x.split(" ").length >= 3);
      const w = words(inner);
      const biblical = w.length >= 3 && w.filter((x) => bibleWords.has(x)).length / w.length >= 0.75;
      if (biblical && pieces.some((x) => !bibleText.includes(x))) { say("A quote isn't the BSB's exact words."); break; }
    }
    const n = sentences(t);
    if (n < 3 || n > 5) say(`It has ${n} sentences. Explanations are 3 to 5 sentences.`);
    if (/[–—]/.test(unquoted(t))) say('It uses a dash. No em dashes or en dashes.');
    if (REACTIONS.test(t)) say('It uses a reaction phrase. The code shows reactions; the explanation never does.');
    const w = words(unquoted(t));
    for (let k = 0; k + 8 <= w.length; k++) {
      const g = w.slice(k, k + 8).join(' ');
      // Only Papa Dorin's own lines count: a plain retelling of the verse ("he has raised his hand to the LORD") uses
      // the verse's words, so a shared run of words that is mostly the verse's own words isn't a copied line
      const own = w.slice(k, k + 8).filter((x) => !bibleWords.has(x)).length;
      if (grams.has(g) && !bible.has(g) && own >= 3) { say('It reuses a line from the Prep cards word for word.'); break; }
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
export const merge = (list, fixes) => list.map((e) => {
  const f = fixes.find((x) => x.stop === e.stop && x.card === e.card && x.answer === e.answer && x.explanation);
  return f ? { ...e, explanation: f.explanation } : e;
});
export const finalOut = (m, list) => ({ cards: m.choices.map((c) => ({ stop: c.stop, card: c.card,
  explanations: c.answers.map((a, i) => ({ answer: a.text, explanation: list.find((e) => e.stop === c.stop && e.card === c.card && e.answer === i + 1)?.explanation ?? '' })) })) });

// --- the missing "…" ---------------------------------------------------------------------------------------------
// papa-dorin.md "Quotes": a quote can start or stop partway through a verse; where it cuts off, it shows "…". Sonnet
// often leaves the "…" out, so the script puts it in: "…" where a quote cuts into the middle of a sentence, and the
// BSB's own closing mark where it ends one ("How awesome is this place!" stays as it is; "…he was afraid…" gets
// both). The words are copied from the BSB itself, so nested quote marks stay right. A quote that isn't found inside
// one verse word for word is left alone. Terra is told the script handles this, so the two never disagree.
const norm = (s) => s.replace(/[‘’]/g, "'").replace(/[“”]/g, '"');
export function addEllipses(text, start, end) {
  const vs = verses().slice(verseIndex(start), verseIndex(end) + 1).filter((v) => !v.leftOut).map((v) => v.text.trim());
  return String(text).replace(/“([^”]+)”|"([^"]+)"/g, (whole, a, b) => {
    const q = a ?? b, open = a != null ? '“' : '"', close = a != null ? '”' : '"';
    const core = norm(q.replace(/^…\s*/, '').replace(/\s*…$/, '').replace(/[.,;:!?]$/, '')).trim();
    if (core.split(/\s+/).length < 3) return whole;
    for (const v of vs) {
      const V = norm(v), at = V.toLowerCase().indexOf(core.toLowerCase());   // the BSB decides the capitals too
      if (at < 0) continue;
      const before = V.slice(0, at).trimEnd(), after = V.slice(at + core.length);
      // a verse can start mid-sentence ("both Mahlon and Chilion…"): the BSB's small letter says so
      const cleanStart = before === '' ? !/^[a-z]/.test(v.slice(at)) : /[.!?:;"'(]$/.test(before);
      const next = after.match(/^[.!?,;:]/)?.[0] ?? '';
      let out = v.slice(at, at + core.length);
      if (!cleanStart) out = '…' + out;
      if (/[.!?]/.test(next)) out += next;
      else if (after.trim() !== '') out += '…';
      return open + out + close;
    }
    return whole;
  });
}

// --- the run -------------------------------------------------------------------------------------------------------
export async function runAnswers(ids, { agents = 20 } = {}) {
  const list = readJson(PASSAGES);
  const byId = new Map(list.map((p) => [p.id, p]));
  const dir = (p) => path.join(ANSWERS_DIR, folder(p));
  const system = SYSTEM();
  const chosen = ids.map((id) => byId.get(id)).filter((p) => p && fs.existsSync(path.join(PREP_DIR, folder(p), 'prep.json')));
  const todo = chosen.filter((p) => !fs.existsSync(path.join(dir(p), 'done.json')));
  logEvent({ type: 'run', status: 'running', note: `Answer explanations: ${chosen.length} passages.` });
  await notify('Answer explanations started', [`${todo.length} passages (${chosen.length - todo.length} already done)`, 'Sonnet writes, Terra checks, up to two fixes and a final fix, no flags']);

  let down = null;
  async function ask(fn, read) {
    let tried = false;
    for (;;) {
      try {
        const r = await fn();
        if (down) { notify('Answer explanations going again', [`After ${Math.round((Date.now() - down) / 60000)} min`]); down = null; }
        const v = read(r.text);
        if (v || tried) return { v, cost: r.cost ?? 0 };
        tried = true;
      } catch (e) {
        if (!passing(e)) throw e;
        if (!down) { down = Date.now(); await notify('Answer explanations waiting', [e.message, 'It tries again every 5 minutes and carries on by itself.'], { problem: true }); }
        await sleep(WAIT);
      }
    }
  }
  const stage = async (file, fn) => { const got = readJson(file); if (got) return got; const out = await fn(); writeJson(file, out); return out; };
  const findings = (t) => Array.isArray(json(t)?.findings) ? json(t).findings : null;
  const key = (x) => `${x.stop}/${x.card}/${x.answer}`;

  async function one(p) {
    const m = material(p), d = dir(p);
    const fixQuotes = (list) => list.map((e) => ({ ...e, explanation: addEllipses(e.explanation, p.start, p.end) }));
    // 1. Sonnet writes
    const written = await stage(path.join(d, 'written.json'), async () => {
      const r = await ask(() => chat({ ...SONNET, system, user: WRITE(m), passage: p.id, step: STEP, role: 'writer' }), (t) => json(t)?.cards ? json(t) : null);
      return { ...(r.v ?? { cards: [] }), cost: r.cost };
    });
    // 2. The "…", the script, then Terra checks everything
    let { list: all, missing } = flatten(m, written);
    all = fixQuotes(all);
    // The first check reads everything; a recheck only confirms that Terra's earlier problems are gone (the script's
    // own rules are checked again in full, since they are counted, not judged)
    const check = (file, items, extra = [], before = null) => stage(path.join(d, file), async () => {
      const script = [...extra, ...scriptCheck(m, items.filter((x) => x.explanation))];
      const terraHad = before?.filter((f) => !/^(It has|It uses|It reuses|A quote isn|There is no)/.test(f.problem)) ?? null;
      const toCheck = terraHad ? items.filter((x) => x.explanation && terraHad.some((f) => key(f) === key(x))) : items.filter((x) => x.explanation);
      const user = terraHad ? RECHECK(m, toCheck, terraHad) : CHECK(m, toCheck);
      const r = toCheck.length ? await ask(() => chat({ ...TERRA, system, user, passage: p.id, step: STEP, role: 'reviewer' }), findings) : { v: [], cost: 0 };
      return { script, terra: r.v ?? [], cost: r.cost, terraReadable: !!r.v };
    });
    const c1 = await check('check-1.json', all, missing);
    let found = [...c1.script, ...c1.terra];
    const first = found.length;
    // 3. Up to two fixes, each with only the flagged cards, each checked by the script and Terra
    for (let n = 1; n <= 2 && found.length; n++) {
      const fix = await stage(path.join(d, `fix-${n}.json`), async () => {
        const r = await ask(() => chat({ ...SONNET, system, user: FIX(m, all, found), passage: p.id, step: STEP, role: 'fixer' }),
          (t) => Array.isArray(json(t)?.fixes) ? json(t).fixes : null);
        return { fixes: r.v ?? [], cost: r.cost };
      });
      all = fixQuotes(merge(all, fix.fixes));
      const flagged = new Set(found.map(key));
      const again = all.filter((x) => flagged.has(key(x)));
      const cn = await check(`check-${n + 1}.json`, again, flatten(m, finalOut(m, all)).missing, found);
      found = [...cn.script, ...cn.terra];
    }
    // 4. Anything still wrong after the second fix gets a final Sonnet fix, and that version stands: no flags
    //    (owner, 2026-11-15). What was still wrong is kept in fix-3.json, for the record.
    const left = found.length;
    if (found.length) {
      const fix = await stage(path.join(d, 'fix-3.json'), async () => {
        const r = await ask(() => chat({ ...SONNET, system, user: FIX(m, all, found), passage: p.id, step: STEP, role: 'fixer' }),
          (t) => Array.isArray(json(t)?.fixes) ? json(t).fixes : null);
        return { fixes: r.v ?? [], cost: r.cost, problems: found };
      });
      all = fixQuotes(merge(all, fix.fixes));
    }
    const flags = [];
    writeJson(path.join(d, 'answer-explanations.json'), finalOut(m, all));
    writeJson(path.join(d, 'flags.json'), { passage: span(p.start, p.end), flags });
    const c = (f) => readJson(path.join(d, f))?.cost ?? 0;
    const total = ['written.json', 'check-1.json', 'fix-1.json', 'check-2.json', 'fix-2.json', 'check-3.json', 'fix-3.json'].reduce((k, f) => k + c(f), 0);
    writeJson(path.join(d, 'done.json'), { explanations: all.length, firstFindings: first, finalFix: left, flags: 0,
      cost: Math.round(total * 10000) / 10000, t: new Date().toISOString() });
    logEvent({ type: 'step', passage: p.id, step: STEP, status: 'done', model: null, flags: { humanDecision: flags.length } });
    logEvent({ type: 'note', title: `Answer explanations for ${span(p.start, p.end)}`,
      lines: [`${all.length} explanations, ${first} needed a fix, ${left} needed the final fix`, `${total.toFixed(3)}`] });
  }

  // The first passage goes alone, so the rules are in the cache before the rest start (otherwise they all pay full
  // price to read them: only 16% came from the cache in the 25-passage test)
  if (todo.length > 1) {
    try { await one(todo[0]); }
    catch (e) { logEvent({ type: 'note', title: 'Answer explanations: a passage failed', lines: [`${span(todo[0].start, todo[0].end)}: ${e.message}`], problem: true }); }
    todo.shift();
  }

  const queue = [...todo];
  let finished = 0;
  await Promise.all(Array.from({ length: Math.max(1, Math.min(agents, queue.length)) }, async () => {
    while (queue.length) {
      const p = queue.shift();
      try { await one(p); if (++finished % 100 === 0) saveToGit(`Answer explanations: ${finished} passages done (automatic backup)`); }
      catch (e) { logEvent({ type: 'note', title: 'Answer explanations: a passage failed', lines: [`${span(p.start, p.end)}: ${e.message}`, e.detail ?? ''], problem: true }); }
    }
  }));

  // All the flags in one file for the person
  const flagged = chosen.map((p) => readJson(path.join(dir(p), 'flags.json'))).filter((x) => x?.flags?.length);
  const nFlags = flagged.reduce((k, x) => k + x.flags.length, 0);
  writeJson(path.join(ANSWERS_DIR, 'flags.json'), { t: new Date().toISOString(), passages: flagged.length, flags: nFlags, items: flagged });
  const done = chosen.filter((p) => fs.existsSync(path.join(dir(p), 'done.json')));
  const totalCost = done.reduce((k, p) => k + (readJson(path.join(dir(p), 'done.json'))?.cost ?? 0), 0);
  saveToGit(`Answer explanations: ${done.length} of ${chosen.length} passages done (automatic backup)`);
  logEvent({ type: 'run', status: 'finished', note: `Answer explanations: ${done.length} of ${chosen.length}.` });
  await notify('Answer explanations finished', [`${done.length} of ${chosen.length} passages done`, `Flagged for you: ${nFlags}`, `Cost: $${totalCost.toFixed(2)}`]);
  return { done: done.length, total: chosen.length, flags: nFlags, cost: totalCost };
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
