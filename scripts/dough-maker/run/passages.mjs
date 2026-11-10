// The Passages step (README "Checking each step", models.md "Who does what"): splits each book into passages.
//   1. Opus writes the list (passages.md "Output").
//   2. Check: the script check (check-passages.mjs), then Kimi's review (checker.md), as one list of findings.
//   3. Fix: Opus fixes only the covered findings. Not-covered findings go to the tracker for the person.
//   4. Check 2 and Fix 2 the same way, then the final check. A check that finds nothing to fix ends it early.
//   5. Whatever the final check still finds goes on the tracker, and every passage entry gets its two flags.
// If Opus hits the weekly limit, Kimi writes and fixes instead (models.md "Overflow"); then Opus does the final
// check, since the final checker is never the fixer, and that check waits for the reset.
//
//   node scripts/dough-maker/run/passages.mjs --books Genesis [--fresh]
//
// Every stage is saved under .cache/passages-run/<book>/ as it finishes, so running it again picks up from the last
// saved stage; --fresh starts the books over. passages.json (the dashboard's list) and tracker.json are rebuilt from
// those files after every stage. A call that gives no answer, or one that can't be read, is tried once more; if it
// fails again the run stops and tells the person (README "When the run stops").
//
// How each call is built (models.md "Caching"): nothing that changes goes near the top, and the job is always last.
//   Opus: system [passages.md, the book's BSB text]; the message holds the rest
//   Kimi: system passages.md + checker.md; the message is the book's BSB text, the list to check, then the job
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { CACHE, PASSAGES, LIMITS, TYPES, logEvent, notify } from './events.mjs';
import { doc, fingerprints } from './docs.mjs';
import { BOOKS, bookText, verses } from './bsb.mjs';
import { checkPassages } from './check-passages.mjs';
import { cacheTrouble } from './cachewatch.mjs';
import { opus as realOpus, LimitError } from './opus.mjs';
import { kimi as realKimi } from './kimi.mjs';
import { checkLimits as realCheckLimits } from './limits.mjs';

const STEP = 'passages';
export const RUN_DIR = path.join(CACHE, 'passages-run');
export const TRACKER = path.join(CACHE, 'tracker.json');
const KIMI_MAX = 64_000;   // Kimi's thinking counts as output, so leave plenty of room for the answer

// --- the jobs: the last thing in every call ---------------------------------------------------------------------

const WRITE = (book) => `Split the book of ${book}, in the BSB text above, into passages, following passages.md.

- This list covers ${book} only, so its ids start at 1, and the whole-Bible count in passages.md doesn't apply.
- Reply with only the JSON list described in passages.md "Output". No other text.`;

const CHECK = (book) => `Check the passage list above, following checker.md. It splits the book of ${book}, in the BSB text above, into passages.

- Check it against every rule in passages.md and against the BSB text.
- This list covers ${book} only, so its ids start at 1, and the whole-Bible count in passages.md doesn't apply.
- A script already checks the rules with one right answer: every verse in exactly one passage, real verse references, unbroken ranges, the six types, every field filled in, ids in order, included parables and sermons inside their passage, and story group positions. Don't repeat those. Check the judgment calls: where passages start and stop, what stays together, length, merging and splitting, story groups, types and titles.
- Reply with only the JSON described in checker.md "Output", with "step": "passages" and "where": { "passage": id }, or null when it's about the whole list. No other text.`;

const FIX = (book) => `Above are the passage list for ${book} and the findings a checker made about it.

- Fix only these findings, following passages.md. Change nothing else, unless another rule forces a change to a nearby passage.
- If a fix splits or merges passages, renumber the ids so they start at 1 and go up by one, and update the story group positions.
- Reply with the whole corrected list, as the JSON list described in passages.md "Output". No other text.`;

// --- reading the answers -----------------------------------------------------------------------------------------

class Unreadable extends Error {}
class Pause extends Error {}

// The JSON in a reply, even with a code fence or a line of text around it
function json(text, open, close, what) {
  const a = text.indexOf(open), b = text.lastIndexOf(close);
  if (!text.trim()) throw new Unreadable(`gave an empty answer instead of ${what}`);
  try { if (a >= 0 && b > a) return JSON.parse(text.slice(a, b + 1)); } catch { /* below */ }
  throw new Unreadable(`gave an answer that isn't ${what}`);
}

function readList(text) {
  const list = json(text, '[', ']', 'a passage list');
  if (!Array.isArray(list) || !list.length) throw new Unreadable('gave an empty passage list');
  return list;
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

// --- verses and places -------------------------------------------------------------------------------------------

let index = null;
const verseAt = (ref) => (index ??= new Map(verses().map((v, i) => [v.ref, i]))).get(ref);
const book = (ref) => String(ref ?? '').replace(/\s+\d+:\d+.*$/, '');
// "Genesis 12:1–9", "Genesis 11:27–12:9"
function range(p) {
  const [c1] = p.start.slice(book(p.start).length).trim().split(':');
  const [c2, v2] = p.end.slice(book(p.end).length).trim().split(':');
  return `${p.start}–${c1 === c2 ? v2 : `${c2}:${v2}`}`;
}
const overlaps = (a, b) => verseAt(a.start) <= verseAt(b.end) && verseAt(b.start) <= verseAt(a.end);
// A finding names a passage by its id, which a later fix can change; its verses say where it is for good
function place(f, list) {
  const p = f.where?.passage != null && list.find((x) => x.id === f.where.passage);
  return p && verseAt(p.start) !== undefined && verseAt(p.end) !== undefined ? { start: p.start, end: p.end } : null;
}
const where = (at) => (at ? range(at) : 'The whole list');

// --- the run -----------------------------------------------------------------------------------------------------

export async function runPassages(books, { fresh = false, models = { opus: realOpus, kimi: realKimi }, checkLimits = realCheckLimits } = {}) {
  const passagesMd = { name: 'passages.md', text: doc('passages.md'), kind: 'doc' };
  const checkerMd = { name: 'checker.md', text: doc('checker.md'), kind: 'doc' };
  const spent = { kimi: 0, calls: 0, cache: {} };
  const problems = [];   // retries and the overflow switch, for the last message
  let opusOutUntil = null;   // set when Opus hits the weekly limit: Kimi writes and fixes until then
  let current = null;        // what's running, for a stop message: { book, stage }
  const status = (s, model) => logEvent({ type: 'step', passage: null, step: STEP, status: s, model });

  // One model call and what it reports, then the cache check (models.md "Caching" rule 8)
  async function call(model, args) {
    const r = await models[model]({ ...args, step: STEP });
    spent.calls++;
    if (r.cost) spent.kimi += r.cost;
    if (r.cache?.status) spent.cache[r.cache.status] = (spent.cache[r.cache.status] ?? 0) + 1;
    // cachewatch.mjs has already sent the alert, so the pause adds only a note on the dashboard
    if (cacheTrouble(model)) throw Object.assign(new Pause(`${model === 'opus' ? 'Opus' : 'Kimi'} missed the cache 3 calls in a row.`), { pushed: true });
    return r.text;
  }
  const askOpus = (role, bookPiece, prompt) => call('opus', { role, system: [passagesMd, bookPiece], prompt });
  const askKimi = (role, top, user, shared) => call('kimi', { role, shared, maxTokens: KIMI_MAX,
    messages: [{ role: 'system', content: top.map((p) => p.text).join('\n\n') }, { role: 'user', content: user }] });

  // README "When the run stops": a call with no answer, or one that can't be read, gets one more try
  async function twice(who, what, fn) {
    try { return await fn(); }
    catch (e) {
      if (e instanceof LimitError || e instanceof Pause) throw e;
      const why = e instanceof Unreadable ? `${who} ${e.message}` : e.message;
      problems.push(`${what}: retried once (${why})`);
      logEvent({ type: 'note', title: 'Trying again', lines: [`${what} for ${current.book}`, why, 'Trying once more'], problem: true });
      try { return await fn(); }
      catch (e2) {
        if (e2 instanceof LimitError || e2 instanceof Pause) throw e2;
        throw Object.assign(new Error(e2 instanceof Unreadable ? `${who} ${e2.message}` : e2.message), { detail: e2.detail, twice: true });
      }
    }
  }

  // Opus writes and fixes; Kimi steps in while Opus is over the weekly limit (models.md "Overflow")
  async function writeOrFix(role, what, opusJob, kimiJob, read) {
    if (opusOutUntil && Date.now() >= opusOutUntil) {
      opusOutUntil = null;
      logEvent({ type: 'run', status: 'running', note: 'Opus is back after its weekly limit reset.' });
    }
    if (!opusOutUntil) {
      try { return { by: 'opus', list: await twice('Opus', what, async () => read(await opusJob())) }; }
      catch (e) {
        if (!(e instanceof LimitError)) throw e;
        opusOutUntil = e.resetsAt ? Date.parse(e.resetsAt) : Infinity;
        const until = e.resetsAt ? `until it resets ${new Date(e.resetsAt).toLocaleString()}` : 'for the rest of this run';
        problems.push(`Opus hit the weekly limit, so Kimi took over writing and fixing ${until}`);
        logEvent({ type: 'run', status: 'overflow', note: `Opus hit the weekly limit. Kimi is writing and fixing ${until}.` });
        logEvent({ type: 'note', title: 'Kimi is covering for Opus', lines: ['Opus hit your weekly limit', `Kimi writes and fixes ${until}`,
          'Opus does the final check after the reset'], problem: true });
      }
    }
    return { by: 'kimi', list: await twice('Kimi', what, async () => read(await kimiJob())) };
  }

  async function splitBook(name) {
    const dir = path.join(RUN_DIR, name);
    if (fresh) fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });
    const text = { name, text: bookText(name), kind: 'bible' };
    const listText = (list) => JSON.stringify(list, null, 2);   // written the same way every time (rule 3)

    // Each stage is saved as it finishes; a saved stage is used as it is
    const stage = async (file, fn) => {
      const f = path.join(dir, `${file}.json`);
      if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, 'utf8'));
      current = { book: name, stage: file };
      const out = await fn();
      fs.writeFileSync(f, JSON.stringify(out, null, 2) + '\n');
      return out;
    };
    const keep = (list) => { writeJson(path.join(dir, 'list.json'), list); savePassages(); };

    const made = await stage('made', () => {
      status('making', opusOutUntil ? 'kimi' : 'opus');
      return writeOrFix('writer', 'Writing the passage list',
        () => askOpus('writer', text, WRITE(name)),
        () => askKimi('writer', [passagesMd], text.text + '\n' + WRITE(name), [passagesMd, text]), readList);
    });
    let list = made.list;
    keep(list);

    const check = (file, by, label) => stage(file, async () => {
      status('checking', 'script');
      const script = checkPassages(list, { books: [name] }).findings.map((f) => ({ ...f, by: 'script' }));
      status('checking', by);
      const found = by === 'kimi'
        ? await twice('Kimi', label, async () => readFindings(await askKimi(file === 'final' ? 'final' : 'reviewer',
          [passagesMd, checkerMd], text.text + '\n' + listText(list) + '\n\n' + CHECK(name), [passagesMd, checkerMd, text])))
        : await twice('Opus', label, async () => readFindings(await askOpus('final', text,
          checkerMd.text + '\n\n' + listText(list) + '\n\n' + CHECK(name))));
      const findings = [...script, ...found.map((f) => ({ ...f, by }))].map((f) => ({ ...f, at: place(f, list) }));
      return { by, list, findings };
    });

    const checks = [], fixedBy = [];
    let last = null;
    for (const n of [1, 2]) {
      const c = await check(`check-${n}`, 'kimi', `Check ${n}`);
      checks.push(c);
      const toFix = c.findings.filter((f) => f.covered);
      // Nothing to fix: this check is the final one, unless Kimi did a fix (the final checker is never the fixer)
      if (!toFix.length) { if (!fixedBy.includes('kimi')) last = c; break; }
      const fixed = await stage(`fix-${n}`, () => {
        status('fixing', opusOutUntil ? 'kimi' : 'opus');
        const findings = JSON.stringify({ step: STEP, findings: toFix.map(({ by, at, ...f }) => f) }, null, 2);
        return writeOrFix('fixer', `Fix ${n}`,
          () => askOpus('fixer', text, listText(list) + '\n\n' + findings + '\n\n' + FIX(name)),
          () => askKimi('fixer', [passagesMd], text.text + '\n' + listText(list) + '\n\n' + findings + '\n\n' + FIX(name), [passagesMd, text]),
          readList);
      });
      list = fixed.list;
      fixedBy.push(fixed.by);
      keep(list);
    }
    if (!last) {
      const by = fixedBy.includes('kimi') ? 'opus' : 'kimi';
      current = { book: name, stage: 'final' };
      if (by === 'opus' && opusOutUntil) throw new Pause(`The final check belongs to Opus, which is over your weekly limit${
        opusOutUntil === Infinity ? '' : ` until ${new Date(opusOutUntil).toLocaleString()}`}.`);
      last = await check('final', by, 'Final check');
      checks.push(last);
    }

    // The tracker and the flags (README "The tracker" and "Flags"). Questions come from every check; the same
    // question about the same verses is asked once.
    const agent = last.findings.filter((f) => f.covered);
    const human = [];
    for (const f of checks.flatMap((c) => c.findings.filter((x) => !x.covered))) {
      if (!human.some((h) => h.question.trim() === f.question.trim() && where(h.at) === where(f.at))) human.push(f);
    }
    const flagged = list.map((p) => ({ ...p,
      needs_agent_fix: agent.some((f) => f.at && overlaps(f.at, p)),
      needs_human_decision: human.some((f) => f.at && overlaps(f.at, p)) }));
    writeJson(path.join(dir, 'result.json'), { agent, human });
    keep(flagged);
    saveTracker();
    return { list: flagged, agent, human };
  }

  // --- go ---
  const before = (await checkLimits())?.weekly?.pct ?? null;
  const test = books.length < BOOKS.length;
  const scope = books.length === 1 ? books[0] : test ? `${books.length} books` : 'the whole Bible';
  logEvent({ type: 'run', status: 'running', note: test ? `Passages test: ${scope} only.` : 'Passages for the whole Bible.' });
  await notify(`Passages ${test ? 'test ' : ''}started`, [`Splitting ${scope} into passages`,
    'Opus writes, Kimi and a script check, Opus fixes (up to 2 times)', 'Follow it on the dashboard']);

  const done = [];
  try {
    for (const b of books) done.push({ book: b, ...(await splitBook(b)) });
  } catch (e) {
    const saved = savedSoFar();
    if (e instanceof Pause || e instanceof LimitError) {
      logEvent({ type: 'run', status: 'paused', note: e.message });
      status('failed', null);
      const lines = [e.message, e.resetsAt && `It resets ${new Date(e.resetsAt).toLocaleString()}`,
        current && `Where: ${current.book}, ${stageName(current.stage)}`, saved,
        'To pick up again, ask Claude to run Passages again. It starts from the last saved stage.'].filter(Boolean);
      if (e.pushed) logEvent({ type: 'note', title: 'Passages paused', lines, problem: true });
      else await notify('Passages paused', lines, { problem: true });
    } else {
      logEvent({ type: 'run', status: 'stopped', note: e.message });
      status('failed', null);
      await notify('Passages stopped', [e.twice ? `${e.message} It happened twice, so the run stopped.` : e.message,
        current && `Where: ${current.book}, ${stageName(current.stage)}`, e.detail && `Details: ${String(e.detail).slice(0, 200)}`, saved,
        'To pick up again, ask Claude to run Passages again. It starts from the last saved stage.'], { problem: true });
    }
    throw e;
  }

  const all = done.flatMap((d) => d.list);
  const flags = flagsFor(done);
  const types = TYPES.map((t) => [t, all.filter((p) => p.type === t).length]).filter(([, c]) => c).map(([t, c]) => `${t} ${c}`);
  const after = readLimits();
  const cache = Object.entries(spent.cache).map(([k, c]) => `${c} ${k}`).join(', ');
  logEvent({ type: 'step', passage: null, step: STEP, status: 'done', model: null, flags });
  logEvent({ type: 'run', status: 'finished', note: test ? `Passages test: ${scope} only.` : undefined });
  await notify(`Passages ${test ? 'test ' : ''}finished`, [
    `${scope}: ${all.length} passages (${types.join(', ')})`,
    `Flags: ${flags.agentFix} need an agent fix, ${flags.humanDecision} need your decision`,
    `Kimi cost: $${spent.kimi.toFixed(2)}`,
    before != null && after != null ? `Opus weekly limit: ${Math.round(before)}% used before, ${Math.round(after)}% after` : null,
    cache && `Cache: ${cache}`,
    ...problems]);
  return done;
}

const stageName = (s) => ({ made: 'writing the list', 'check-1': 'check 1', 'fix-1': 'fix 1', 'check-2': 'check 2',
  'fix-2': 'fix 2', final: 'the final check' }[s] ?? s);

// The flags for the dashboard's step event: how many items are on each list, and each one in plain words
function flagsFor(done) {
  const items = done.flatMap((d) => [
    ...d.agent.map((f) => ({ list: 'agent', where: where(f.at), problem: f.problem })),
    ...d.human.map((f) => ({ list: 'human', where: where(f.at), problem: f.question }))]);
  return { agentFix: items.filter((x) => x.list === 'agent').length, humanDecision: items.filter((x) => x.list === 'human').length, items };
}

// --- the files the dashboard and the person read -----------------------------------------------------------------

function writeJson(file, data) {
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2) + '\n');
  fs.renameSync(tmp, file);   // the dashboard never reads half a file
}
const readJson = (file) => { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; } };
const readLimits = () => readJson(LIMITS)?.weekly?.pct ?? null;

// Every book split so far, in Bible order, with ids counting on from the book before
function savePassages() {
  let id = 0;
  const all = BOOKS.flatMap((b) => (readJson(path.join(RUN_DIR, b, 'list.json')) ?? []).map((p) => ({ ...p, id: ++id })));
  writeJson(PASSAGES, all);
}

function savedSoFar() {
  const books = BOOKS.filter((b) => fs.existsSync(path.join(RUN_DIR, b, 'list.json')));
  const n = (readJson(PASSAGES) ?? []).length;
  return books.length ? `Saved: ${n} passages so far (${books.join(', ')}), and every finished stage` : 'Nothing was saved yet';
}

// README "The tracker": one file for the whole run, two lists, the same problem in many places as one group
function saveTracker() {
  const results = BOOKS.map((b) => readJson(path.join(RUN_DIR, b, 'result.json'))).filter(Boolean);
  const group = (items, key, head) => {
    const groups = new Map();
    for (const f of items) {
      const k = key(f);
      if (!groups.has(k)) groups.set(k, { ...head(f), count: 0, examples: [], places: [] });
      const g = groups.get(k);
      g.count++;
      if (g.examples.length < 3) g.examples.push(f.problem);
      g.places.push({ where: where(f.at), problem: f.problem, by: f.by });
    }
    return [...groups.values()].sort((a, b) => b.count - a.count);
  };
  const tracker = readJson(TRACKER) ?? {};
  tracker.t = new Date().toISOString();
  tracker.docs = { ...tracker.docs, ...fingerprints() };
  tracker.passages = {
    needs_agent_fix: group(results.flatMap((r) => r.agent), (f) => `${f.rule.link}|${f.rule.text}`, (f) => ({ rule: f.rule })),
    needs_human_decision: group(results.flatMap((r) => r.human), (f) => f.question.trim().toLowerCase(), (f) => ({ question: f.question })),
  };
  writeJson(TRACKER, tracker);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const i = process.argv.indexOf('--books');
  const books = i > 0 ? process.argv[i + 1].split(',').map((b) => b.trim()) : BOOKS;
  const unknown = books.filter((b) => !BOOKS.includes(b));
  if (unknown.length) { console.error(`Not a book in the BSB text: ${unknown.join(', ')}`); process.exit(1); }
  runPassages(books, { fresh: process.argv.includes('--fresh') }).then(
    (done) => console.log(done.map((d) => `${d.book}: ${d.list.length} passages, ${d.agent.length} agent fixes, ${d.human.length} questions`).join('\n')),
    (e) => { console.error(e.message); process.exit(1); });
}
