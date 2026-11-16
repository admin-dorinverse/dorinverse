// Trivia (owner, 2026-11-16; rules in lesson-docs/trivia.md): for each passage, 3 to 4 main questions taken from its
// Prep choice cards and rewritten to stand alone, so the app can ask them at random. A baker collects a passage's
// questions by finishing that lesson.
//
// On the owner's Claude subscription, not OpenRouter (owner: "I don't want to add too much to openrouter"):
//   1. Sonnet picks and rewrites (trivia.md, plus the Prep walkthrough's question and answer rules).
//   2. The script checks what it can count; then Haiku checks the rest against the verses. Haiku is a different model
//      from the writer, so the checker is never the writer.
//   3. Sonnet fixes what was found, up to 2 times. The script checks the last fix; anything countable still broken
//      gets one last fix for just that. No flags: the last version the script passes is used.
// The writer is told "about 15 to 20 words"; the script only sends back a question of 35 words or more (owner: no
// hard limits, like the Big Idea's sentences). Each question's verses come from its card, never from the model.
//
// Every stage is saved in output/trivia/<folder>/, so running it again picks up where it left off. Waits out the
// internet and the weekly limit like the Prep fix run. Writes output/trivia/trivia.json at the end.
//
//   node scripts/dough-maker/run/trivia.mjs --passages 1-1558 --agents 10
//   node scripts/dough-maker/run/trivia.mjs --passages 1,214,600 --test          (writes trivia-test.json)
//   node scripts/dough-maker/run/trivia.mjs --passages 1-30 --dry                (stand-in model: free, no calls)
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { OUTPUT, PASSAGES, logEvent, notify } from './events.mjs';
import { doc } from './docs.mjs';
import { span } from './bsb.mjs';
import { opus, SONNET, HAIKU, LimitError } from './opus.mjs';
import { checkLimits } from './limits.mjs';
import { saveToGit } from './save.mjs';
import { json } from './burnt.mjs';
import { PREP_DIR, about, theText, passing, folder } from './prep.mjs';

const STEP = 'trivia';
export const DIR = path.join(OUTPUT, 'trivia');
const WAIT = Number(process.env.DOUGH_WAIT_MS) || 5 * 60_000;
const FIXES = 2;
const LONG = 35;   // the script's check only; the writer is told 15 to 20
const SAVE_EVERY = 100;
const STAGGER = 2_000;

const readJson = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };
function writeJson(file, data) { fs.writeFileSync(file + '.tmp', JSON.stringify(data, null, 2) + '\n'); fs.renameSync(file + '.tmp', file); }
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const unreadable = (m) => Object.assign(new Error(m), { unreadable: true });

// The Prep walkthrough's sections a trivia question follows (trivia.md: "The Prep walkthrough's rules still apply")
function sections(text, names) {
  const parts = text.split(/\n(?=## )/);
  return parts.filter((s) => names.some((n) => s.startsWith(`## ${n}`))).join('\n\n');
}
export function docs() {
  const prep = doc('prep-walkthrough.md');
  return [
    { name: 'trivia.md', text: doc('trivia.md'), kind: 'doc' },
    { name: 'prep-walkthrough.md (question and answer rules)', kind: 'doc',
      text: '# From prep-walkthrough.md: the rules for questions and answers\n\n' + sections(prep, ['Question types', 'Never give away an answer', 'Answer rules']) },
  ];
}

// --- the passage's choice cards ------------------------------------------------------------------------------------
export function choiceCards(p) {
  const j = readJson(path.join(PREP_DIR, folder(p), 'prep.json'));
  const out = [];
  for (const s of j?.stops ?? []) for (const c of s.cards ?? []) {
    if (c.kind === 'story') continue;
    out.push({ id: `${s.stop}-${c.card}`, type: c.type, verses: c.verses, question: c.question,
      answers: (c.answers ?? []).map((a) => ({ text: a.text, correct: !!a.correct, ...(a.blank && { blank: a.blank }) })) });
  }
  return out;
}

// --- what a script can count -------------------------------------------------------------------------------------
const words = (t) => String(t ?? '').trim().split(/\s+/).filter(Boolean).length;
const stems = (t) => new Set(String(t ?? '').toLowerCase().match(/[a-z']{4,}/g)?.map((w) => w.slice(0, 5)) ?? []);
export function scriptCheck(cards, out) {
  const f = [];
  const say = (n, problem) => f.push({ question: n, problem });
  const qs = out?.questions;
  if (!Array.isArray(qs)) return [{ question: null, problem: 'No list of questions.' }];
  const want = Math.min(3, cards.length);
  if (qs.length < want || qs.length > 4) say(null, `There are ${qs.length} questions. Pick 3 to 4 (all of them if the passage has fewer than 3 choice cards).`);
  const byId = new Map(cards.map((c) => [c.id, c]));
  const seen = new Set();
  qs.forEach((q, i) => {
    const n = i + 1, card = byId.get(String(q.from));
    if (!card) { say(n, `"from" is "${q.from}", which is not one of the passage's choice cards.`); return; }
    if (seen.has(card.id)) say(n, `Card ${card.id} is used twice.`);
    seen.add(card.id);
    const text = String(q.question ?? '');
    const ans = Array.isArray(q.answers) ? q.answers : [];
    const right = ans.filter((a) => a?.correct === true);
    if (!['multiple_choice', 'true_false'].includes(q.type)) say(n, `The type is "${q.type}". It must be "multiple_choice" or "true_false" (fill in the blank becomes multiple choice).`);
    if (q.type === 'multiple_choice' && ans.length !== 3) say(n, `It has ${ans.length} answers. Multiple choice has 3.`);
    if (q.type === 'true_false' && (ans.length !== 2 || !ans.some((a) => a.text === 'True') || !ans.some((a) => a.text === 'False'))) say(n, 'True or false has exactly 2 answers: "True" and "False".');
    if (right.length !== 1) say(n, `It has ${right.length} right answers. It needs exactly 1.`);
    if (words(text) >= LONG) say(n, `The question is ${words(text)} words. Make it short and easy to read, about 15 to 20 words.`);
    if (/___/.test(text)) say(n, 'The question still has a blank. Fill in the blank becomes a multiple choice question.');
    if (/[—–]/.test(text) || ans.some((a) => /[—–]/.test(a?.text ?? ''))) say(n, 'No em dashes or en dashes.');
    if (/^\s*(Then|Now|Next)\b/.test(text)) say(n, 'Never start with "Then", "Now" or "Next".');
    if (/^\s*(He|She|They|Him|Her|His|Their|Them|It)\b/.test(text)) say(n, 'It starts with "he", "she", "they" or "it" before saying who it is.');
    if (/\b\d+:\d+\b|\bchapters?\b|\bverses?\s+\d/i.test(text)) say(n, 'Never use a book, chapter or verse number in the question.');
    if (/\b(baker|friend|Papa Dorin|Dorin)\b/i.test(text)) say(n, 'No Papa Dorin voice. Plain words.');
    for (const a of ans) if (/[,.]/.test(String(a?.text ?? '').replace(/\.\.\./g, ''))) say(n, `The answer "${a.text}" has a comma or period. Answers have none.`);
    // the same right answer as the card
    const was = card.answers.filter((a) => a.correct).map((a) => a.text);
    if (right.length === 1) {
      if (card.type === 'true_false' && q.type === 'true_false' && was[0] && right[0].text !== was[0])
        say(n, `The card's right answer is ${was[0]}; keep the same right answer.`);
      if (q.type === 'multiple_choice' && was.length) {
        const a = stems(right[0].text), b = stems(was.join(' '));
        const same = String(right[0].text).toLowerCase().includes(String(was[0]).toLowerCase()) || [...b].some((s) => a.has(s));
        if (!same && b.size) say(n, `The card's right answer is "${was.join(' / ')}", but the new right answer is "${right[0].text}". Keep the same right answer.`);
      }
    }
  });
  return f;
}

// --- the calls -----------------------------------------------------------------------------------------------------
const show = (cards) => JSON.stringify(cards.map(({ id, type, question, answers }) => ({ id, type, question, answers })), null, 1);
const SHAPE = `Reply with only JSON: {"questions": [{"from": "the card's id", "type": "multiple_choice" or "true_false", "question": "...", "answers": [{"text": "...", "correct": true}, ...]}]}. No other text.`;

const WRITE = (p, cards) => `Above is the BSB text of ${span(p.start, p.end)}. Below are its Prep choice cards, each with an id.

${show(cards)}

Make this passage's trivia questions, following trivia.md.
- Pick the 3 to 4 cards with the main questions of this passage, and rewrite each one so it stands alone.
- "from" is the id of the card you used.
- Before you finish, reread each question as if it were asked at random, with no lesson before it.
${SHAPE}`;

const CHECK = (p, cards, out) => `Above is the BSB text of ${span(p.start, p.end)}. These are its Prep choice cards:

${show(cards)}

These trivia questions were made from them, following trivia.md:

${JSON.stringify(out.questions, null, 1)}

Check each question against trivia.md and the BSB text above.
- Does it make sense when asked at random, with no lesson before it? Is it clear who and what it is about?
- Is the right answer right by the verses, and is each wrong answer false anywhere in the passage?
- Is it one of the passage's main questions? Only report this when a card about something clearly more important was left out.
- Report only clear problems with a rule in trivia.md or the Prep rules above. Word counts, dashes, blanks and answer counts are already checked by a script.
Reply with only JSON: {"findings": [{"question": n, "problem": "..."}]}, where n counts the questions from 1. Nothing found: {"findings": []}. No other text.`;

const FIX = (p, cards, out, found) => `Above is the BSB text of ${span(p.start, p.end)}. These are its Prep choice cards:

${show(cards)}

These trivia questions were made from them:

${JSON.stringify(out.questions, null, 1)}

These problems were found (question numbers count from 1):

${JSON.stringify(found, null, 1)}

Fix every problem, following trivia.md. Change only what needs changing; a question with no problem stays exactly as it is. You may swap a question for another card if that fixes it.
${SHAPE}`;

const readQuestions = (t) => {
  if (!String(t ?? '').trim()) throw unreadable('gave an empty answer');
  const o = lastJson(t);
  if (!Array.isArray(o?.questions)) throw unreadable('gave an answer with no list of questions');
  return o;
};
const readFindings = (t) => {
  if (!String(t ?? '').trim()) throw unreadable('gave an empty answer');
  const o = lastJson(t);
  if (!Array.isArray(o?.findings)) throw unreadable('gave an answer with no list of findings');
  return o.findings;
};
// the last whole JSON object in a reply (a model sometimes answers twice): Burnt Cookies' reader
function lastJson(text) { const o = json(text); if (!o) throw unreadable('gave an answer that is not JSON'); return o; }

// --- a stand-in model for the free dry run -------------------------------------------------------------------------
// Writes from the cards as they are (so the script check has real things to find), fixes by trimming, checks with
// nothing found. Tests the flow, the stages and the resume; it makes no real questions.
export function standIn({ prompt, role }) {
  const cards = JSON.parse(/\n(\[\n \{[\s\S]*?\n\])\n/.exec(prompt)[1]);
  if (role === 'checker') return { text: '{"findings": []}' };
  const qs = cards.slice(0, 4).map((c) => ({ from: c.id, type: c.type === 'fill_blank' ? 'multiple_choice' : c.type,
    question: role === 'fixer' ? String(c.question).replace(/___/g, 'what').replace(/^(Then|Now|Next)\s+/i, '').replace(/[—–]/g, ',') : c.question,
    answers: c.answers.slice(0, c.type === 'true_false' ? 2 : 3).map((a) => ({ text: String(a.text).replace(/[,.]/g, ''), correct: a.correct })) }));
  return { text: 'Here you go.\n' + JSON.stringify({ questions: qs }) };
}

// --- the run -------------------------------------------------------------------------------------------------------
export async function runTrivia(ids, { agents = 1, call = opus, outDir = DIR, test = false } = {}) {
  const system = docs();
  const list = readJson(PASSAGES);
  const byId = new Map(list.map((p) => [p.id, p]));
  let down = null, limitWait = null;
  async function waitOut(e) {
    if (!down) { down = { since: Date.now() }; logEvent({ type: 'run', status: 'waiting', note: e.message }); await notify('Trivia is waiting', [e.message, 'It tries again every 5 minutes and carries on by itself.'], { problem: true }); }
    await sleep(WAIT);
  }
  function backUp() { if (!down) return; down = null; logEvent({ type: 'run', status: 'running', note: 'Trivia is going again.' }); }
  function limitBack(e) {
    limitWait ??= (async () => {
      logEvent({ type: 'run', status: 'waiting', note: 'Trivia hit the weekly limit. Waiting for it to reset.' });
      await notify('Trivia is waiting for your weekly limit', [e.resetsAt && `It resets ${new Date(e.resetsAt).toLocaleString()}`, 'It carries on by itself.'].filter(Boolean), { problem: true });
      for (;;) { await sleep(WAIT); const w = (await checkLimits())?.weekly; if (w?.status && w.status !== 'rejected') break; }
      notify('Trivia is going again', ['The weekly limit reset']);
      limitWait = null;
    })();
    return limitWait;
  }
  async function ask(read, fn) {
    let tried = false;
    for (;;) {
      try { const r = read((await fn()).text); backUp(); return r; }
      catch (e) {
        if (e instanceof LimitError) { await limitBack(e); continue; }
        if (passing(e)) { await waitOut(e); continue; }
        if (tried) throw e;
        tried = true;
      }
    }
  }

  async function one(p) {
    const dir = path.join(outDir, folder(p));
    fs.mkdirSync(dir, { recursive: true });
    const done = readJson(path.join(dir, 'done.json'));
    if (done) return { ...done, before: true };
    const cards = choiceCards(p);
    if (!cards.length) { writeJson(path.join(dir, 'done.json'), { questions: [], note: 'no choice cards' }); return { questions: [] }; }
    const head = about(p) + '\n\n' + theText(p);
    const stage = async (name, fn) => {
      const f = path.join(dir, `${name}.json`);
      if (fs.existsSync(f)) return readJson(f);
      const v = await fn(); writeJson(f, v); return v;
    };
    const write = (role, prompt, effort) => ask(readQuestions, () => call({ model: SONNET, effort, role, passage: p.id, step: STEP, system, prompt: head + '\n\n' + prompt }));

    let out = await stage('write', () => write('writer', WRITE(p, cards), 'medium'));
    let lastGood = scriptCheck(cards, out).length ? null : out;
    let found = [];
    for (let n = 1; n <= FIXES + 1; n++) {
      const script = scriptCheck(cards, out);
      if (!script.length) lastGood = out;
      const check = await stage(`check-${n}`, async () => ({
        script,
        haiku: n > FIXES ? [] : await ask(readFindings, () => call({ model: HAIKU, effort: 'medium', role: 'checker', passage: p.id, step: STEP, system, prompt: head + '\n\n' + CHECK(p, cards, out) })),
      }));
      found = [...check.script, ...check.haiku];
      if (!found.length || n > FIXES) break;
      out = await stage(`fix-${n}`, () => write('fixer', FIX(p, cards, out, found), 'low'));
    }
    // the last fix: anything countable still broken gets one fix for just that
    let script = scriptCheck(cards, out);
    if (script.length) {
      const last = await stage('fix-rules', () => write('fixer', FIX(p, cards, out, script), 'low'));
      if (!scriptCheck(cards, last).length) { out = last; script = []; }
    }
    if (!script.length) lastGood = out;
    const final = lastGood ?? out;
    const byCard = new Map(cards.map((c) => [c.id, c]));
    const questions = final.questions.map((q) => ({ passage_id: p.id, from_card: q.from, type: q.type, verses: byCard.get(String(q.from))?.verses ?? null,
      question: q.question, answers: q.answers.map((a) => ({ text: a.text, correct: a.correct === true })) }));
    const summary = { questions, script_left: scriptCheck(cards, final).length, checker_left: found.length };
    writeJson(path.join(dir, 'done.json'), summary);
    return summary;
  }

  const chosen = ids.map((id) => byId.get(id)).filter(Boolean);
  const todo = chosen.filter((p) => !fs.existsSync(path.join(outDir, folder(p), 'done.json')));
  logEvent({ type: 'run', status: 'running', note: `Trivia: ${todo.length} passages.` });
  const queue = [...todo], tries = new Map(), gaveUp = [];
  let fresh = 0;
  async function worker(n) {
    await sleep(n * STAGGER);
    while (queue.length) {
      const p = queue.shift();
      try {
        const d = await one(p);
        if (d.before) continue;
        fresh++;
        logEvent({ type: 'note', title: `Trivia: ${span(p.start, p.end)}`, lines: [`${d.questions.length} questions`, `${fresh} of ${todo.length} done this run`] });
        if (!test && fresh % SAVE_EVERY === 0) saveToGit(`Trivia: ${fresh} passages done (automatic backup)`);
      } catch (e) {
        const t = (tries.get(p.id) ?? 0) + 1;
        tries.set(p.id, t);
        if (t === 1) queue.push(p); else gaveUp.push(p);
        logEvent({ type: 'note', title: t === 1 ? 'Trivia: trying a passage again at the end' : 'Trivia: gave up on a passage', lines: [`${span(p.start, p.end)}: ${e.message}`], problem: true });
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(agents, Math.max(1, todo.length)) }, (_, i) => worker(i)));

  const all = chosen.map((p) => ({ p, d: readJson(path.join(outDir, folder(p), 'done.json')) })).filter((x) => x.d);
  const questions = all.flatMap((x) => x.d.questions);
  writeJson(path.join(outDir, test ? 'trivia-test.json' : 'trivia.json'), { made: new Date().toISOString(), passages: all.length, count: questions.length,
    script_left: all.filter((x) => x.d.script_left).map((x) => span(x.p.start, x.p.end)), questions });
  return { done: all.length, questions: questions.length, gaveUp: gaveUp.map((p) => span(p.start, p.end)) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const opt = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
  const ids = (opt('--passages') ?? '1-1558').split(',').flatMap((r) => { const [a, b] = r.split('-').map(Number); return b ? Array.from({ length: b - a + 1 }, (_, i) => a + i) : [a]; });
  const dry = process.argv.includes('--dry');
  const r = await runTrivia(ids, { agents: Number(opt('--agents') ?? 1), test: process.argv.includes('--test') || dry,
    ...(dry && { call: async (a) => standIn(a), outDir: path.join(OUTPUT, '..', 'run', '.cache', 'trivia-dry') }) });
  console.log(JSON.stringify(r));
  if (!dry && !process.argv.includes('--test')) { saveToGit('Trivia: all passages done'); notify('Trivia finished', [`${r.questions} questions from ${r.done} passages`, r.gaveUp.length ? `Gave up on: ${r.gaveUp.join(', ')}` : 'None given up']); }
}
