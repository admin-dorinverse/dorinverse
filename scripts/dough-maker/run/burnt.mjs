// Burnt Cookies (burnt-cookies.md) for every passage, as the owner decided on 2026-11-15 (models.md):
//   1. Sonnet writes the 5 lines (normal speed, OpenRouter, Anthropic only), from the verses and the Prep cards.
//   2. The script checks every rule it can count or look up: 5 lines, 2 burnt, passage order, one sentence each, no
//      dashes, 20 words or fewer, no reference in the text, no asides to the baker, real verses; each wrong detail is
//      a short swap (4 words or fewer) that is in its line, not in its verse, real somewhere in the Bible and the same
//      kind of name as the true one; each true detail is in its verse, taught in the Prep cards and not named in
//      another line; names and numbers in the good lines are in the passage.
//   3. The script puts the true detail back into each burnt line (a copy, only for checking), and GPT-6.1 Terra
//      checks that the 3 good lines and the 2 corrected lines are true to the verses they cite.
//   4. Sonnet fixes only the flagged lines, up to two times, each fix checked again; then a final fix. The script
//      checks the final fix, and anything countable still broken gets one last fix for just that. No flags.
// Saved under output/burnt/<id and range>/ as it goes (burnt-cookies.json is the finished file), so running it again
// picks up where it left off. The first passage goes alone so the rules are in the cache before the rest start.
//
//   node scripts/dough-maker/run/burnt.mjs --passages 1-1558 [--agents 20]
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { OUTPUT, PASSAGES, logEvent, notify } from './events.mjs';
import { doc } from './docs.mjs';
import { passageText, span, verses, verseIndex, parseRefs } from './bsb.mjs';
import { saveToGit } from './save.mjs';
import { PREP_DIR, about, theText, folder, passing } from './prep.mjs';
import { chat, SONNET_OR } from './openrouter.mjs';
import { sentences } from './answers.mjs';

const STEP = 'burnt_cookies';
export const BURNT_DIR = path.join(OUTPUT, 'burnt');
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
const norm = (s) => String(s ?? '').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').toLowerCase();
const has = (hay, needle) => new RegExp(`(^|[^a-z'])${norm(needle).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^a-z'])`).test(norm(hay));

// --- one passage's material: the Prep cards in compact form (what the walkthrough taught) ---------------------------
export function material(p) {
  const prep = readJson(path.join(PREP_DIR, folder(p), 'prep.json'));
  const lines = [];
  for (const s of prep.stops) for (const c of s.cards) {
    if (c.kind === 'story') lines.push(`[${c.verses}] ${c.text}`);
    else lines.push(`[${c.verses}] Q: ${c.question} Right: ${c.answers.filter((a) => a.correct).map((a) => a.text).join(' / ')}. Wrong: ${c.answers.filter((a) => !a.correct).map((a) => a.text).join(' / ')}.`);
  }
  return { p, prepText: lines.join('\n'), head: about(p) + '\n\n' + theText(p) };
}
const verseText = (ref) => { const r = parseRefs(ref); if (!r) return null; const all = verses(); return r.map(([a, b]) => all.slice(a, b + 1).map((v) => `${v.ref} ${v.text}`).join('\n')).join('\n'); };
let bible = null;
const bibleText = () => (bible ??= norm(verses().map((v) => v.text).join(' ')));
// Words the Bible uses in lower case ("During", "Anyone" at the start of a sentence) are ordinary words, not names
let lower = null;
const ordinary = (w) => (lower ??= new Set(verses().flatMap((v) => v.text.match(/\b[a-z][a-z']*\b/g) ?? []))).has(w.toLowerCase());
// A detail is in a text if the text says it, or says every name in it ("the land of Judah" when a card says "Judah",
// "city of Hebron" when the Bible says "Hebron"); used for true details in the Prep cards and wrong ones in the Bible
const taught = (prep, d) => {
  if (has(prep, d)) return true;
  const names = (String(d).match(/\b[A-Z][a-zA-Z]+\b/g) ?? []).filter((x) => !NAMES_OK.has(x.toLowerCase()));
  return names.length > 0 && names.every((x) => has(prep, x));
};

// --- prompts -------------------------------------------------------------------------------------------------------
export const SYSTEM = () => doc('burnt-cookies.md');
export const WRITE = (m) => `${m.head}

What the Prep walkthrough taught (each card with its verses):
${m.prepText}

Write Burnt Cookies for ${span(m.p.start, m.p.end)}, following burnt-cookies.md.
- 5 lines in passage order. Exactly 2 are burnt.
- Each line is one sentence of 20 words or fewer that states only a fact from the verses it cites. No outside facts, even true ones. No jokes, asides or comments like "friend." No em dashes or en dashes.
- The line's text never includes the reference, like (Ruth 1:4). It goes only in "verses".
- A burnt line swaps one short detail (4 words or fewer: a name, place, number or thing) for a real detail from elsewhere in the Bible, the same kind of thing as the true one (a place for a place, a person for a person). The true detail is one the walkthrough taught. In wrong_details, list only the swapped words, exactly as they appear in the line and in the verse, so they can be checked word for word.
- Never burn a name that another line also says (if Ruth is in line 4, don't swap Ruth out of line 2).
- Everything else in a burnt line is true.
- Reply with only the JSON described in burnt-cookies.md "Output". No other text.`;

const FIX = (m, lines, found) => `${m.head}

What the Prep walkthrough taught (each card with its verses):
${m.prepText}

The Burnt Cookies lines so far:
${JSON.stringify(lines, null, 2)}

Problems found in some lines:
${JSON.stringify(found, null, 2)}

Rewrite only the lines with a problem so the problem is gone, following burnt-cookies.md. Keep each line one sentence of 20 words or fewer with no reference in the text, keep each swap short, keep exactly 2 lines burnt overall, and keep the lines in passage order. Change only what the problem needs.
Reply with only JSON: {"lines": [the rewritten lines only, in the same shape as above]}.`;

const TERRA_SYSTEM = 'You check short retellings of Bible verses against the verses themselves (Berean Standard Bible).';
const CHECK = (items) => `Each line below retells the verses printed with it. For each line, is everything it says true to those verses? Nothing changed, nothing added that the verses don't say, nothing that makes it false. Small wording differences are fine.

${items.map((x) => `Line ${x.line}${x.corrected ? ' (a corrected copy of a burnt line)' : ''}: ${x.text}\nVerses:\n${x.verseText}`).join('\n\n')}

Reply with only JSON: {"findings": [{"line": n, "problem": "what is not true to the verses"}]}. All true: {"findings": []}.`;
const RECHECK = (items) => `Each line below was fixed. Each one is listed with the problem it had and the verses it retells. Check only whether that problem is now fixed. Don't report anything else.

${items.map((x) => `Line ${x.line}: ${x.text}\nThe problem it had: ${x.had}\nVerses:\n${x.verseText}`).join('\n\n')}

Reply with only JSON: {"findings": [{"line": n, "problem": "the problem that is still there"}]}. All fixed: {"findings": []}.`;

// --- the script check ----------------------------------------------------------------------------------------------
const NAMES_OK = new Set(['i', 'god', 'lord', 'jesus', 'christ', 'spirit', 'holy', 'then', 'and', 'but', 'so', 'now', 'when', 'after', 'there', 'he', 'she', 'they', 'his', 'her', 'their', 'the', 'a', 'an', 'in', 'at', 'on', 'by', 'from', 'with']);
const MAX_WORDS = 20, SWAP_WORDS = 4;
const words = (s) => String(s ?? '').trim().split(/\s+/).filter(Boolean).length;
export function scriptCheck(m, out) {
  const found = [], say = (line, problem) => found.push({ line, kind: 'rule', problem });
  const lines = Array.isArray(out?.lines) ? out.lines : [];
  if (lines.length !== 5) say(null, `There are ${lines.length} lines. There are 5.`);
  const burnt = lines.filter((l) => l?.burnt === true);
  if (burnt.length !== 2) say(null, `${burnt.length} lines are burnt. Exactly 2 are.`);
  const passage = passageText(m.p.start, m.p.end), first = verseIndex(m.p.start), last = verseIndex(m.p.end);
  let prevStart = -1;
  lines.forEach((l, i) => {
    const n = l?.line ?? i + 1, t = String(l?.text ?? '');
    if (l?.line !== i + 1) say(n, `Line ${i + 1} has the number ${JSON.stringify(l?.line)}.`);
    const r = parseRefs(l?.verses);
    if (!r) say(n, `It cites ${JSON.stringify(l?.verses)}, which is not a BSB reference.`);
    else {
      if (r[0][0] < first || r.at(-1)[1] > last) say(n, `It cites ${l.verses}, outside this passage.`);
      if (r[0][0] < prevStart) say(n, 'It is out of passage order.');
      prevStart = r[0][0];
    }
    const s = sentences(t);
    if (s !== 1) say(n, `It has ${s} sentences. Each line is one sentence.`);
    if (/[–—]/.test(t)) say(n, 'It uses a dash. No em dashes or en dashes.');
    const wc = words(t);
    if (wc > MAX_WORDS) say(n, `It has ${wc} words. Each line is ${MAX_WORDS} words or fewer.`);
    if (/\d+\s*:\s*\d+/.test(t)) say(n, 'Its text includes a reference. The reference goes only in verses.');
    // Papa Dorin talking to the baker; "friend" and "baker" are fine where the passage itself says them (Genesis 40)
    const aside = t.match(/\b(friend|baker|papa|dorin)\b/i);
    if (aside && !has(passage, aside[0])) say(n, `It says "${aside[0]}". Each line states only a fact: no jokes, asides or comments.`);
    if (l?.burnt) {
      const wd = Array.isArray(l.wrong_details) ? l.wrong_details : [];
      if (!wd.length) say(n, 'It is burnt but lists no wrong detail.');
      for (const w of wd) {
        const vt = verseText(w.verse) ?? '';
        const short = !!w.wrong && words(w.wrong) <= SWAP_WORDS;
        if (!w.wrong || !has(t, w.wrong)) say(n, `Its wrong detail "${w.wrong}" isn't in the line word for word.`);
        if (w.wrong && has(vt, w.wrong)) say(n, `Its wrong detail "${w.wrong}" is in ${w.verse}, so it isn't wrong.`);
        if (!w.true || !vt || !has(vt, w.true)) say(n, `Its true detail "${w.true}" isn't in ${w.verse} word for word.`);
        if (w.true && has(t, w.true)) say(n, `The line also says the true detail "${w.true}".`);
        if (w.wrong && !short) say(n, `Its wrong detail "${w.wrong}" is ${words(w.wrong)} words. Swap one short detail (${SWAP_WORDS} words or fewer, like a name, place or number) and list only the swapped words.`);
        else if (short && !taught(bibleText(), w.wrong)) say(n, `Its wrong detail "${w.wrong}" isn't found anywhere in the Bible.`);
        if (short && w.true && !taught(m.prepText, w.true)) say(n, `Its true detail "${w.true}" isn't in the Prep cards, so the walkthrough didn't teach it.`);
        // Name for a name: only for short swaps, so quotes like "Love your neighbor" aren't mistaken for names
        const cap = (x) => /^[A-Z]/.test(String(x ?? '').trim());
        if (short && words(w.true) <= SWAP_WORDS && cap(w.wrong) !== cap(w.true)) say(n, `"${w.wrong}" and "${w.true}" aren't the same kind of thing (one is a name, one isn't).`);
        if (w.true && cap(w.true) && words(w.true) <= SWAP_WORDS) {
          const others = lines.filter((o) => o !== l && has(o?.text, w.true)).map((o) => o?.line);
          if (others.length) say(n, `Its true detail "${w.true}" is named in line ${others.join(', ')}, which gives it away. Burn a detail no other line mentions.`);
        }
      }
    } else {
      for (const name of t.match(/\b[A-Z][a-zA-Z']+\b/g) ?? []) {
        if (NAMES_OK.has(name.toLowerCase().replace(/'s$/, '')) || ordinary(name.replace(/'s$/, ''))) continue;
        if (!has(passage, name.replace(/'s$/, ''))) say(n, `"${name}" isn't in this passage.`);
      }
      for (const num of t.match(/\b\d+\b/g) ?? []) if (!has(passage, num)) say(n, `The number ${num} isn't in this passage.`);
    }
  });
  return found;
}
// The burnt lines with the true detail put back, for Terra to check; never saved as output
export const corrected = (l) => (l.wrong_details ?? []).reduce((t, w) => w.wrong && w.true
  ? t.replace(new RegExp(String(w.wrong).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), w.true) : t, String(l.text ?? ''));
const forTerra = (lines, only = null) => lines.filter((l) => !only || only.includes(l.line))
  .map((l) => ({ line: l.line, corrected: !!l.burnt, text: l.burnt ? corrected(l) : l.text, verseText: verseText(l.verses) ?? '(no verses)' }));
const merge = (lines, fixed) => lines.map((l) => fixed.find((x) => x?.line === l.line) ?? l);

// --- the run -------------------------------------------------------------------------------------------------------
export async function runBurnt(ids, { agents = 20, maxCost = Infinity, maxPerPassage = Infinity } = {}) {
  const list = readJson(PASSAGES);
  const byId = new Map(list.map((p) => [p.id, p]));
  const dir = (p) => path.join(BURNT_DIR, folder(p));
  const system = SYSTEM();
  const chosen = ids.map((id) => byId.get(id)).filter((p) => p && fs.existsSync(path.join(PREP_DIR, folder(p), 'prep.json')));
  const todo = chosen.filter((p) => !fs.existsSync(path.join(dir(p), 'done.json')));
  logEvent({ type: 'run', status: 'running', note: `Burnt Cookies: ${chosen.length} passages.` });
  await notify('Burnt Cookies started', [`${todo.length} passages (${chosen.length - todo.length} already done)`, 'Sonnet writes, the script and Terra check, no flags']);

  let down = null;
  async function ask(fn, read) {
    let tried = false, cost = 0;   // a reply that can't be read is asked again, and both calls are paid for
    for (;;) {
      try {
        const r = await fn();
        cost += r.cost ?? 0;
        if (down) { notify('Burnt Cookies going again', [`After ${Math.round((Date.now() - down) / 60000)} min`]); down = null; }
        const v = read(r.text);
        if (v || tried) return { v, cost };
        tried = true;
      } catch (e) {
        if (!passing(e)) throw e;
        if (!down) { down = Date.now(); await notify('Burnt Cookies waiting', [e.message, 'It tries again every 5 minutes and carries on by itself.'], { problem: true }); }
        await sleep(WAIT);
      }
    }
  }
  const stage = async (file, fn) => { const got = readJson(file); if (got) return got; const out = await fn(); writeJson(file, out); return out; };
  const findings = (t) => Array.isArray(json(t)?.findings) ? json(t).findings : null;

  async function one(p) {
    const m = material(p), d = dir(p);
    const written = await stage(path.join(d, 'written.json'), async () => {
      const r = await ask(() => chat({ ...SONNET, system, user: WRITE(m), passage: p.id, step: STEP, role: 'writer' }), (t) => Array.isArray(json(t)?.lines) ? json(t) : null);
      return { ...(r.v ?? { lines: [] }), cost: r.cost };
    });
    let lines = written.lines ?? [];
    const check = (file, before = null) => stage(path.join(d, file), async () => {
      const script = scriptCheck(m, { lines });
      const had = before?.filter((f) => f.kind === 'terra') ?? null;
      const items = had ? forTerra(lines, had.map((f) => f.line)).map((x) => ({ ...x, had: had.filter((f) => f.line === x.line).map((f) => f.problem).join(' ') })) : forTerra(lines);
      const r = items.length ? await ask(() => chat({ ...TERRA, system: TERRA_SYSTEM, user: had ? RECHECK(items) : CHECK(items), passage: p.id, step: STEP, role: 'reviewer' }), findings) : { v: [], cost: 0 };
      return { script, terra: (r.v ?? []).map((f) => ({ ...f, kind: 'terra' })), cost: r.cost };
    });
    const c1 = await check('check-1.json');
    let found = [...c1.script, ...c1.terra];
    const first = found.length;
    for (let n = 1; n <= 3 && found.length; n++) {
      const fix = await stage(path.join(d, `fix-${n}.json`), async () => {
        const r = await ask(() => chat({ ...SONNET, system, user: FIX(m, lines, found), passage: p.id, step: STEP, role: 'fixer' }),
          (t) => Array.isArray(json(t)?.lines) ? json(t).lines : null);
        return { lines: r.v ?? [], cost: r.cost, ...(n === 3 && { problems: found }) };
      });
      lines = merge(lines, fix.lines);
      if (n === 3) {
        // The free check runs once more on the final fix; a countable rule still broken gets one last fix for just
        // that, and that version stands
        const after = await stage(path.join(d, 'check-final.json'), async () => ({ script: scriptCheck(m, { lines }), cost: 0 }));
        if (after.script.length) {
          const last = await stage(path.join(d, 'fix-rules.json'), async () => {
            const r = await ask(() => chat({ ...SONNET, system, user: FIX(m, lines, after.script), passage: p.id, step: STEP, role: 'fixer' }),
              (t) => Array.isArray(json(t)?.lines) ? json(t).lines : null);
            return { lines: r.v ?? [], cost: r.cost, problems: after.script };
          });
          lines = merge(lines, last.lines);
        }
        break;
      }
      const cn = await check(`check-${n + 1}.json`, found);
      found = [...cn.script, ...cn.terra];
    }
    const out = { lines: lines.map(({ line, verses: v, text, burnt, wrong_details }) => ({ line, verses: v, text, burnt: !!burnt, ...(burnt && { wrong_details }) })) };
    writeJson(path.join(d, 'burnt-cookies.json'), out);
    const c = (f) => readJson(path.join(d, f))?.cost ?? 0;
    const total = ['written', 'check-1', 'fix-1', 'check-2', 'fix-2', 'check-3', 'fix-3', 'fix-rules'].reduce((k, f) => k + c(`${f}.json`), 0);
    const left = fs.existsSync(path.join(d, 'fix-3.json')) ? readJson(path.join(d, 'fix-3.json')).problems?.length ?? 0 : 0;
    writeJson(path.join(d, 'done.json'), { firstFindings: first, finalFix: left, flags: 0, cost: Math.round(total * 10000) / 10000, t: new Date().toISOString() });
    spent += total; counted++;
    logEvent({ type: 'step', passage: p.id, step: STEP, status: 'done', model: null });
    logEvent({ type: 'note', title: `Burnt Cookies for ${span(p.start, p.end)}`, lines: [`${first} problems at first, ${left} needed the final fix`, `$${total.toFixed(3)}`] });
  }

  let spent = 0, counted = 0;
  const fail = (p, e) => logEvent({ type: 'note', title: 'Burnt Cookies: a passage failed', lines: [`${span(p.start, p.end)}: ${e.message}`, e.detail ?? ''], problem: true });
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
      try { await one(p); if (++finished % 100 === 0) saveToGit(`Burnt Cookies: ${finished} passages done (automatic backup)`); }
      catch (e) { fail(p, e); }
      if (!stopped && (stopped = tooMuch())) { queue.length = 0; await notify('Stopped: cost above the estimate', [stopped, 'Run it again to carry on.'], { problem: true }); }
    }
  }));
  const done = chosen.filter((p) => fs.existsSync(path.join(dir(p), 'done.json')));
  const cost = done.reduce((k, p) => k + (readJson(path.join(dir(p), 'done.json'))?.cost ?? 0), 0);
  saveToGit(`Burnt Cookies: ${done.length} of ${chosen.length} passages done (automatic backup)`);
  logEvent({ type: 'run', status: 'finished', note: `Burnt Cookies: ${done.length} of ${chosen.length}.` });
  await notify('Burnt Cookies finished', [`${done.length} of ${chosen.length} passages done`, `Cost: $${cost.toFixed(2)}`]);
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
  runBurnt(ids, { agents: Number(opt('--agents') ?? 20), maxCost: Number(opt('--max-cost') ?? Infinity), maxPerPassage: Number(opt('--max-per-passage') ?? Infinity) }).then((r) => console.log(JSON.stringify(r)), (e) => { console.error(e.message); process.exit(1); });
}
