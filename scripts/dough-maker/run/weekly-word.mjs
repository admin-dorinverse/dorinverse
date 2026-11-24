// Weekly Word clues (owner, 2026-11-23; rules in lesson-docs/weekly-word.md): for each word on the approved list,
// its accepted answers and 7 medium-hard clues, each with the BSB reference it comes from.
//
// On the owner's Claude subscription (owner: "Opus writes, opus checks"):
//   1. Opus writes from weekly-word.md and the BSB verses that hold the word.
//   2. The script checks what it can count; then Opus checks the rest against the verses each clue cites.
//   3. Opus fixes what was found, up to 2 times. The last version the script passes is used.
// A word the Bible doesn't give 7 different facts about is swapped (the writer or fixer says so); the run lists them.
//
// Every stage is saved in output/weekly-word/clues/<word>/, so running it again picks up where it left off. Waits out
// the internet and the weekly limit like the trivia run. Writes output/weekly-word/clues.json at the end.
//
//   node scripts/dough-maker/run/weekly-word.mjs --agents 6
//   node scripts/dough-maker/run/weekly-word.mjs --words manna,David,Nile --test     (writes clues-test.json)
//   node scripts/dough-maker/run/weekly-word.mjs --dry                               (stand-in model: free, no calls)
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { OUTPUT, logEvent, notify } from './events.mjs';
import { doc } from './docs.mjs';
import { verses, parseRefs } from './bsb.mjs';
import { opus, OPUS, LimitError } from './opus.mjs';
import { checkLimits } from './limits.mjs';
import { saveToGit } from './save.mjs';
import { json } from './burnt.mjs';
import { passing } from './prep.mjs';

const STEP = 'weekly-word';
export const DIR = path.join(OUTPUT, 'weekly-word');
const WAIT = Number(process.env.DOUGH_WAIT_MS) || 5 * 60_000;
const FIXES = 2;
const MOST_VERSES = 600;   // a word in more verses than this (David, Moses) gets 600 spread evenly through the Bible
const AROUND = 3, AROUND_UP_TO = 150;   // a word in 150 verses or fewer gets the 3 verses either side of each
const STAGGER = 2_000;

const readJson = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };
function writeJson(file, data) { fs.writeFileSync(file + '.tmp', JSON.stringify(data, null, 2) + '\n'); fs.renameSync(file + '.tmp', file); }
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const unreadable = (m) => Object.assign(new Error(m), { unreadable: true });
const asWord = (w) => new RegExp(`(^|[^A-Za-z])${w.replace(/ /g, '\\s+')}($|[^A-Za-z])`, 'i');

/** The approved words, in list order. */
export const wordList = () => Object.values(readJson(path.join(DIR, 'word-list.json'))).flat();

/**
 * The BSB verses that hold the word, written one per line; at most MOST_VERSES, spread evenly. A word in few verses
 * also gets the 3 verses before and after each one, so the writer sees the whole story.
 */
export function versesWith(word) {
  const all = verses();
  const at = all.map((v, i) => (!v.leftOut && asWord(word).test(v.text) ? i : -1)).filter((i) => i >= 0);
  let pick = at.length <= MOST_VERSES ? at : Array.from({ length: MOST_VERSES }, (_, i) => at[Math.floor(i * at.length / MOST_VERSES)]);
  if (at.length <= AROUND_UP_TO) {
    const near = new Set();
    for (const i of at) for (let k = i - AROUND; k <= i + AROUND; k++) if (all[k]?.book === all[i].book) near.add(k);
    pick = [...near].sort((a, b) => a - b);
  }
  return pick.filter((i) => !all[i].leftOut).map((i) => `${all[i].ref} ${all[i].text}`).join('\n');
}

/** The BSB text of a clue's reference, or null if it isn't a real reference. */
export function referenceText(ref) {
  const parts = parseRefs(ref);
  if (!parts) return null;
  const all = verses();
  return parts.flatMap(([a, b]) => all.slice(a, b + 1)).filter((v) => !v.leftOut).map((v) => `${v.ref} ${v.text}`).join('\n');
}

// --- what a script can count -------------------------------------------------------------------------------------
const count = (t) => String(t ?? '').trim().split(/\s+/).filter(Boolean).length;
export function scriptCheck(word, out) {
  const f = [];
  const say = (n, problem) => f.push({ clue: n, problem });
  if (!Array.isArray(out?.clues)) return [{ clue: null, problem: 'No list of clues.' }];
  if (out.clues.length !== 7) say(null, `There are ${out.clues.length} clues. There must be 7.`);
  const accepted = Array.isArray(out.accepted) ? out.accepted.map(String) : [];
  if (!accepted.some((a) => a.toLowerCase() === word.toLowerCase())) say(null, `The accepted answers must include "${word}".`);
  const forms = new Set([word, word.replace(/(es|s)$/i, ''), ...accepted].map((w) => w.toLowerCase()).filter((w) => w.length >= 2));
  out.clues.forEach((c, i) => {
    const n = i + 1, text = String(c?.text ?? '');
    for (const w of forms) if (asWord(w).test(text)) say(n, `The clue holds the word or a form of it ("${w}").`);
    if (count(text) > 25) say(n, `The clue is ${count(text)} words. Keep it to about 10 to 20.`);
    if (count(text) < 6) say(n, `The clue is ${count(text)} words. It needs enough setting to place it in the Bible: who, where or when.`);
    if (/[—–]/.test(text)) say(n, 'No em dashes.');
    if (/\b\d+:\d+\b|\bchapters?\b|\bverses?\s+\d/i.test(text)) say(n, 'No book, chapter or verse number in the clue.');
    if (/^\s*(It also|After that|Then|Also|Later)\b/i.test(text)) say(n, 'Each clue stands on its own. It can\'t lean on an earlier one.');
    const where = referenceText(c?.reference);
    if (!where) say(n, `"${c?.reference}" is not a BSB reference like "Exodus 16:31" or "Exodus 16:13-14".`);
  });
  return f;
}

// --- the calls -----------------------------------------------------------------------------------------------------
const SHAPE = `Reply with only JSON: {"accepted": ["..."], "clues": [{"text": "...", "reference": "Book 1:2"}, ...]}. No other text. If the word can't be done (weekly-word.md, "Swap it if there's not enough"), reply with only {"swap": "why, in one sentence"}.`;
const showClues = (out) => JSON.stringify(out.clues.map((c, i) => ({ n: i + 1, text: c.text, reference: c.reference,
  bsb: referenceText(c.reference) ?? 'not a BSB reference' })), null, 1);

const WRITE = (word) => `The word is "${word}". Below are the BSB verses that hold it.

${versesWith(word)}

Write this word's accepted answers and its 7 clues, following weekly-word.md.
${SHAPE}`;

const CHECK = (word, out) => `The word is "${word}". Its accepted answers: ${JSON.stringify(out.accepted)}.
These are its 7 clues, each with the BSB text of its reference:

${showClues(out)}

Check the word, the accepted answers and the clues against weekly-word.md and the BSB text.
- Is each clue true to its verse?
- Is each clue medium hard, with enough setting to place it in the Bible?
- Do all 7 together fit only this word?
- Does each clue tell something different, and are the stories the word is best known for used?
- Report only clear problems with a rule in weekly-word.md. Clue counts, word counts, dashes and whether the clue holds the word are already checked by a script.
Reply with only JSON: {"findings": [{"clue": n, "problem": "..."}]}, where n counts the clues from 1 (null for the whole word). Nothing found: {"findings": []}. No other text.`;

const FIX = (word, out, found) => `The word is "${word}". Below are the BSB verses that hold it.

${versesWith(word)}

Its accepted answers: ${JSON.stringify(out.accepted)}. Its 7 clues, each with the BSB text of its reference:

${showClues(out)}

These problems were found (clue numbers count from 1):

${JSON.stringify(found, null, 1)}

Fix every problem, following weekly-word.md. Change only what needs changing; a clue with no problem stays exactly as it is.
${SHAPE}`;

const readClues = (t) => {
  if (!String(t ?? '').trim()) throw unreadable('gave an empty answer');
  const o = json(t);
  if (typeof o?.swap === 'string' && o.swap.trim()) return { swap: o.swap.trim() };
  if (!Array.isArray(o?.clues)) throw unreadable('gave an answer with no list of clues');
  return { accepted: Array.isArray(o.accepted) ? o.accepted : [], clues: o.clues.map((c) => ({ text: c?.text, reference: c?.reference })) };
};
const readFindings = (t) => {
  if (!String(t ?? '').trim()) throw unreadable('gave an empty answer');
  const o = json(t);
  if (!Array.isArray(o?.findings)) throw unreadable('gave an answer with no list of findings');
  return o.findings;
};

// --- a stand-in model for the free dry run -------------------------------------------------------------------------
// Writes 7 clues from the first verses given (with the word left in, so the script check has something to find),
// fixes by blanking the word out, and checks with nothing found. Tests the flow, the stages and the resume only.
export function standIn({ prompt, role }) {
  if (role === 'checker') return { text: '{"findings": []}' };
  const word = /The word is "([^"]+)"/.exec(prompt)[1];
  if (word === 'Patmos') return { text: '{"swap": "Only one verse."}' };   // tests the swap
  const lines = prompt.split('\n').filter((l) => /^\S.* \d+:\d+ /.test(l)).slice(0, 7);
  const clues = lines.map((l) => { const m = /^(.* \d+:\d+) (.*)$/.exec(l);
    return { text: role === 'fixer' ? m[2].replace(asWord(word), ' something ') : m[2], reference: m[1] }; });
  return { text: 'Here you go.\n' + JSON.stringify({ accepted: [word], clues }) };
}

// --- the run -------------------------------------------------------------------------------------------------------
export async function runWeeklyWord(words, { agents = 1, call = opus, outDir = path.join(DIR, 'clues'), test = false } = {}) {
  const system = [{ name: 'weekly-word.md', text: doc('weekly-word.md'), kind: 'doc' }];
  let down = null, limitWait = null;
  async function waitOut(e) {
    if (!down) { down = { since: Date.now() }; logEvent({ type: 'run', status: 'waiting', note: e.message }); await notify('Weekly Word is waiting', [e.message, 'It tries again every 5 minutes and carries on by itself.'], { problem: true }); }
    await sleep(WAIT);
  }
  function backUp() { if (!down) return; down = null; logEvent({ type: 'run', status: 'running', note: 'Weekly Word is going again.' }); }
  function limitBack(e) {
    limitWait ??= (async () => {
      logEvent({ type: 'run', status: 'waiting', note: 'Weekly Word hit the weekly limit. Waiting for it to reset.' });
      await notify('Weekly Word is waiting for your weekly limit', [e.resetsAt && `It resets ${new Date(e.resetsAt).toLocaleString()}`, 'It carries on by itself.'].filter(Boolean), { problem: true });
      for (;;) { await sleep(WAIT); const w = (await checkLimits())?.weekly; if (w?.status && w.status !== 'rejected') break; }
      notify('Weekly Word is going again', ['The weekly limit reset']);
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

  async function one(word) {
    const dir = path.join(outDir, word);
    fs.mkdirSync(dir, { recursive: true });
    const done = readJson(path.join(dir, 'done.json'));
    if (done) return { ...done, before: true };
    const stage = async (name, fn) => {
      const f = path.join(dir, `${name}.json`);
      if (fs.existsSync(f)) return readJson(f);
      const v = await fn(); writeJson(f, v); return v;
    };
    const write = (role, prompt, effort) => ask(readClues, () => call({ model: OPUS, effort, role, passage: word, step: STEP, system, prompt }));

    const swapped = (o) => { const d = { word, swap: o.swap }; writeJson(path.join(dir, 'done.json'), d); return d; };
    let out = await stage('write', () => write('writer', WRITE(word), 'medium'));
    if (out.swap) return swapped(out);
    let lastGood = scriptCheck(word, out).length ? null : out;
    let found = [];
    for (let n = 1; n <= FIXES + 1; n++) {
      const script = scriptCheck(word, out);
      if (!script.length) lastGood = out;
      const check = await stage(`check-${n}`, async () => ({
        script,
        opus: n > FIXES ? [] : await ask(readFindings, () => call({ model: OPUS, effort: 'medium', role: 'checker', passage: word, step: STEP, system, prompt: CHECK(word, out) })),
      }));
      found = [...check.script, ...check.opus];
      if (!found.length || n > FIXES) break;
      out = await stage(`fix-${n}`, () => write('fixer', FIX(word, out, found), 'medium'));
      if (out.swap) return swapped(out);
    }
    // the last fix: anything countable still broken gets one fix for just that
    let script = scriptCheck(word, out);
    if (script.length) {
      const last = await stage('fix-rules', () => write('fixer', FIX(word, out, script), 'medium'));
      if (!last.swap && !scriptCheck(word, last).length) { out = last; script = []; }
    }
    if (!script.length) lastGood = out;
    const final = lastGood ?? out;
    const summary = { word, accepted: final.accepted, clues: final.clues, script_left: scriptCheck(word, final).length, checker_left: found.length };
    writeJson(path.join(dir, 'done.json'), summary);
    return summary;
  }

  const todo = words.filter((w) => !fs.existsSync(path.join(outDir, w, 'done.json')));
  logEvent({ type: 'run', status: 'running', note: `Weekly Word: ${todo.length} words.` });
  const queue = [...todo], tries = new Map(), gaveUp = [];
  let fresh = 0;
  async function worker(n) {
    await sleep(n * STAGGER);
    while (queue.length) {
      const w = queue.shift();
      try {
        const d = await one(w);
        if (d.before) continue;
        fresh++;
        logEvent({ type: 'note', title: `Weekly Word: ${w}`, lines: [`${fresh} of ${todo.length} done this run`] });
        if (!test && fresh % 50 === 0) saveToGit(`Weekly Word: ${fresh} words done (automatic backup)`);
      } catch (e) {
        const t = (tries.get(w) ?? 0) + 1;
        tries.set(w, t);
        if (t === 1) queue.push(w); else gaveUp.push(w);
        logEvent({ type: 'note', title: t === 1 ? 'Weekly Word: trying a word again at the end' : 'Weekly Word: gave up on a word', lines: [`${w}: ${e.message}`], problem: true });
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(agents, Math.max(1, todo.length)) }, (_, i) => worker(i)));

  const ended = words.map((w) => readJson(path.join(outDir, w, 'done.json'))).filter(Boolean);
  const all = ended.filter((d) => !d.swap), swaps = ended.filter((d) => d.swap).map(({ word, swap }) => ({ word, why: swap }));
  writeJson(path.join(test ? outDir : DIR, test ? 'clues-test.json' : 'clues.json'), { made: new Date().toISOString(), count: all.length,
    script_left: all.filter((d) => d.script_left).map((d) => d.word), checker_left: all.filter((d) => d.checker_left).map((d) => d.word), swapped: swaps, words: all });
  return { done: all.length, swapped: swaps.length, gaveUp };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const opt = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
  const words = opt('--words')?.split(',') ?? wordList();
  const dry = process.argv.includes('--dry');
  const test = process.argv.includes('--test') || dry;
  const r = await runWeeklyWord(words, { agents: Number(opt('--agents') ?? 1), test,
    ...(test && { outDir: path.join(DIR, 'clues-test') }),
    ...(dry && { call: async (a) => standIn(a), outDir: path.join(OUTPUT, '..', 'run', '.cache', 'weekly-word-dry') }) });
  console.log(JSON.stringify(r));
  if (!test) { saveToGit('Weekly Word: all words done'); notify('Weekly Word finished', [`${r.done} words`, r.gaveUp.length ? `Gave up on: ${r.gaveUp.join(', ')}` : 'None given up']); }
}
