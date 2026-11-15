// Would Sonnet, as the checker, catch what the script caught in a writer's explanations, and the tone too?
// (owner, 2026-11-14: check GPT-5.1's round-2 explanations.) Writes output/model-test/sonnet-check/<writer>/<id>.json.
//
//   node scripts/dough-maker/run/model-test-check.mjs gpt-5.1 [gemini]     the checker is Sonnet, or Gemini 3.8 Flash (Google only)
import fs from 'node:fs';
import path from 'node:path';
import { OUTPUT, PASSAGES } from './events.mjs';
import { doc } from './docs.mjs';
import { span } from './bsb.mjs';
import { opus, SONNET, HAIKU } from './opus.mjs';
import { about, theText, folder, PREP_DIR } from './prep.mjs';

const writer = process.argv[2] ?? 'gpt-5.1';
// Checkers on OpenRouter, each pinned to its own company (owner's rule)
const OR = {
  gemini: { model: 'google/gemini-3.8-flash', only: ['google-ai-studio', 'google-vertex'], reasoning: { effort: 'low' } },
  opus: { model: 'anthropic/claude-opus-5.5', only: ['anthropic'] },
  'gpt-6.1-terra': { model: 'openai/gpt-6.1-terra', only: ['openai'] },
  'gpt-6.1-sol-pro': { model: 'openai/gpt-6.1-sol-pro', only: ['openai'] },
  'gemini-4-argon': { model: 'google/gemini-4-argon', only: ['google-ai-studio', 'google-vertex'] },
  'gemini-4-carbon': { model: 'google/gemini-4-carbon', only: ['google-ai-studio', 'google-vertex'] },
  'gemini-4-hydrogen': { model: 'google/gemini-4-hydrogen', only: ['google-ai-studio', 'google-vertex'] },
};
const checker = process.argv[3] && (OR[process.argv[3]] || process.argv[3] === 'haiku') ? process.argv[3] : 'sonnet';
const D = path.join(OUTPUT, 'model-test');
const rj = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };
const list = rj(PASSAGES);
const system = ['papa-dorin.md', 'answer-explanations.md', 'checker.md'].map((n) => ({ name: n, text: doc(n), kind: 'doc' }));

await Promise.all([250, 546, 1424].map(async (id) => {
  const p = list.find((x) => x.id === id);
  const out = path.join(D, `${checker}-check`, writer, `${id}.json`);
  if (rj(out)) return;
  const w = rj(path.join(D, 'write', writer, `${id}.json`));
  const prep = rj(path.join(PREP_DIR, folder(p), 'prep.json'));
  const cards = { passage: prep.passage, stops: prep.stops.map((s) => ({ ...s, cards: s.cards.map(({ needs_agent_fix, needs_human_decision, ...c }) => c) })) };
  const prompt = about(p) + '\n\n' + theText(p) + '\n\nThe Prep cards:\n' + JSON.stringify(cards, null, 2) +
    '\n\nAnswer explanations to check:\n' + JSON.stringify(w.out.cards, null, 2) + `

Check every answer explanation against answer-explanations.md, papa-dorin.md and the BSB text.
Report every explanation that:
- gets the Bible wrong or adds something the text doesn't say ("bible"),
- breaks a rule in answer-explanations.md, like 3 to 5 sentences, no dashes, no reaction phrases, never reusing a line from the Prep cards word for word ("rule"),
- doesn't sound like Papa Dorin as papa-dorin.md describes him: flat, generic, preachy, not funny where a laugh fits, the wrong warmth ("tone").
Reply with only JSON: {"findings": [{"stop": n, "card": n, "answer": n, "kind": "bible" | "rule" | "tone", "problem": "..."}]}. "answer" is the explanation's position on the card, starting at 1.`;
  const r = !OR[checker] ? await opus({ model: checker === 'haiku' ? HAIKU : SONNET, system, prompt, passage: id, step: 'model-test', role: 'reviewer' }) : await openrouter(OR[checker], system, prompt);
  const a = r.text.indexOf('{'), b = r.text.lastIndexOf('}');
  let o = null; try { o = JSON.parse(r.text.slice(a, b + 1)); } catch { /* kept raw */ }
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify({ writer, passage: span(p.start, p.end), script: w.script.problems, findings: o?.findings ?? null, raw: o ? undefined : r.text.slice(0, 3000), tokens: r.tokens }, null, 2) + '\n');
  console.log(`${checker} checked ${writer} on ${span(p.start, p.end)}: ${o?.findings?.length ?? 'unreadable'} findings`);
}));

async function openrouter(m, system, prompt) {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', { method: 'POST',
    headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: m.model, max_tokens: 32000, usage: { include: true }, ...(m.reasoning && { reasoning: m.reasoning }),
      provider: { only: m.only, allow_fallbacks: false },
      messages: [{ role: 'system', content: system.map((x) => x.text).join('\n\n') }, { role: 'user', content: prompt }] }) });
  const j = await res.json();
  if (!res.ok) throw new Error(`${res.status}: ${j.error?.message}`);
  return { text: j.choices?.[0]?.message?.content ?? '', tokens: { cost: j.usage?.cost, input: j.usage?.prompt_tokens, output: j.usage?.completion_tokens, reasoning: j.usage?.completion_tokens_details?.reasoning_tokens } };
}
