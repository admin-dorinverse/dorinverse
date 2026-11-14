// The Prep fix run: brings every finished Prep walkthrough in line with the docs as they are now, including the
// owner's decisions on the tracker's questions, and leaves nothing on the tracker. The owner's instructions
// (2026-11-14): fix everything, no flags, no questions; where the rules don't settle something, decide.
//
// For each passage:
//   1. Opus fixes: the walkthrough, everything already known to be wrong with it (the old flags, the old questions
//      the docs now answer, and what a script can count), and the docs. It also reads every card against the
//      current rules and fixes anything else. It changes only what needs changing.
//   2. The script check (check-prep.mjs), then Sonnet checks the result. Sonnet is a different model from the
//      fixer, so the checker is never the fixer. Whatever they find goes back to Opus.
//   3. Up to 2 fixes. The 2nd fixes only what the check found (lower effort, a small job) and gets the script check
//      only; then Opus's walkthrough is used as it is (unless the script finds it broken, then the last one that
//      wasn't). Nothing goes on the tracker. (3 rounds used about 0.08% of the weekly limit per passage, too much
//      for all 1,558 in one week; 2 rounds keeps the run inside it.)
// prep.json is replaced with the fixed walkthrough and result.json is emptied. Every round is saved under
// output/fix/<id and range>/, so running it again picks up where it left off. At the end, Kimi checks 50 random
// passages as a report only (fix-report.json); it changes nothing.
//
// Waits out the internet, credits, busy servers and the Opus weekly limit like prep.mjs. A passage that can't be
// fixed (an answer that can't be read, twice) keeps its old walkthrough, gets one more try at the end, and is
// listed when the run finishes.
//
//   node scripts/dough-maker/run/fix.mjs --passages 1-1558 --agents 20
//   node scripts/dough-maker/run/fix.mjs --passages 1,57,600 --no-spotcheck     a test
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { OUTPUT, PASSAGES, logEvent, notify } from './events.mjs';
import { doc } from './docs.mjs';
import { passageText, span } from './bsb.mjs';
import { checkPrep } from './check-prep.mjs';
import { opus, SONNET, LimitError } from './opus.mjs';
import { kimi } from './kimi.mjs';
import { checkLimits } from './limits.mjs';
import { saveToGit } from './save.mjs';
import { PREP_DIR, about, theText, CHECK, passing, folder, saveTracker } from './prep.mjs';

const STEP = 'fix';
const FIX_DIR = path.join(OUTPUT, 'fix');
const WAIT = Number(process.env.DOUGH_WAIT_MS) || 5 * 60_000;
const ROUNDS = 2;
const SAVE_EVERY = 100;
const SPOTCHECK = 50;
const STAGGER = 3_000;

const readJson = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };
function writeJson(file, data) { fs.writeFileSync(file + '.tmp', JSON.stringify(data, null, 2) + '\n'); fs.renameSync(file + '.tmp', file); }
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const before = (prev) => prev
  ? `The passage right before it, for context only (not part of the lesson): ${span(prev.start, prev.end)}\n${passageText(prev.start, prev.end)}`
  : 'The passage right before it: none. This is the first passage of the Bible.\n';

// --- what a script can count ---------------------------------------------------------------------------------------
// Hints for Opus, not verdicts: a card the script points at may still be right (a long-stretch summary can run 4).
const sentences = (t) => String(t ?? '').replace(/“[^”]*”|"[^"]*"/g, 'Q').split(/[.!?]+(?=\s|$)/)
  .map((s) => s.trim()).filter((s) => s.split(/\s+/).length > 2).length;
export function hints(out) {
  const h = [];
  const say = (stop, card, problem) => h.push({ where: card ? { stop, card } : { stop }, problem });
  (out?.stops ?? []).forEach((s, si) => {
    const tf = (s.cards ?? []).filter((c) => c.type === 'true_false').map((c) => c.answers?.find((a) => a.correct)?.text);
    if (tf.length >= 2 && new Set(tf).size === 1) say(s.stop, null, `Every true or false card in this stop is ${tf[0]}. Mix True and False.`);
    (s.cards ?? []).forEach((c, ci) => {
      const text = [c.text, c.question, ...(c.answers ?? []).map((a) => a.text)].filter(Boolean).join(' ');
      if (c.kind === 'story' && !(si === 0 && ci === 0)) {
        const n = sentences(c.text);
        if (n > 2) say(s.stop, c.card, `This story card has ${n} sentences. Story cards are 1 to 2, except a long-stretch summary card, which can be up to 4.`);
        if (/^\s*(YES|Yes|YEP|Yep|Right|RIGHT|Nope|NOPE|Exactly|EXACTLY|Correct|That's right|You got it)\b/.test(c.text ?? '')) say(s.stop, c.card, 'This story card reacts to the baker\'s pick. Story cards never react to the pick.');
      }
      if (/\bMags\b/.test(text)) say(s.stop, c.card, 'Mags is now Ruby, the bell.');
      if (/mango/i.test(text)) say(s.stop, c.card, 'Ruby\'s topping is strawberries now, not mango bits.');
      if (/blueberr/i.test(text)) say(s.stop, c.card, 'Berry\'s topping is raisins now, not dried blueberries.');
      if (/\bstations?\b/i.test(c.text ?? '') && /(Chip|Sparkle|Minty|Berry|Buttercup|Mags|Ruby)|\bmy stations?\b|stations to name/i.test(c.text ?? ''))
        say(s.stop, c.card, 'There are no stations anymore. His kids are constellations shaped like them in his sky.');
      if (/\blast time\b/i.test(text)) say(s.stop, c.card, 'Each lesson stands on its own. Never "last time."');
    });
  });
  return h;
}

// --- the calls -----------------------------------------------------------------------------------------------------

const FIX = (p) => `Above is Papa Dorin's Prep walkthrough for ${span(p.start, p.end)}, and a list of what is already known to be wrong with it.

Bring this walkthrough fully in line with prep-walkthrough.md and papa-dorin.md as they are now. The rules changed since it was written, so the list is a starting point, not the whole job.
- Fix everything on the list. Some items were questions; the docs now answer them, so follow the docs.
- Then read every card against every rule and the BSB text, and fix anything else that breaks a rule.
- Leave nothing open and ask nothing. Where the rules don't settle something, decide it yourself: stay faithful to the BSB text, keep it clear for any baker, keep it right for a Bible app, and pick the safest choice that fits the rules.
- Change only what needs changing. A card that already follows every rule stays exactly as it is.
- If a fix adds or removes cards, renumber the cards in that stop so they start at 1 and go up by one.
- Before you finish, reread every card against the rules.
- Reply with only the whole corrected walkthrough, as the JSON described in prep-walkthrough.md "Output". No other text.`;

const REVIEW = (p) => `Above is Papa Dorin's Prep walkthrough for ${span(p.start, p.end)}, in the BSB text above.

Check it against every rule in prep-walkthrough.md and papa-dorin.md, and against the BSB text.
- Report only clear breaks of a rule the docs state. If the docs don't settle something, it is not a finding.
- A script already checks the JSON shape and numbering, verse references, stop ranges, card counts, answer counts, blanks, punctuation in answers, exact quotes, dashes and foods. Don't repeat those.
- Reply with only JSON: {"findings": [{"where": {"stop": n, "card": n}, "problem": "...", "rule": "the rule's exact words"}]}. "where" can be {"stop": n} or null. Nothing found: {"findings": []}. No other text.`;

function json(text) {
  const a = text.indexOf('{'), b = text.lastIndexOf('}');
  if (!text.trim()) throw Object.assign(new Error('gave an empty answer'), { unreadable: true });
  try { if (a >= 0 && b > a) return JSON.parse(text.slice(a, b + 1)); } catch { /* below */ }
  throw Object.assign(new Error('gave an answer that isn\'t JSON'), { unreadable: true });
}

// --- the run -------------------------------------------------------------------------------------------------------

export async function runFix(ids, { agents = 1, spotcheck = true } = {}) {
  const papaMd = { name: 'papa-dorin.md', text: doc('papa-dorin.md'), kind: 'doc' };
  const prepMd = { name: 'prep-walkthrough.md', text: doc('prep-walkthrough.md'), kind: 'doc' };
  const checkerMd = { name: 'checker.md', text: doc('checker.md'), kind: 'doc' };
  const list = readJson(PASSAGES);
  const byId = new Map(list.map((p) => [p.id, p]));
  const status = (p, s, model) => logEvent({ type: 'step', passage: p.id, step: STEP, status: s, model });

  // Waiting: the internet, credits, busy servers (every 5 minutes) and the Opus weekly limit (checked every 5 minutes)
  let down = null, opusWait = null;
  async function waitOut(e, p) {
    if (!down) {
      down = { since: Date.now() };
      logEvent({ type: 'run', status: 'waiting', note: e.message });
      await notify('Fix run is waiting', [e.message, 'Nothing is lost. It tries again every 5 minutes and carries on by itself.'], { problem: true });
    }
    await sleep(WAIT);
  }
  function backUp() {
    if (!down) return;
    const mins = Math.max(1, Math.round((Date.now() - down.since) / 60_000));
    down = null;
    logEvent({ type: 'run', status: 'running', note: `Back after waiting ${mins} min.` });
    notify('Fix run is going again', [`It waited ${mins} min and carried on by itself`]);
  }
  function opusBack(e) {
    opusWait ??= (async () => {
      const since = Date.now();
      logEvent({ type: 'run', status: 'waiting', note: 'Opus hit the weekly limit. Waiting for it to reset.' });
      await notify('Fix run is waiting for Opus', ['Opus hit your weekly limit', e.resetsAt && `It resets ${new Date(e.resetsAt).toLocaleString()}`,
        'If you use a free reset, the run sees it within 5 minutes and carries on by itself.'].filter(Boolean), { problem: true });
      for (;;) { await sleep(WAIT); const w = (await checkLimits())?.weekly; if (w?.status && w.status !== 'rejected') break; }
      logEvent({ type: 'run', status: 'running', note: `Opus is back after ${Math.round((Date.now() - since) / 60_000)} min.` });
      notify('Fix run is going again', ['Opus is available again']);
      opusWait = null;
    })();
    return opusWait;
  }
  // A call that waits out passing problems and the weekly limit, and tries an unreadable answer once more
  async function ask(read, fn) {
    let tried = false;
    for (;;) {
      try { const r = read((await fn()).text); backUp(); return r; }
      catch (e) {
        if (e instanceof LimitError) { await opusBack(e); continue; }
        if (passing(e)) { await waitOut(e); continue; }
        if (tried) throw e;
        tried = true;
      }
    }
  }

  async function fixOne(p) {
    const src = path.join(PREP_DIR, folder(p));
    const dir = path.join(FIX_DIR, folder(p));
    fs.mkdirSync(dir, { recursive: true });
    const done = readJson(path.join(dir, 'done.json'));
    if (done) return { ...done, before: true };
    const original = readJson(path.join(dir, 'original.json')) ?? readJson(path.join(src, 'prep.json'));
    if (!fs.existsSync(path.join(dir, 'original.json'))) writeJson(path.join(dir, 'original.json'), original);
    const result = readJson(path.join(src, 'result.json')) ?? { agent: [], human: [] };
    const prev = byId.get(p.id - 1) ?? null;
    const head = about(p) + '\n\n' + theText(p);
    const top = about(p) + '\n\n' + before(prev) + '\n' + theText(p);
    const strip = (o) => ({ ...o, stops: (o.stops ?? []).map((s) => ({ ...s, cards: (s.cards ?? []).map(({ needs_agent_fix, needs_human_decision, ...c }) => c) })) });
    const show = (o) => JSON.stringify(strip(o), null, 2);
    const stage = async (file, fn) => {
      const f = path.join(dir, `${file}.json`);
      if (fs.existsSync(f)) return readJson(f);
      const out = await fn();
      writeJson(f, out);
      return out;
    };

    // What is already known: the old flags, the old questions, and what a script can count
    let known = [
      ...result.agent.map((f) => ({ where: f.where ?? null, problem: f.problem })),
      ...result.human.map((f) => ({ where: f.where ?? null, problem: `${f.problem ?? ''} The question was: ${f.question} The docs now answer it.`.trim() })),
      ...hints(original),
    ];
    let out = original, lastGood = original, changes = 0, rounds = 0;
    for (let n = 1; n <= ROUNDS; n++) {
      status(p, 'fixing', 'opus');
      const fixed = await stage(`fix-${n}`, () => ask((t) => {
        const o = json(t);
        if (!Array.isArray(o?.stops) || !o.stops.length) throw Object.assign(new Error('gave a walkthrough with no stops'), { unreadable: true });
        return o;
      }, () => opus({ role: 'fixer', passage: p.id, step: STEP, system: [papaMd, prepMd], effort: n === 1 ? 'medium' : 'low',
        prompt: top + '\n\n' + show(out) + '\n\n' + JSON.stringify({ known }, null, 2) + '\n\n' + FIX(p) })));
      rounds = n;
      out = fixed;
      const script = checkPrep(out, p, { previous: prev }).findings;
      if (!script.length) lastGood = out;
      status(p, 'checking', 'sonnet');
      const review = await stage(`check-${n}`, async () => {
        const found = script.length || n === ROUNDS ? [] : await ask((t) => {
          const o = json(t);
          if (!Array.isArray(o?.findings)) throw Object.assign(new Error('gave an answer with no list of findings'), { unreadable: true });
          return o.findings;
        }, () => opus({ model: SONNET, role: 'reviewer', passage: p.id, step: STEP, system: [papaMd, prepMd, checkerMd],
          prompt: head + '\n\n' + show(out) + '\n\n' + REVIEW(p) }));
        return { script: script.map((f) => ({ where: f.where, problem: f.problem })), sonnet: found };
      });
      known = [...review.script, ...review.sonnet.map((f) => ({ where: f.where ?? null, problem: f.problem + (f.rule ? ` Rule: ${f.rule}` : '') }))];
      changes += 1;
      if (!known.length) break;
    }
    // After the last round, Opus's walkthrough stands; if the script finds it broken, the last one that wasn't
    const final = checkPrep(out, p, { previous: prev }).findings.length ? lastGood : out;
    const clean = { ...strip(final), stops: strip(final).stops.map((s) => ({ ...s, cards: s.cards.map((c) => ({ ...c, needs_agent_fix: false, needs_human_decision: false })) })) };
    writeJson(path.join(src, 'prep.json'), clean);
    writeJson(path.join(src, 'result.json'), { agent: [], human: [], fixed: new Date().toISOString() });
    const summary = { rounds, cards: clean.stops.reduce((k, s) => k + s.cards.length, 0), stops: clean.stops.length,
      leftOver: known.length, usedLastGood: final !== out };
    writeJson(path.join(dir, 'done.json'), summary);
    return summary;
  }

  // --- go ---
  const chosen = ids.map((id) => byId.get(id)).filter((p) => p && fs.existsSync(path.join(PREP_DIR, folder(p), 'prep.json')));
  const todo = chosen.filter((p) => !fs.existsSync(path.join(FIX_DIR, folder(p), 'done.json')));
  logEvent({ type: 'run', status: 'running', note: `Fix run: ${chosen.length} passages.` });
  await notify('Fix run started', [`Fixing ${todo.length} Prep walkthroughs (${chosen.length - todo.length} already done)`,
    `${agents} agents at once`, 'Opus fixes, Sonnet checks, no flags']);

  const queue = [...todo], tries = new Map(), gaveUp = [];
  let fresh = 0, leftOver = 0;
  async function worker(n) {
    await sleep(n * STAGGER);
    while (queue.length) {
      const p = queue.shift();
      try {
        const d = await fixOne(p);
        if (d.before) continue;
        fresh++;
        if (d.leftOver) leftOver++;
        logEvent({ type: 'step', passage: p.id, step: STEP, status: 'done', model: null });
        logEvent({ type: 'note', title: `Fixed ${span(p.start, p.end)}`, lines: [`${d.rounds} round${d.rounds > 1 ? 's' : ''}, ${d.cards} cards`, `${fresh} of ${todo.length} done this run`] });
        if (fresh % SAVE_EVERY === 0) { saveTracker(); saveToGit(`Fix run: ${fresh} passages fixed (automatic backup)`); }
        if (fresh % 250 === 0) notify('Fix run', [`${fresh} of ${todo.length} passages fixed`]);
      } catch (e) {
        status(p, 'failed', null);
        const t = (tries.get(p.id) ?? 0) + 1;
        tries.set(p.id, t);
        if (t === 1) queue.push(p);
        else gaveUp.push(p);
        logEvent({ type: 'note', title: t === 1 ? 'Fix: trying a passage again at the end' : 'Fix: kept the old walkthrough',
          lines: [`${span(p.start, p.end)}: ${e.message}`], problem: true });
      }
    }
  }
  await Promise.all(Array.from({ length: Math.max(1, Math.min(agents, todo.length || 1)) }, (_, n) => worker(n)));
  saveTracker();

  // Kimi's spot check: a report only
  let report = null;
  if (spotcheck) {
    const pool = chosen.filter((p) => fs.existsSync(path.join(FIX_DIR, folder(p), 'done.json')));
    const pick = pool.sort(() => Math.random() - 0.5).slice(0, SPOTCHECK);
    const results = [];
    await Promise.all(Array.from({ length: 10 }, async () => {
      while (pick.length) {
        const p = pick.shift();
        const out = readJson(path.join(PREP_DIR, folder(p), 'prep.json'));
        const head = about(p) + '\n\n' + theText(p);
        try {
          const r = await kimi({ role: 'final', passage: p.id, step: STEP, maxTokens: 64_000, shared: [papaMd, prepMd, checkerMd],
            messages: [{ role: 'system', content: [papaMd, prepMd, checkerMd].map((x) => x.text).join('\n\n') },
              { role: 'user', content: head + '\n\n' + JSON.stringify(out, null, 2) + '\n\n' + CHECK(p) }] });
          const f = json(r.text).findings ?? [];
          results.push({ passage: span(p.start, p.end), findings: f.length, examples: f.slice(0, 3).map((x) => x.problem ?? x.question), cost: r.cost });
        } catch (e) { results.push({ passage: span(p.start, p.end), error: e.message }); }
      }
    }));
    const ok = results.filter((r) => r.findings === 0).length;
    const cost = results.reduce((k, r) => k + (r.cost ?? 0), 0);
    report = { t: new Date().toISOString(), checked: results.length, clean: ok, cost: Math.round(cost * 100) / 100, results };
    writeJson(path.join(FIX_DIR, 'fix-report.json'), report);
  }

  saveToGit('Fix run finished (automatic backup)');
  logEvent({ type: 'run', status: 'finished', note: `Fix run: ${chosen.length} passages.` });
  await notify('Fix run finished', [
    `${fresh} walkthroughs fixed this run, ${chosen.length - todo.length} were already done`,
    leftOver ? `${leftOver} needed a second fix; Opus made the final call on those` : 'Every passage came out clean',
    gaveUp.length && `Kept the old walkthrough for: ${gaveUp.map((p) => span(p.start, p.end)).join('; ')}`,
    report && `Kimi spot check: ${report.clean} of ${report.checked} with nothing found ($${report.cost})`].filter(Boolean));
  return { fresh, leftOver, gaveUp, report };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const opt = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
  const ids = [];
  for (const part of String(opt('--passages') ?? '').split(',').filter(Boolean)) {
    const [a, b] = part.split('-').map(Number);
    for (let i = a; i <= (b || a); i++) ids.push(i);
  }
  if (!ids.length) { console.error('Say which passages: --passages 1-1558'); process.exit(1); }
  runFix(ids, { agents: Number(opt('--agents') ?? 1), spotcheck: !process.argv.includes('--no-spotcheck') }).then(
    (r) => console.log(JSON.stringify({ fresh: r.fresh, leftOver: r.leftOver, gaveUp: r.gaveUp.length }, null, 1)),
    (e) => { console.error(e.message); process.exit(1); });
}
