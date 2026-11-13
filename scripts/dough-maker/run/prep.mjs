// The Prep walkthrough step (README "Checking each step", models.md "Who does what"): one walkthrough per passage.
//   1. Opus writes it (prep-walkthrough.md "Output").
//   2. Check: the script check (check-prep.mjs), then Opus's review (checker.md), as one list of findings.
//   3. Fix: Opus fixes only the covered findings. Not-covered findings go to the tracker for the person.
//   4. Check 2 and Fix 2 the same way, then Kimi's final check. A check that finds nothing to fix ends it early.
//   5. Whatever the final check still finds goes on the tracker, and every card gets its two flags.
// The final checker is never the fixer: Opus fixes, so Kimi does the final check. Kimi never writes or fixes. If Opus
// hits the weekly limit, the run waits and notifies the person (models.md "When the weekly limit runs out"), checks
// every 5 minutes, and carries on by itself once Opus is available again.
//
//   node scripts/dough-maker/run/prep.mjs --passages 1            one passage (models.md "Test on passage 1")
//   node scripts/dough-maker/run/prep.mjs --passages 2-200 --agents 5
//   node scripts/dough-maker/run/prep.mjs --book Ruth [--agents 5] [--fresh]
//
// Every stage is saved under scripts/dough-maker/output/prep/<id and range>/ as it finishes, so running it again
// picks up from the last saved stage; a passage with prep.json is done and is skipped. --fresh starts the chosen
// passages over. tracker.json is rebuilt after every passage. A call that gives no answer, or one that can't be
// read, is tried once more; if it fails again, that passage is skipped and gets one more try at the end, while the rest
// keep going (README "When the run stops"). The run itself stops only for a problem with the whole run.
// A problem that passes by itself (no internet, out of credits, a busy server) doesn't stop it: it waits, tries
// again every 5 minutes, and carries on.
// With more than one agent, the first call goes alone, so it saves the docs in the cache before the rest start.
// The outputs are committed and pushed to GitHub every 50 passages, and when the run pauses, stops or finishes.
//
// How each call is built (models.md "Caching"): nothing that changes goes near the top, and the job is always last.
//   Opus: system [papa-dorin.md, prep-walkthrough.md]; the message holds the passage and the rest
//   Kimi: system papa-dorin.md + prep-walkthrough.md + checker.md; the message is the passage's details and BSB
//         text, then the walkthrough to check, then the job. Each check of a passage reuses all of it up to the
//         walkthrough.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { OUTPUT, PASSAGES, LIMITS, logEvent, notify } from './events.mjs';
import { doc, fingerprints } from './docs.mjs';
import { verses, parseRefs, passageText, span } from './bsb.mjs';
import { checkPrep } from './check-prep.mjs';
import { cacheTrouble } from './cachewatch.mjs';
import { opus as realOpus, LimitError } from './opus.mjs';
import { kimi as realKimi } from './kimi.mjs';
import { checkLimits as realCheckLimits } from './limits.mjs';
import { saveToGit } from './save.mjs';

const STEP = 'prep';
export const PREP_DIR = path.join(OUTPUT, 'prep');
export const TRACKER = path.join(OUTPUT, 'tracker.json');
const KIMI_MAX = 64_000;   // Kimi's thinking counts as output, so leave plenty of room for the answer
const STAGGER = 5_000;     // between agents starting, once the first call has saved the docs in the cache
const SAVE_EVERY = 50;     // passages between GitHub backups

// --- what goes in each call --------------------------------------------------------------------------------------

// The passage's details, written the same way every time (rule 3)
export function about(p) {
  const group = p.story_group
    ? `${p.story_group}, passage ${p.position}${/^(\d+) of \1$/.test(p.position) ? ' (the last one in the group)' : ''}`
    : 'none';
  const included = p.included.length ? p.included.map((i) => `${i.kind} ${span(i.start, i.end)}`).join('; ') : 'none';
  return [`Passage: ${span(p.start, p.end)}`, `Title: ${p.title}`, `Type: ${p.type}`, `Story group: ${group}`,
    `Included parables and sermons: ${included}`].join('\n');
}
const before = (prev) => prev
  ? `The passage right before it, for context only (not part of the lesson): ${span(prev.start, prev.end)}\n${passageText(prev.start, prev.end)}`
  : 'The passage right before it: none. This is the first passage of the Bible.\n';
export const theText = (p) => `The passage's BSB text:\n${passageText(p.start, p.end)}`;
const show = (out) => JSON.stringify(out, null, 2);   // written the same way every time (rule 3)

const WRITE = (p) => `Write Papa Dorin's Prep walkthrough for ${span(p.start, p.end)}, in the BSB text above, following prep-walkthrough.md and papa-dorin.md.

- The passage right before it is there for context only. It is not part of the lesson.
- Reply with only the JSON described in prep-walkthrough.md "Output". No other text.`;

export const CHECK = (p) => `Check the Prep walkthrough above, following checker.md. It covers ${span(p.start, p.end)}, in the BSB text above.

- Check it against every rule in prep-walkthrough.md and papa-dorin.md, and against the BSB text.
- A script already checks the rules with one right answer: the JSON shape and numbering, real verse references, the stops running through the passage in order, a stop of its own for each included parable or sermon, no more than 20 cards in a stop and at least as many choice cards as story cards, how many answers each card has and how many are right, True and False, the blanks, no commas or periods in answers, exact BSB wording inside quotation marks, dashes, what Papa Dorin calls the baker, and foods that aren't cookies. Don't repeat those. Check the judgment calls: Papa Dorin's voice, the Scripture rules, bite-sized cards, what to ask, never giving an answer away, informed guesses, long stretches, the wrong answers, the card citations, and the line that says the story isn't over.
- Reply with only the JSON described in checker.md "Output", with "step": "prep" and "where": { "stop": n, "card": n }, or { "stop": n } for a whole stop, or null when it's about the whole walkthrough. No other text.`;

const FIX = (p) => `Above are the Prep walkthrough for ${span(p.start, p.end)} and the findings a checker made about it.

- Fix only these findings, following prep-walkthrough.md and papa-dorin.md. Change nothing else, unless another rule forces a change to a nearby card.
- If a fix adds or removes cards, renumber the cards in that stop so they start at 1 and go up by one.
- Reply with the whole corrected walkthrough, as the JSON described in prep-walkthrough.md "Output". No other text.`;

// --- reading the answers -----------------------------------------------------------------------------------------

class Unreadable extends Error {}
class Pause extends Error {}

// Problems that pass by themselves, so the run waits them out (runPrep's waitOut): no internet (Kimi's fetch fails,
// or Claude Code can't reach the API), out of OpenRouter credits, too many requests, a server-side error
const WAIT = Number(process.env.DOUGH_WAIT_MS) || 5 * 60_000;   // DOUGH_WAIT_MS shortens it for tests
const EMPTY_TRIES = 4;   // more tries for an empty Kimi answer, WAIT apart, before the run stops
const SKIPS_IN_A_ROW = 5;   // passages failing one after another with none done between: something bigger is wrong
// Problems with the whole run, not one passage: every passage would fail the same way, so the run stops
const hard = (e) => /^(401|403|404):/.test(String(e.detail ?? '')) ||
  /OPENROUTER_API_KEY is missing|Couldn’t start Claude Code/.test(e.message);
export function passing(e) {
  if (e instanceof Unreadable) return false;
  const d = String(e.detail ?? '');
  if (/^(402|408|429|5\d\d):/.test(d)) return true;
  if (/^Couldn’t reach OpenRouter/.test(e.message)) return true;
  return /can't reach the API|ENOTFOUND|EAI_AGAIN|ECONNRESET|ECONNREFUSED|ETIMEDOUT|ENETUNREACH|fetch failed|socket hang up|connection error|network|overloaded|rate.?limit|too many requests|\b(429|500|502|503|504|529)\b/i.test(d);
}

function json(text, open, close, what) {
  const a = text.indexOf(open), b = text.lastIndexOf(close);
  if (!text.trim()) throw Object.assign(new Unreadable(`gave an empty answer instead of ${what}`), { empty: true });
  try { if (a >= 0 && b > a) return JSON.parse(text.slice(a, b + 1)); } catch { /* below */ }
  throw new Unreadable(`gave an answer that isn't ${what}`);
}
function readPrep(text) {
  const out = json(text, '{', '}', 'a walkthrough');
  if (!Array.isArray(out?.stops) || !out.stops.length) throw new Unreadable('gave a walkthrough with no stops');
  return out;
}
function readFindings(text) {
  const out = json(text, '{', '}', 'a list of findings');
  if (!Array.isArray(out?.findings)) throw new Unreadable('gave an answer with no list of findings');
  for (const f of out.findings) {
    const ok = f && typeof f.covered === 'boolean' && typeof f.problem === 'string' &&
      (f.covered ? typeof f.rule?.text === 'string' : typeof f.question === 'string');
    if (!ok) throw new Unreadable('gave a finding without its problem, rule or question');
  }
  return out.findings;
}

// --- places ------------------------------------------------------------------------------------------------------

// A finding names a card by stop and card number, which a later fix can change; the card's verses say where it is
// for good, so a question from check 1 still lands on the right card after the fixes
function place(f, out) {
  const w = f.where ?? null;
  const stop = w?.stop != null ? out.stops?.find((s) => s?.stop === w.stop) : null;
  const card = stop && w?.card != null ? stop.cards?.find((c) => c?.card === w.card) : null;
  return { stop: w?.stop ?? null, card: w?.card ?? null, verses: (card ?? stop)?.verses ?? null };
}
const where = (p, at) => [span(p.start, p.end), at?.stop != null && `stop ${at.stop}`, at?.card != null && `card ${at.card}`]
  .filter(Boolean).join(', ');
function overlaps(a, b) {
  const x = parseRefs(a), y = parseRefs(b);
  return !!x && !!y && x.some(([s, e]) => y.some(([s2, e2]) => s <= e2 && s2 <= e));
}
// Does a finding point at this card? The final check's findings by number (same walkthrough); earlier ones by verses
function hits(f, stop, card, exact) {
  const at = f.at;
  if (!at || at.stop == null) return true;   // about the whole walkthrough
  if (exact) return at.stop === stop.stop && (at.card == null || at.card === card.card);
  return at.verses ? overlaps(at.verses, card.verses) : at.stop === stop.stop && (at.card == null || at.card === card.card);
}

// --- the run -----------------------------------------------------------------------------------------------------

export async function runPrep(ids, { fresh = false, agents = 1, models = { opus: realOpus, kimi: realKimi }, checkLimits = realCheckLimits } = {}) {
  const papaMd = { name: 'papa-dorin.md', text: doc('papa-dorin.md'), kind: 'doc' };
  const prepMd = { name: 'prep-walkthrough.md', text: doc('prep-walkthrough.md'), kind: 'doc' };
  const checkerMd = { name: 'checker.md', text: doc('checker.md'), kind: 'doc' };
  const list = readJson(PASSAGES);
  if (!list?.length) throw new Error('There is no passage list yet.');
  const byId = new Map(list.map((p) => [p.id, p]));
  const spent = { kimi: 0, calls: 0, cache: {} };
  const problems = [];
  const running = new Map();   // passage id -> stage, for a stop message
  let warmed = null, warm = new Promise((res) => { warmed = res; });
  const status = (p, s, model) => logEvent({ type: 'step', passage: p.id, step: STEP, status: s, model });

  async function call(model, args) {
    const r = await models[model]({ ...args, step: STEP });
    warmed();
    spent.calls++;
    if (r.cost) spent.kimi += r.cost;
    if (r.cache?.status) spent.cache[r.cache.status] = (spent.cache[r.cache.status] ?? 0) + 1;
    if (cacheTrouble(model)) throw Object.assign(new Pause(`${model === 'opus' ? 'Opus' : 'Kimi'} missed the cache 3 calls in a row.`), { pushed: true });
    return r.text;
  }

  // A problem that passes by itself (the internet is down, OpenRouter is out of credits, a server is busy) never
  // stops the run: every agent that meets it waits, tries again every 5 minutes, and carries on when it works.
  // One note when the waiting starts and one when it's over. Anything else is tried once more, then stops the run.
  let down = null;
  async function waitOut(e, p, what) {
    if (!down) {
      down = { since: Date.now() };
      logEvent({ type: 'run', status: 'waiting', note: e.message });
      await notify('Prep is waiting', [e.message, `Where: ${span(p.start, p.end)}, ${what}`,
        'Nothing is lost. It tries again every 5 minutes and carries on by itself.',
        e.detail && `Details: ${String(e.detail).slice(0, 200)}`], { problem: true });
    }
    await new Promise((res) => setTimeout(res, WAIT));
  }
  function backUp() {
    if (!down) return;
    const mins = Math.max(1, Math.round((Date.now() - down.since) / 60_000));
    down = null;
    logEvent({ type: 'run', status: 'running', note: `Back after waiting ${mins} min.` });
    notify('Prep is going again', [`It waited ${mins} min and carried on by itself`]);
  }

  // Over the weekly limit, every agent waits here; one check every 5 minutes (a one-word Haiku call) sees when Opus
  // is available again, after the weekly reset or when the owner uses a free reset, and they all carry on.
  let opusWait = null;
  function opusBack(e) {
    opusWait ??= (async () => {
      const since = Date.now();
      logEvent({ type: 'run', status: 'waiting', note: 'Opus hit the weekly limit. Waiting for it to reset.' });
      await notify('Prep is waiting for Opus', ['Opus hit your weekly limit',
        e.resetsAt && `It resets ${new Date(e.resetsAt).toLocaleString()}`,
        'If you use a free reset, the run sees it within 5 minutes and carries on by itself. Nothing is lost.'].filter(Boolean),
        { problem: true });
      for (;;) {
        await new Promise((res) => setTimeout(res, WAIT));
        const w = (await checkLimits())?.weekly;
        if (w?.status && w.status !== 'rejected') break;
      }
      const mins = Math.round((Date.now() - since) / 60_000);
      logEvent({ type: 'run', status: 'running', note: `Opus is back after ${mins} min.` });
      notify('Prep is going again', [`Opus is available again after ${mins} min`]);
      opusWait = null;
    })();
    return opusWait;
  }

  // Kimi's empty answers come from its end (the answer is cut off, and OpenRouter charges nothing), so an empty
  // Kimi answer is tried again every 5 minutes, up to 4 more times; the 4th one in a row stops the run.
  async function twice(p, who, what, fn) {
    let tried = false, empties = 0;
    for (;;) {
      try { const r = await fn(); backUp(); return r; }
      catch (e) {
        if (e instanceof LimitError) { await opusBack(e); continue; }
        if (e instanceof Pause) throw e;
        if (passing(e)) { await waitOut(e, p, what); continue; }
        const why = e instanceof Unreadable ? `${who} ${e.message}` : e.message;
        if (who === 'Kimi' && e.empty) {
          if (empties === EMPTY_TRIES) throw Object.assign(new Error(`${why}, ${EMPTY_TRIES + 1} times in a row (${EMPTY_TRIES} more tries, 5 minutes apart), so the run stopped.`), { stopRun: true });
          empties++;
          problems.push(`${what} for ${span(p.start, p.end)}: ${why}, tried again after 5 minutes (${empties} of ${EMPTY_TRIES})`);
          logEvent({ type: 'note', title: 'Trying again in 5 minutes', lines: [`${what} for ${span(p.start, p.end)}`, why,
            `Try ${empties} of ${EMPTY_TRIES}. The other passages keep going.`], problem: true });
          await new Promise((res) => setTimeout(res, WAIT));
          continue;
        }
        if (tried) throw Object.assign(new Error(why), { detail: e.detail, twice: true });
        tried = true;
        problems.push(`${what} for ${span(p.start, p.end)}: retried once (${why})`);
        logEvent({ type: 'note', title: 'Trying again', lines: [`${what} for ${span(p.start, p.end)}`, why, 'Trying once more'], problem: true });
      }
    }
  }

  // Opus writes and fixes. Over the weekly limit, LimitError goes up and the run pauses (models.md).
  const writeOrFix = async (p, what, opusJob) => ({ by: 'opus', out: await twice(p, 'Opus', what, async () => readPrep(await opusJob())) });

  async function makePrep(p) {
    const dir = path.join(PREP_DIR, folder(p));
    if (fresh) fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });
    const done = readJson(path.join(dir, 'prep.json')), result = readJson(path.join(dir, 'result.json'));
    if (done && result) return { prep: done, ...result, before: true };
    const prev = byId.get(p.id - 1) ?? null;
    const head = about(p) + '\n\n' + theText(p);                       // what every check of this passage shares
    const writerTop = about(p) + '\n\n' + before(prev) + '\n' + theText(p);   // the writer also gets the passage before

    const stage = async (file, fn) => {
      const f = path.join(dir, `${file}.json`);
      if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, 'utf8'));
      running.set(p.id, file);
      const out = await fn();
      fs.writeFileSync(f, JSON.stringify(out, null, 2) + '\n');
      return out;
    };
    const askOpus = (role, prompt) => call('opus', { role, passage: p.id, system: [papaMd, prepMd], prompt });
    const askKimi = (role, top, user, shared) => call('kimi', { role, passage: p.id, shared, maxTokens: KIMI_MAX,
      messages: [{ role: 'system', content: top.map((x) => x.text).join('\n\n') }, { role: 'user', content: user }] });
    const passagePiece = { name: span(p.start, p.end), text: head, kind: 'bible' };

    const made = await stage('made', () => {
      status(p, 'making', 'opus');
      return writeOrFix(p, 'Writing Prep', () => askOpus('writer', writerTop + '\n\n' + WRITE(p)));
    });
    let out = made.out;

    const check = (file, by, label) => stage(file, async () => {
      status(p, 'checking', 'script');
      const script = checkPrep(out, p, { previous: prev }).findings.map((f) => ({ ...f, by: 'script' }));
      status(p, 'checking', by);
      const found = by === 'kimi'
        ? await twice(p, 'Kimi', label, async () => readFindings(await askKimi(file === 'final' ? 'final' : 'reviewer',
          [papaMd, prepMd, checkerMd], head + '\n\n' + show(out) + '\n\n' + CHECK(p), [papaMd, prepMd, checkerMd, passagePiece])))
        : await twice(p, 'Opus', label, async () => readFindings(await askOpus(file === 'final' ? 'final' : 'reviewer',
          checkerMd.text + '\n\n' + head + '\n\n' + show(out) + '\n\n' + CHECK(p))));
      const findings = [...script, ...found.map((f) => ({ ...f, by }))].map((f) => ({ ...f, at: place(f, out) }));
      return { by, out, findings };
    });

    const checks = [], fixedBy = [];
    let last = null;
    for (const n of [1, 2]) {
      // Opus reviews, so checks 1 and 2 cost nothing
      const c = await check(`check-${n}`, 'opus', `Check ${n}`);
      checks.push(c);
      const toFix = c.findings.filter((f) => f.covered);
      // Nothing to fix: this check is the final one, unless its checker did a fix (the final checker is never the fixer)
      if (!toFix.length) { if (!fixedBy.includes(c.by)) last = c; break; }
      const fixed = await stage(`fix-${n}`, () => {
        status(p, 'fixing', 'opus');
        const findings = JSON.stringify({ step: STEP, findings: toFix.map(({ by, at, ...f }) => f) }, null, 2);
        return writeOrFix(p, `Fix ${n}`, () => askOpus('fixer', head + '\n\n' + show(out) + '\n\n' + findings + '\n\n' + FIX(p)));
      });
      out = fixed.out;
      fixedBy.push(fixed.by);
    }
    if (!last) {
      running.set(p.id, 'final');
      last = await check('final', 'kimi', 'Final check');
      checks.push(last);
    }

    // The tracker and the flags (README "The tracker" and "Flags"). Questions come from every check; the same
    // question about the same card is asked once.
    const agent = last.findings.filter((f) => f.covered);
    const human = [];
    for (const f of checks.flatMap((c) => c.findings.filter((x) => !x.covered))) {
      if (!human.some((h) => h.question.trim() === f.question.trim() && where(p, h.at) === where(p, f.at))) human.push(f);
    }
    const prep = { ...out, stops: out.stops.map((s) => ({ ...s, cards: (s.cards ?? []).map((c) => ({ ...c,
      needs_agent_fix: agent.some((f) => hits(f, s, c, true)),
      needs_human_decision: human.some((f) => hits(f, s, c, false)) })) })) };
    writeJson(path.join(dir, 'result.json'), { agent, human });
    writeJson(path.join(dir, 'prep.json'), prep);
    saveTracker();
    running.delete(p.id);
    return { prep, agent, human };
  }

  // --- go ---
  const chosen = ids.map((id) => byId.get(id)).filter(Boolean);
  const todo = chosen.filter((p) => fresh || !fs.existsSync(path.join(PREP_DIR, folder(p), 'prep.json')));
  const weekBefore = (await checkLimits())?.weekly?.pct ?? null;
  const scope = chosen.length === 1 ? span(chosen[0].start, chosen[0].end) : `${chosen.length} passages`;
  logEvent({ type: 'run', status: 'running', note: `Prep: ${scope}.` });
  await notify('Prep started', [`Writing Prep for ${scope}`, agents > 1 ? `${agents} agents at once` : 'One agent',
    'Opus writes, checks and fixes (up to 2 times), Kimi does the final check', 'Follow it on the dashboard']);

  const done = [];
  let failure = null, skippedInARow = 0;
  const skipped = new Map();   // passage id -> times it failed
  const queue = [...chosen];
  async function worker(n) {
    if (n > 0) { await warm; await new Promise((res) => setTimeout(res, n * STAGGER)); }
    while (!failure && queue.length) {
      const p = queue.shift();
      try {
        const d = { passage: p, ...(await makePrep(p)) };
        if (d.before) { done.push(d); warmed(); continue; }
        done.push(d);
        const f = flagsFor([d]);
        logEvent({ type: 'step', passage: p.id, step: STEP, status: 'done', model: null, flags: f });
        logEvent({ type: 'note', title: `Prep is written for ${span(p.start, p.end)}`, lines: [
          `${d.prep.stops.length} stops, ${d.prep.stops.reduce((k, s) => k + s.cards.length, 0)} cards`,
          `Flags: ${f.agentFix} need an agent fix, ${f.humanDecision} need your decision`,
          `${done.filter((x) => !x.before).length} of ${todo.length} passages done this run`] });
        const fresh = done.filter((x) => !x.before).length;
        if (fresh % SAVE_EVERY === 0) saveToGit(`Prep: ${fresh} passages done this run (automatic backup)`);
        skippedInARow = 0;
      } catch (e) {
        const stage = running.get(p.id);
        running.delete(p.id);
        warmed();
        // A problem with the whole run (the cache, a broken key, Kimi's empty answers 5 times running) stops it.
        // A problem with one passage skips that passage: the rest keep going, and it gets one more try at the end.
        if (e instanceof Pause || e instanceof LimitError || e.stopRun || hard(e) || ++skippedInARow >= SKIPS_IN_A_ROW) {
          if (skippedInARow >= SKIPS_IN_A_ROW) e.message = `${SKIPS_IN_A_ROW} passages in a row failed, so something bigger is wrong. The last one: ${e.message}`;
          failure ??= { e, p, stage };
          continue;
        }
        status(p, 'failed', null);
        const tries = (skipped.get(p.id) ?? 0) + 1;
        skipped.set(p.id, tries);
        if (tries === 1) queue.push(p);
        await notify(tries === 1 ? 'Skipped a passage for now' : 'Gave up on a passage', [
          e.twice ? `${e.message} It happened twice.` : e.message, `Where: ${span(p.start, p.end)}, ${stageName(stage)}`,
          e.detail && `Details: ${String(e.detail).slice(0, 200)}`,
          tries === 1 ? 'The other passages keep going. This one gets one more try at the end.'
            : 'It failed on its second try too. The other passages keep going; it is listed when the run finishes.'],
        { problem: true });
      }
    }
  }
  await Promise.all(Array.from({ length: Math.max(1, Math.min(agents, chosen.length)) }, (_, n) => worker(n)));

  if (failure) {
    const { e, p, stage } = failure;
    const saved = `Saved: Prep for ${done.length} passages, and every finished stage`;
    const at = `Where: ${span(p.start, p.end)}, ${stageName(stage)}`;
    saveToGit(`Prep: ${done.filter((x) => !x.before).length} passages done before the run ${e instanceof Pause || e instanceof LimitError ? 'paused' : 'stopped'} (automatic backup)`);
    logEvent({ type: 'run', status: e instanceof Pause || e instanceof LimitError ? 'paused' : 'stopped', note: e.message });
    status(p, 'failed', null);
    const again = 'To pick up again, ask Claude to run Prep again. It starts from the last saved stage.';
    if (e instanceof Pause || e instanceof LimitError) {
      const lines = [e.message, e.resetsAt && `It resets ${new Date(e.resetsAt).toLocaleString()}`, at, saved, again].filter(Boolean);
      if (e.pushed) logEvent({ type: 'note', title: 'Prep paused', lines, problem: true });
      else await notify('Prep paused', lines, { problem: true });
    } else {
      await notify('Prep stopped', [e.twice ? `${e.message} It happened twice, so the run stopped.` : e.message, at,
        e.detail && `Details: ${String(e.detail).slice(0, 200)}`, saved, again], { problem: true });
    }
    throw e;
  }

  const gaveUp = chosen.filter((p) => skipped.get(p.id) >= 2);
  saveToGit(`Prep: ${scope} finished (automatic backup)`);
  const flags = flagsFor(done);
  const weekAfter = readJson(LIMITS)?.weekly?.pct ?? null;
  const cache = Object.entries(spent.cache).map(([k, c]) => `${c} ${k}`).join(', ');
  const cards = done.reduce((k, d) => k + d.prep.stops.reduce((m, s) => m + s.cards.length, 0), 0);
  logEvent({ type: 'run', status: 'finished', note: `Prep: ${scope}.` });
  await notify('Prep finished', [
    `${scope}: ${done.length} walkthroughs, ${cards} cards`,
    `Flags: ${flags.agentFix} need an agent fix, ${flags.humanDecision} need your decision`,
    `Kimi cost: $${spent.kimi.toFixed(2)}`,
    weekBefore != null && weekAfter != null ? `Opus weekly limit: ${Math.round(weekBefore)}% used before, ${Math.round(weekAfter)}% after` : null,
    cache && `Cache: ${cache}`,
    gaveUp.length && `Still not done after two tries: ${gaveUp.map((p) => span(p.start, p.end)).join('; ')}. Ask Claude to run Prep again for them.`,
    ...problems].filter(Boolean));
  return done;
}

const stageName = (s) => ({ made: 'writing Prep', 'check-1': 'check 1', 'fix-1': 'fix 1', 'check-2': 'check 2',
  'fix-2': 'fix 2', final: 'the final check' }[s] ?? 'starting');

// "0001 Genesis 1.1-2.3": the id for order, the verses so a changed passage list never mixes up walkthroughs
export const folder = (p) => `${String(p.id).padStart(4, '0')} ${span(p.start, p.end).replace(/:/g, '.')}`;

function flagsFor(done) {
  const items = done.flatMap((d) => [
    ...d.agent.map((f) => ({ list: 'agent', where: where(d.passage, f.at), problem: f.problem })),
    ...d.human.map((f) => ({ list: 'human', where: where(d.passage, f.at), problem: f.question }))]);
  return { agentFix: items.filter((x) => x.list === 'agent').length, humanDecision: items.filter((x) => x.list === 'human').length, items };
}

// --- the files the dashboard and the person read -----------------------------------------------------------------

function writeJson(file, data) {
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2) + '\n');
  fs.renameSync(tmp, file);
}
const readJson = (file) => { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; } };

// README "The tracker": one file for the whole run; Prep's two lists sit next to the Passages ones
export function saveTracker() {
  const list = readJson(PASSAGES) ?? [];
  const results = list.map((p) => ({ p, r: readJson(path.join(PREP_DIR, folder(p), 'result.json')) })).filter((x) => x.r);
  const group = (items, key, head) => {
    const groups = new Map();
    for (const { p, f } of items) {
      const k = key(f);
      if (!groups.has(k)) groups.set(k, { ...head(f), count: 0, examples: [], places: [] });
      const g = groups.get(k);
      g.count++;
      if (g.examples.length < 3) g.examples.push(f.problem);
      g.places.push({ passage: p.id, where: where(p, f.at), problem: f.problem, by: f.by });
    }
    return [...groups.values()].sort((a, b) => b.count - a.count);
  };
  const tracker = readJson(TRACKER) ?? {};
  tracker.t = new Date().toISOString();
  tracker.docs = { ...tracker.docs, ...fingerprints() };
  tracker.prep = {
    needs_agent_fix: group(results.flatMap(({ p, r }) => r.agent.map((f) => ({ p, f }))), (f) => `${f.rule.link}|${f.rule.text}`, (f) => ({ rule: f.rule })),
    needs_human_decision: group(results.flatMap(({ p, r }) => r.human.map((f) => ({ p, f }))), (f) => f.question.trim().toLowerCase(), (f) => ({ question: f.question })),
  };
  writeJson(TRACKER, tracker);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const opt = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
  const list = readJson(PASSAGES) ?? [];
  let ids = [];
  if (opt('--passages')) {
    for (const part of opt('--passages').split(',')) {
      const [a, b] = part.split('-').map(Number);
      for (let i = a; i <= (b || a); i++) ids.push(i);
    }
  } else if (opt('--book')) ids = list.filter((p) => verses().find((v) => v.ref === p.start)?.book === opt('--book')).map((p) => p.id);
  const unknown = ids.filter((id) => !list.some((p) => p.id === id));
  if (!ids.length || unknown.length) {
    console.error(ids.length ? `Not a passage id: ${unknown.join(', ')}` : 'Say which passages: --passages 1, --passages 2-50 or --book Ruth');
    process.exit(1);
  }
  runPrep(ids, { fresh: process.argv.includes('--fresh'), agents: Number(opt('--agents') ?? 1) }).then(
    (done) => console.log(done.map((d) => `${span(d.passage.start, d.passage.end)}: ${d.prep.stops.length} stops, ${d.agent.length} agent fixes, ${d.human.length} questions`).join('\n')),
    (e) => { console.error(e.message); process.exit(1); });
}
