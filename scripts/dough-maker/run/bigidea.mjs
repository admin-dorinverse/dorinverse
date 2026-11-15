// The Big Idea (big-idea.md) for every passage, as the owner decided on 2026-11-15 (models.md):
//   1. Sonnet writes it (normal speed, OpenRouter, Anthropic only) in Papa Dorin's voice, from the verses and the
//      Prep cards.
//   2. The script checks every rule it can count or look up: 2 to 4 paragraphs (about 3), 3 to 6 sentences in each
//      (the writer is told 3 to 4),
//      no dashes, every quote is the BSB's exact words, every reference is real.
//   3. GPT-6.1 Terra checks that it is true to the passage and says what the passage teaches and why it matters to
//      the baker, without walking through the events again.
//   4. Sonnet fixes what was found, up to two times, each fix checked again; then a final fix. The script checks
//      the final fix, and anything countable still broken gets one last fix for just that. No flags.
// Saved under output/bigidea/<id and range>/ as it goes (big-idea.json is the finished file), so running it again
// picks up where it left off. The first passage goes alone so the rules are in the cache before the rest start.
//
//   node scripts/dough-maker/run/bigidea.mjs --passages 1-1558 [--agents 20]
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { OUTPUT, PASSAGES, logEvent, notify } from './events.mjs';
import { doc } from './docs.mjs';
import { passageText, span, verses, parseRefs } from './bsb.mjs';
import { saveToGit } from './save.mjs';
import { PREP_DIR, folder, passing } from './prep.mjs';
import { chat, SONNET_OR } from './openrouter.mjs';
import { sentences } from './answers.mjs';
import { material } from './burnt.mjs';

const STEP = 'big_idea';
export const BIGIDEA_DIR = path.join(OUTPUT, 'bigidea');
const WAIT = Number(process.env.DOUGH_WAIT_MS) || 5 * 60_000;
const SONNET = { ...SONNET_OR, reasoning: { effort: 'medium' }, maxTokens: 24000 };
const TERRA = { model: 'openai/gpt-6.1-terra', only: ['openai'], name: 'gpt-6.1-terra', maxTokens: 16000 };

const readJson = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };
function writeJson(f, d) { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f + '.tmp', JSON.stringify(d, null, 2) + '\n'); fs.renameSync(f + '.tmp', f); }
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
function json(text) {
  const a = String(text ?? '').indexOf('{'), b = String(text ?? '').lastIndexOf('}');
  try { if (a >= 0 && b > a) return JSON.parse(text.slice(a, b + 1)); } catch { /* below */ }
  return null;
}
const norm = (s) => String(s ?? '').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim().toLowerCase();
const unquoted = (t) => String(t).replace(/“[^”]*”|"[^"]*"/g, ' ');
const wordsOf = (s) => norm(s).match(/[a-z']+/g) ?? [];

// --- prompts -------------------------------------------------------------------------------------------------------
export const SYSTEM = () => [doc('papa-dorin.md'), doc('big-idea.md')].join('\n\n');
export const WRITE = (m) => `${m.head}

What the Prep walkthrough taught (each card with its verses):
${m.prepText}

Write The Big Idea for ${span(m.p.start, m.p.end)}, following big-idea.md and papa-dorin.md.
- About 3 short paragraphs. Each paragraph has 3 or 4 sentences. Count them before you reply.
- The lesson, not the story: say what the passage teaches and why it matters to the baker. Don't walk through the events again, since the walkthrough already did that. Name only the moments the lesson needs.
- No em dashes or en dashes.
- Words in quotation marks are the BSB's exact words.
- Reply with only the JSON described in big-idea.md "Output". No other text.`;

const FIX = (m, paragraphs, found) => `${m.head}

What the Prep walkthrough taught (each card with its verses):
${m.prepText}

The Big Idea so far:
${JSON.stringify({ paragraphs }, null, 2)}

Problems found:
${JSON.stringify(found.map(({ paragraph, problem }) => ({ paragraph, problem })), null, 2)}

Rewrite The Big Idea so every problem is gone, following big-idea.md and papa-dorin.md. Keep about 3 paragraphs. Each paragraph has 3 or 4 sentences. Count them before you reply. Change only what the problems need.
Reply with only JSON: {"paragraphs": ["...", "..."]}.`;

const SHORT_OK = 'Naming moments in the passage\'s order is fine (a short psalm is often taught that way), as long as it teaches the lesson and doesn\'t just walk through the events again.';
const TERRA_SYSTEM ='You check short summaries of Bible passages against the passage itself (Berean Standard Bible).';
const CHECK = (m, paragraphs) => `${m.head}

Below is The Big Idea for this passage: the last stop of a Bible lesson, in a friendly teacher's voice, after a walkthrough that already told the story. Check two things:
1. Is it true to the passage? Nothing it says is false, changed, or contradicted by the passage. It may bring in context the passage needs, and its own friendly asides and jokes are fine as long as they don't misstate the Bible.
2. Does it say what the passage teaches and why it matters to the reader, without walking through the events again?
${SHORT_OK}

${paragraphs.map((x, i) => `Paragraph ${i + 1}: ${x}`).join('\n\n')}

Reply with only JSON: {"findings": [{"paragraph": n, "problem": "what is wrong"}]}. All fine: {"findings": []}.`;
const RECHECK = (m, paragraphs, had) => `${m.head}

Below is The Big Idea for this passage, after a fix. It had these problems:
${had.map((f) => `- Paragraph ${f.paragraph ?? '?'}: ${f.problem}`).join('\n')}

${paragraphs.map((x, i) => `Paragraph ${i + 1}: ${x}`).join('\n\n')}

Check only whether those problems are now fixed. Don't report anything else.
${SHORT_OK}
Reply with only JSON: {"findings": [{"paragraph": n, "problem": "the problem that is still there"}]}. All fixed: {"findings": []}.`;

// --- the script check ----------------------------------------------------------------------------------------------
const MAX_SENTENCES = 6;
let bible = null, flat = null;
const bibleFlat = () => (flat ??= ' ' + wordsOf(bibleText()).join(' ') + ' ');   // words only, for 3-word runs
const bibleText = () => (bible ??= norm(verses().map((v) => v.text).join(' ')));
export function scriptCheck(m, out) {
  const found = [], say = (paragraph, problem) => found.push({ paragraph, kind: 'rule', problem });
  const ps = Array.isArray(out?.paragraphs) ? out.paragraphs : [];
  if (ps.length < 2 || ps.length > 4) say(null, `There are ${ps.length} paragraphs. There are about 3.`);
  const here = ' ' + passageText(m.p.start, m.p.end).split('\n').map((v) => wordsOf(v.replace(/^.*? \d+:\d+ /, '')).join(' ')).join(' ') + ' ';
  ps.forEach((p, i) => {
    const n = i + 1, t = String(p ?? '');
    if (typeof p !== 'string' || !t.trim()) { say(n, 'It is empty.'); return; }
    const s = sentences(t);
    // The doc and the writer say 3 to 4; the check lets up to 6 through, as the owner decided on 2026-11-15
    // (Sonnet's natural paragraph is about 5, and 5 or 6 short sentences read fine). The writer is never told this.
    if (s < 3 || s > MAX_SENTENCES) say(n, `It has ${s} sentences. Each paragraph is 3 to 4 sentences.`);
    if (/[–—]/.test(unquoted(t))) say(n, 'It uses a dash. No em dashes or en dashes.');
    for (const q of t.match(/“[^”]+”|"[^"]+"/g) ?? []) {
      const inner = norm(q.slice(1, -1));
      // "…" marks skipped words, so each side is checked on its own. Only a quote that comes from the Bible counts:
      // it shares 4 words in a row with the passage or 5 with the whole Bible ("The LORD is my shepherd; I shall
      // never want" does; Papa Dorin's own "call me if you need anything" doesn't, though every word is a Bible word)
      const pieces = inner.split(/\s*(?:…|\.\.\.|[.,;:!?])\s*/).filter((x) => x.split(' ').length >= 3);
      const w = wordsOf(inner);
      const shares = (n, text) => w.some((_, k) => k + n <= w.length && text.includes(` ${w.slice(k, k + n).join(' ')} `));
      const biblical = shares(4, here) || shares(5, bibleFlat());
      if (biblical && pieces.some((x) => !bibleText().includes(x))) say(n, `The quote ${q} isn't the BSB's exact words.`);
    }
    for (const r of t.match(/\b(?:[1-3] )?[A-Z][a-z]+(?: of [A-Z][a-z]+)? \d+:\d+(?:-\d+(?::\d+)?)?/g) ?? []) {
      if (!parseRefs(r)) say(n, `${r} is not a real BSB reference.`);
    }
  });
  return found;
}

// --- the run -------------------------------------------------------------------------------------------------------
export async function runBigIdea(ids, { agents = 20, maxCost = Infinity, maxPerPassage = Infinity } = {}) {
  const list = readJson(PASSAGES);
  const byId = new Map(list.map((p) => [p.id, p]));
  const dir = (p) => path.join(BIGIDEA_DIR, folder(p));
  const system = SYSTEM();
  const chosen = ids.map((id) => byId.get(id)).filter((p) => p && fs.existsSync(path.join(PREP_DIR, folder(p), 'prep.json')));
  const todo = chosen.filter((p) => !fs.existsSync(path.join(dir(p), 'done.json')));
  logEvent({ type: 'run', status: 'running', note: `The Big Idea: ${chosen.length} passages.` });
  await notify('The Big Idea started', [`${todo.length} passages (${chosen.length - todo.length} already done)`, 'Sonnet writes, the script and Terra check, no flags']);

  let down = null;
  async function ask(fn, read) {
    let tried = false, cost = 0;   // a reply that can't be read is asked again, and both calls are paid for
    for (;;) {
      try {
        const r = await fn();
        cost += r.cost ?? 0;
        if (down) { notify('The Big Idea going again', [`After ${Math.round((Date.now() - down) / 60000)} min`]); down = null; }
        const v = read(r.text);
        if (v || tried) return { v, cost };
        tried = true;
      } catch (e) {
        if (!passing(e)) throw e;
        if (!down) { down = Date.now(); await notify('The Big Idea waiting', [e.message, 'It tries again every 5 minutes and carries on by itself.'], { problem: true }); }
        await sleep(WAIT);
      }
    }
  }
  const stage = async (file, fn) => { const got = readJson(file); if (got) return got; const out = await fn(); writeJson(file, out); return out; };
  const findings = (t) => Array.isArray(json(t)?.findings) ? json(t).findings : null;
  const paras = (t) => Array.isArray(json(t)?.paragraphs) ? json(t).paragraphs : null;

  async function one(p) {
    const m = material(p), d = dir(p);
    const written = await stage(path.join(d, 'written.json'), async () => {
      const r = await ask(() => chat({ ...SONNET, system, user: WRITE(m), passage: p.id, step: STEP, role: 'writer' }), paras);
      return { paragraphs: r.v ?? [], cost: r.cost };
    });
    let paragraphs = written.paragraphs ?? [];
    const check = (file, before = null) => stage(path.join(d, file), async () => {
      const script = scriptCheck(m, { paragraphs });
      const had = before?.filter((f) => f.kind === 'terra') ?? null;
      const r = !had || had.length
        ? await ask(() => chat({ ...TERRA, system: TERRA_SYSTEM, user: had ? RECHECK(m, paragraphs, had) : CHECK(m, paragraphs), passage: p.id, step: STEP, role: 'reviewer' }), findings)
        : { v: [], cost: 0 };
      return { script, terra: (r.v ?? []).map((f) => ({ ...f, kind: 'terra' })), cost: r.cost };
    });
    const c1 = await check('check-1.json');
    let found = [...c1.script, ...c1.terra];
    const first = found.length;
    for (let n = 1; n <= 3 && found.length; n++) {
      const fix = await stage(path.join(d, `fix-${n}.json`), async () => {
        const r = await ask(() => chat({ ...SONNET, system, user: FIX(m, paragraphs, found), passage: p.id, step: STEP, role: 'fixer' }), paras);
        return { paragraphs: r.v ?? paragraphs, cost: r.cost, ...(n === 3 && { problems: found }) };
      });
      if (Array.isArray(fix.paragraphs) && fix.paragraphs.length) paragraphs = fix.paragraphs;
      if (n === 3) {
        // The free check runs once more on the final fix; a countable rule still broken (like a 5-sentence
        // paragraph) gets one last fix for just that, and that version stands
        const after = await stage(path.join(d, 'check-final.json'), async () => ({ script: scriptCheck(m, { paragraphs }), cost: 0 }));
        if (after.script.length) {
          const last = await stage(path.join(d, 'fix-rules.json'), async () => {
            const r = await ask(() => chat({ ...SONNET, system, user: FIX(m, paragraphs, after.script), passage: p.id, step: STEP, role: 'fixer' }), paras);
            return { paragraphs: r.v ?? paragraphs, cost: r.cost, problems: after.script };
          });
          if (Array.isArray(last.paragraphs) && last.paragraphs.length) paragraphs = last.paragraphs;
        }
        break;
      }
      const cn = await check(`check-${n + 1}.json`, found);
      found = [...cn.script, ...cn.terra];
    }
    writeJson(path.join(d, 'big-idea.json'), { paragraphs });
    const c = (f) => readJson(path.join(d, f))?.cost ?? 0;
    const total = ['written', 'check-1', 'fix-1', 'check-2', 'fix-2', 'check-3', 'fix-3', 'fix-rules'].reduce((k, f) => k + c(`${f}.json`), 0);
    const left = fs.existsSync(path.join(d, 'fix-3.json')) ? readJson(path.join(d, 'fix-3.json')).problems?.length ?? 0 : 0;
    writeJson(path.join(d, 'done.json'), { firstFindings: first, finalFix: left, flags: 0, cost: Math.round(total * 10000) / 10000, t: new Date().toISOString() });
    spent += total; counted++;
    logEvent({ type: 'step', passage: p.id, step: STEP, status: 'done', model: null });
    logEvent({ type: 'note', title: `The Big Idea for ${span(p.start, p.end)}`, lines: [`${first} problems at first, ${left} needed the final fix`, `$${total.toFixed(3)}`] });
  }

  let spent = 0, counted = 0;
  const fail = (p, e) => logEvent({ type: 'note', title: 'The Big Idea: a passage failed', lines: [`${span(p.start, p.end)}: ${e.message}`, e.detail ?? ''], problem: true });
  if (todo.length > 1) { try { await one(todo[0]); } catch (e) { fail(todo[0], e); } todo.shift(); }
  const queue = [...todo];
  let finished = 0, stopped = null;
  // Stops taking new passages when the run costs well above the estimate: past the whole-run limit, or past the
  // per-passage limit on average once 20 passages are done. Passages already started finish.
  const tooMuch = () => spent > maxCost ? `$${spent.toFixed(2)} spent, over the $${maxCost} limit`
    : counted >= 20 && spent / counted > maxPerPassage ? `$${(spent / counted).toFixed(3)} a passage, over the $${maxPerPassage} limit` : null;
  await Promise.all(Array.from({ length: Math.max(1, Math.min(agents, queue.length)) }, async () => {
    while (queue.length) {
      const p = queue.shift();
      try { await one(p); if (++finished % 100 === 0) saveToGit(`The Big Idea: ${finished} passages done (automatic backup)`); }
      catch (e) { fail(p, e); }
      if (!stopped && (stopped = tooMuch())) { queue.length = 0; await notify('Stopped: cost above the estimate', [stopped, 'Run it again to carry on.'], { problem: true }); }
    }
  }));
  const done = chosen.filter((p) => fs.existsSync(path.join(dir(p), 'done.json')));
  const cost = done.reduce((k, p) => k + (readJson(path.join(dir(p), 'done.json'))?.cost ?? 0), 0);
  saveToGit(`The Big Idea: ${done.length} of ${chosen.length} passages done (automatic backup)`);
  logEvent({ type: 'run', status: 'finished', note: `The Big Idea: ${done.length} of ${chosen.length}.` });
  await notify('The Big Idea finished', [`${done.length} of ${chosen.length} passages done`, `Cost: $${cost.toFixed(2)}`]);
  return { done: done.length, total: chosen.length, cost };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const opt = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
  const ids = [];
  for (const part of String(opt('--passages') ?? '').split(',').filter(Boolean)) {
    const [a, b] = part.split('-').map(Number);
    for (let i = a; i <= (b || a); i++) ids.push(i);
  }
  if (!ids.length) { console.error('Say which passages: --passages 1-1558'); process.exit(1); }
  runBigIdea(ids, { agents: Number(opt('--agents') ?? 20), maxCost: Number(opt('--max-cost') ?? Infinity), maxPerPassage: Number(opt('--max-per-passage') ?? Infinity) }).then((r) => console.log(JSON.stringify(r)), (e) => { console.error(e.message); process.exit(1); });
}
