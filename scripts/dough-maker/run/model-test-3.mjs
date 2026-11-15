// Round 3 (owner, 2026-11-14): which writer gives the strict checker (GPT-6.1 Terra) the least to fix?
// 5 writers write the same 3 passages with the improved instructions from answers.mjs, at normal speed on
// OpenRouter, each pinned to its own company. Then the script and Terra check each. output/model-test/round3/.
import fs from 'node:fs';
import path from 'node:path';
import { OUTPUT, PASSAGES } from './events.mjs';
import { chat } from './openrouter.mjs';
import { material, SYSTEM, WRITE, CHECK, flatten, scriptCheck } from './answers.mjs';

const D = path.join(OUTPUT, 'model-test', 'round3');
const IDS = [250, 546, 1424];
const WRITERS = [
  { key: 'sonnet-medium', model: 'anthropic/claude-sonnet-5.5', only: ['anthropic'], reasoning: { effort: 'medium' } },
  { key: 'opus-medium', model: 'anthropic/claude-opus-5.5', only: ['anthropic'], reasoning: { effort: 'medium' } },
  { key: 'gpt-6.1-sol-pro', model: 'openai/gpt-6.1-sol-pro', only: ['openai'] },
  { key: 'gemini-4-argon', model: 'google/gemini-4-argon', only: ['google-ai-studio', 'google-vertex'] },
  { key: 'gpt-6.1-terra', model: 'openai/gpt-6.1-terra', only: ['openai'] },
];
const TERRA = { model: 'openai/gpt-6.1-terra', only: ['openai'], name: 'gpt-6.1-terra' };
const rj = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };
const json = (t) => { const a = String(t).indexOf('{'), b = String(t).lastIndexOf('}'); try { return JSON.parse(t.slice(a, b + 1)); } catch { return null; } };
const list = rj(PASSAGES);
const system = SYSTEM();

await Promise.all(WRITERS.map(async (w) => {
  for (const id of IDS) {
    const f = path.join(D, w.key, `${id}.json`);
    if (rj(f)) continue;
    const m = material(list.find((p) => p.id === id));
    const started = Date.now();
    try {
      const r = await chat({ ...w, name: w.key, system, user: WRITE(m), maxTokens: 48000, passage: id, step: 'model-test', role: 'writer' });
      const out = json(r.text);
      const { list: all, missing } = flatten(m, out);
      const script = [...missing, ...scriptCheck(m, all.filter((e) => e.explanation))];
      const t = await chat({ ...TERRA, system, user: CHECK(m, all), maxTokens: 32000, passage: id, step: 'model-test', role: 'reviewer' });
      const terra = json(t.text)?.findings ?? null;
      fs.mkdirSync(path.dirname(f), { recursive: true });
      fs.writeFileSync(f, JSON.stringify({ writer: w.key, passage: m.p.start, secs: Math.round((Date.now() - started) / 1000),
        writeCost: r.cost, writeTokens: r.tokens, checkCost: t.cost, explanations: all.filter((e) => e.explanation).length, expected: all.length,
        script, terra, out }, null, 2) + '\n');
      console.log(`${w.key} ${m.p.start}: $${r.cost.toFixed(3)} to write, ${all.length - missing.length}/${all.length} written, script ${script.length}, Terra ${terra?.length ?? 'unreadable'}`);
    } catch (e) { console.log(`${w.key} ${id} failed: ${e.message} ${e.detail ?? ''}`); }
  }
}));
