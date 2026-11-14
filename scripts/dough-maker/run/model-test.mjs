// Answer explanations: which model should write them, and which should check them? (owner, 2026-11-14)
// 9 models write the explanations for the same 3 passages. A script checks the countable rules, and Opus grades
// all 9 side by side (unnamed, A to I, so it can't favor one). Then each model checks a set with planted mistakes,
// to see which ones catch them. Everything goes to output/model-test/.
// OpenRouter calls go only to each model's own company (owner's rule): Google, OpenAI, Mistral, Moonshot.
//
//   node scripts/dough-maker/run/model-test.mjs [--only write|grade|checkers]
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { OUTPUT, PASSAGES, logEvent } from './events.mjs';
import { doc } from './docs.mjs';
import { passageText, span } from './bsb.mjs';
import { opus, SONNET, HAIKU, OPUS } from './opus.mjs';
import { about, theText, folder, PREP_DIR } from './prep.mjs';

const DIR = path.join(OUTPUT, 'model-test');
const PASSAGE_IDS = [250, 546, 1424];   // Ruth 1 (story), Psalm 23 (poetry), Galatians 5:1-15 (letter)

export const MODELS = [
  { key: 'haiku', name: 'Haiku', company: 'Claude', claude: HAIKU },
  { key: 'sonnet', name: 'Sonnet', company: 'Claude', claude: SONNET },
  { key: 'kimi-k2.6', name: 'Kimi K2.6', company: 'Moonshot', id: 'moonshotai/kimi-k2.6', only: ['moonshotai'], reasoning: { enabled: false } },
  { key: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash', company: 'Google', id: 'google/gemini-3.8-flash', only: ['google-ai-studio', 'google-vertex'], reasoning: { effort: 'low' } },
  { key: 'gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash Lite', company: 'Google', id: 'google/gemini-3.5-flash-lite', only: ['google-ai-studio', 'google-vertex'], reasoning: { enabled: false } },
  { key: 'gpt-5.4-mini', name: 'GPT-5.4 mini', company: 'OpenAI', id: 'openai/gpt-5.4-mini', only: ['openai'], reasoning: { effort: 'low' } },
  { key: 'gpt-5-mini', name: 'GPT-5 mini', company: 'OpenAI', id: 'openai/gpt-5-mini', only: ['openai'], reasoning: { effort: 'low' } },
  { key: 'mistral-large-4', name: 'Mistral Large 4', company: 'Mistral', id: 'mistralai/mistral-large-4-0', only: ['mistral'] },
  { key: 'mistral-small', name: 'Mistral Small', company: 'Mistral', id: 'mistralai/mistral-small-2603', only: ['mistral'] },
  // Round 2 (owner, 2026-11-14): bigger models from the approved companies, writing only
  { key: 'gemini-3.7-flash', name: 'Gemini 3.7 Flash', company: 'Google', id: 'google/gemini-3.7-flash', only: ['google-ai-studio', 'google-vertex'], reasoning: { effort: 'low' }, round: 2 },
  { key: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash', company: 'Google', id: 'google/gemini-3.5-flash', only: ['google-ai-studio', 'google-vertex'], reasoning: { effort: 'low' }, round: 2 },
  { key: 'gpt-5.4', name: 'GPT-5.4', company: 'OpenAI', id: 'openai/gpt-5.4', only: ['openai'], reasoning: { effort: 'low' }, round: 2 },
  { key: 'gpt-5.1', name: 'GPT-5.1', company: 'OpenAI', id: 'openai/gpt-5.1', only: ['openai'], reasoning: { effort: 'low' }, round: 2 },
  { key: 'mistral-medium-3.5', name: 'Mistral Medium 3.5', company: 'Mistral', id: 'mistralai/mistral-medium-3-5', only: ['mistral'], round: 2 },
];

const readJson = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };
const writeJson = (f, d) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(d, null, 2) + '\n'); };

// One call to any of the 9: Claude through the subscription, the rest through OpenRouter, pinned to their company
async function call(m, system, user, { passage = null, role = 'writer' } = {}) {
  const started = Date.now();
  if (m.claude) {
    const r = await opus({ model: m.claude, system: system.map((t, i) => ({ name: `doc${i}`, text: t, kind: 'doc' })), prompt: user,
      passage, step: 'model-test', role });
    return { text: r.text, ms: Date.now() - started, cost: 0, tokens: r.tokens };
  }
  const id = randomUUID();
  logEvent({ type: 'call', id, model: m.key, passage, step: 'model-test', role, status: 'start' });
  const body = { model: m.id, max_tokens: 20000, usage: { include: true }, provider: { only: m.only, allow_fallbacks: false },
    messages: [{ role: 'system', content: system.join('\n\n') }, { role: 'user', content: user }] };
  if (m.reasoning) body.reasoning = m.reasoning;
  for (let attempt = 0; ; attempt++) {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', { method: 'POST',
      headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = `${res.status}: ${j.error?.message ?? 'no reason'}`;
      if (body.reasoning && attempt === 0 && /reason/i.test(msg)) { delete body.reasoning; continue; }   // a model that can't turn thinking off
      logEvent({ type: 'call', id, model: m.key, passage, step: 'model-test', role, status: 'error', error: msg });
      throw new Error(`${m.name}: ${msg}`);
    }
    const u = j.usage ?? {};
    const out = { text: j.choices?.[0]?.message?.content?.trim() ?? '', ms: Date.now() - started, cost: u.cost ?? 0,
      tokens: { input: u.prompt_tokens ?? 0, cached: u.prompt_tokens_details?.cached_tokens ?? 0, output: u.completion_tokens ?? 0 },
      provider: j.provider };
    logEvent({ type: 'call', id, model: m.key, passage, step: 'model-test', role, status: 'done', ms: out.ms, tokens: out.tokens, cost: out.cost });
    return out;
  }
}

function json(text) {
  const a = text.indexOf('{'), b = text.lastIndexOf('}');
  try { if (a >= 0 && b > a) return JSON.parse(text.slice(a, b + 1)); } catch { /* below */ }
  return null;
}

// --- the passages --------------------------------------------------------------------------------------------------
const list = readJson(PASSAGES);
const passages = PASSAGE_IDS.map((id) => {
  const p = list.find((x) => x.id === id);
  const prep = readJson(path.join(PREP_DIR, folder(p), 'prep.json'));
  const cards = prep.stops.flatMap((s) => s.cards.map((c) => ({ ...c, stop: s.stop })));
  const choices = cards.filter((c) => c.kind === 'choice').map(({ needs_agent_fix, needs_human_decision, ...c }) => c);
  const story = cards.filter((c) => c.kind === 'story').map((c) => c.text);
  return { p, prep, choices, story, label: span(p.start, p.end) };
});
const showPrep = (x) => JSON.stringify({ passage: x.prep.passage, stops: x.prep.stops.map((s) => ({ ...s,
  cards: s.cards.map(({ needs_agent_fix, needs_human_decision, ...c }) => c) })) }, null, 2);

const WRITE = (x) => `Above are Papa Dorin's Prep cards for ${x.label}, in the BSB text above.

Write the answer explanations for every choice card, following answer-explanations.md and papa-dorin.md.
- Every answer gets its own explanation, the right one too, in the same order as the card's answers.
- Reply with only the JSON described in answer-explanations.md "Output". No other text.`;

// --- the script check ----------------------------------------------------------------------------------------------
const REACTIONS = /\b(underbaked|still doughy|came out burnt|baked just right|fine work, baker|box-worthy|that's a keeper|perfect bake)\b/i;
const sentences = (t) => String(t ?? '').replace(/“[^”]*”|"[^"]*"/g, 'Q').split(/[.!?]+(?=\s|$)/).map((s) => s.trim()).filter((s) => s.split(/\s+/).length > 2).length;
const words = (s) => String(s).toLowerCase().replace(/[‘’]/g, "'").match(/[a-z']+/g) ?? [];
export function scriptCheck(x, out) {
  const problems = [];
  const got = Array.isArray(out?.cards) ? out.cards : [];
  const prepGrams = new Set();
  for (const t of x.story) { const w = words(t); for (let i = 0; i + 8 <= w.length; i++) prepGrams.add(w.slice(i, i + 8).join(' ')); }
  let n = 0;
  for (const c of x.choices) {
    const g = got.find((k) => k.stop === c.stop && k.card === c.card);
    if (!g) { problems.push(`stop ${c.stop} card ${c.card}: no explanations`); continue; }
    const ex = Array.isArray(g.explanations) ? g.explanations : [];
    if (ex.length !== c.answers.length) problems.push(`stop ${c.stop} card ${c.card}: ${ex.length} explanations for ${c.answers.length} answers`);
    ex.forEach((e, i) => {
      n++;
      const where = `stop ${c.stop} card ${c.card}, answer ${i + 1}`;
      const t = String(e.explanation ?? '');
      if (String(e.answer ?? '').trim() !== String(c.answers[i]?.text ?? '').trim()) problems.push(`${where}: answer text doesn't match the card`);
      const s = sentences(t);
      if (s < 3 || s > 5) problems.push(`${where}: ${s} sentences`);
      if (/[–—]/.test(t.replace(/“[^”]*”|"[^"]*"/g, ''))) problems.push(`${where}: a dash`);
      if (REACTIONS.test(t)) problems.push(`${where}: a reaction phrase`);
      const w = words(t);
      for (let k = 0; k + 8 <= w.length; k++) if (prepGrams.has(w.slice(k, k + 8).join(' '))) { problems.push(`${where}: copies a Prep line word for word`); break; }
    });
  }
  return { explanations: n, problems };
}

// --- 1. writing ----------------------------------------------------------------------------------------------------
async function write() {
  const system = [doc('papa-dorin.md'), doc('answer-explanations.md')];
  await Promise.all(MODELS.map(async (m) => {
    for (const x of passages) {
      const f = path.join(DIR, 'write', m.key, `${x.p.id}.json`);
      if (readJson(f)) continue;
      const user = about(x.p) + '\n\n' + theText(x.p) + '\n\n' + showPrep(x) + '\n\n' + WRITE(x);
      try {
        const r = await call(m, system, user, { passage: x.p.id });
        const out = json(r.text);
        writeJson(f, { model: m.name, company: m.company, passage: x.label, ms: r.ms, cost: r.cost, tokens: r.tokens, provider: r.provider,
          readable: !!out, script: out ? scriptCheck(x, out) : null, out, raw: out ? undefined : r.text.slice(0, 2000) });
        console.log(`${m.name} wrote ${x.label} in ${Math.round(r.ms / 1000)} s, $${r.cost.toFixed(4)}`);
      } catch (e) { console.log(`${m.name} failed on ${x.label}: ${e.message}`); writeJson(f + '.error', { error: e.message }); }
    }
  }));
}

// --- 2. Opus grades all 9 side by side -----------------------------------------------------------------------------
async function grade() {
  const system = [doc('papa-dorin.md'), doc('answer-explanations.md')];
  const letters = 'ABCDEFGHI';
  for (const x of passages) {
    const f = path.join(DIR, 'grade', `${x.p.id}.json`);
    if (readJson(f)) continue;
    const sets = MODELS.map((m, i) => ({ letter: letters[i], key: m.key, w: readJson(path.join(DIR, 'write', m.key, `${x.p.id}.json`)) }))
      .filter((s) => s.w?.out);
    const order = sets.slice().sort(() => Math.random() - 0.5);
    const user = about(x.p) + '\n\n' + theText(x.p) + '\n\n' + showPrep(x) + '\n\n' +
      order.map((s) => `=== Set ${s.letter} ===\n${JSON.stringify(s.w.out.cards)}`).join('\n\n') + `

Above are ${order.length} sets of answer explanations for these Prep cards, written by different writers. Grade each set against answer-explanations.md, papa-dorin.md and the BSB text.
For each set give: faithful (1-10: every fact true to the verse, nothing added), rules (1-10: follows answer-explanations.md), voice (1-10: sounds like Papa Dorin, funny where it fits, warm, plain words), problems (how many explanations have a real problem), and notes (2 short sentences: the best thing and the worst thing, with an example).
Then rank the sets from best to worst.
Reply with only JSON: {"sets": [{"set": "A", "faithful": n, "rules": n, "voice": n, "problems": n, "notes": "..."}], "ranking": ["A", ...]}`;
    const r = await call({ claude: OPUS, name: 'Opus' }, system, user, { passage: x.p.id, role: 'final' });
    const g = json(r.text);
    writeJson(f, { passage: x.label, key: Object.fromEntries(sets.map((s) => [s.letter, s.key])), grade: g, raw: g ? undefined : r.text.slice(0, 3000) });
    console.log(`Opus graded ${x.label}`);
  }
}

// --- 3. checkers: plant mistakes and see who catches them ----------------------------------------------------------
async function checkers() {
  const x = passages[0];
  const base = readJson(path.join(DIR, 'write', 'sonnet', `${x.p.id}.json`))?.out ?? readJson(path.join(DIR, 'write', 'gpt-5.4-mini', `${x.p.id}.json`))?.out;
  const planted = JSON.parse(JSON.stringify(base));
  const cards = planted.cards;
  const plant = [];
  const at = (i) => cards[Math.min(i, cards.length - 1)];
  const put = (i, k, change, what) => { const c = at(i); const e = c.explanations[k % c.explanations.length]; e.explanation = change(e.explanation); plant.push({ stop: c.stop, card: c.card, answer: (k % c.explanations.length) + 1, what }); };
  put(1, 0, (t) => t.replace(/Moab/g, 'Edom').replace(/Bethlehem/g, 'Jericho'), 'a wrong Bible fact (a place swapped)');
  put(3, 1, (t) => t + ' ' + x.story[2], 'a Prep story line copied word for word');
  put(5, 0, (t) => t.replace(/\. /, ' — and that matters. '), 'an em dash');
  put(7, 1, (t) => 'Baked just right! ' + t, 'a reaction phrase the code already shows');
  put(9, 0, (t) => t + ' And that is not all. There is more here. Think about it for a while. Then think again.', 'too long (over 5 sentences)');
  put(11, 2, (t) => t.replace(/“[^”]{10,}”/, (q) => q.replace(/\b(\w{4,})\b/, (w) => w.split('').reverse().join(''))), 'a misquoted Bible line (a word changed inside quotation marks)');
  put(13, 0, (t) => t + ' Naomi was secretly glad to leave Bethlehem.', 'a reason the text never gives');
  writeJson(path.join(DIR, 'checkers', 'planted.json'), { passage: x.label, plant, out: planted });
  const system = [doc('papa-dorin.md'), doc('answer-explanations.md'), doc('checker.md')];
  const user = about(x.p) + '\n\n' + theText(x.p) + '\n\n' + showPrep(x) + '\n\nAnswer explanations to check:\n' + JSON.stringify(planted.cards) + `

Check these answer explanations against answer-explanations.md, papa-dorin.md and the BSB text. Report every explanation that breaks a rule or gets the Bible wrong.
Reply with only JSON: {"findings": [{"stop": n, "card": n, "answer": n, "problem": "..."}]}. "answer" is the explanation's position on the card, starting at 1.`;
  await Promise.all(MODELS.map(async (m) => {
    const f = path.join(DIR, 'checkers', `${m.key}.json`);
    if (readJson(f)) return;
    try {
      const r = await call(m, system, user, { passage: x.p.id, role: 'reviewer' });
      const o = json(r.text);
      const found = Array.isArray(o?.findings) ? o.findings : [];
      const caught = plant.filter((pl) => found.some((fd) => fd.stop === pl.stop && fd.card === pl.card && (fd.answer === pl.answer || fd.answer == null)));
      const extra = found.filter((fd) => !plant.some((pl) => fd.stop === pl.stop && fd.card === pl.card));
      writeJson(f, { model: m.name, ms: r.ms, cost: r.cost, caught: caught.length, of: plant.length, missed: plant.filter((pl) => !caught.includes(pl)).map((pl) => pl.what),
        otherFindings: extra.length, examples: extra.slice(0, 5).map((e) => `stop ${e.stop} card ${e.card}: ${e.problem}`), readable: !!o });
      console.log(`${m.name} caught ${caught.length} of ${plant.length}, ${extra.length} other findings`);
    } catch (e) { console.log(`${m.name} failed checking: ${e.message}`); }
  }));
}

const only = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1] : null;
if (!only || only === 'write') await write();
if (!only || only === 'grade') await grade();
if (!only || only === 'checkers') await checkers();
