// Caching test (models.md "Before the full run" step 1): tiny calls with the real docs and BSB text at the top,
// to see how much of each call is reused. Ruth twice with a different job at the end, then Jonah.
//
//   Opus, layout A: docs + book text in the system prompt, the job in the message
//   Opus, layout B: docs in the system prompt, book text + the job in the message
//   Kimi:           docs, then book text, then an output to check, then the job (Kimi reuses any matching start)
//
// Claude Code marks the end of the system prompt for reuse, so A should reuse the book text between calls on the
// same book, and B the docs across books. Results go to .cache/cache-test.json and the dashboard.
//
//   node scripts/dough-maker/run/cache-test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { CACHE, notify } from './events.mjs';
import { doc, fingerprints } from './docs.mjs';
import { bookText } from './bsb.mjs';
import { opus } from './opus.mjs';
import { kimi } from './kimi.mjs';

const step = 'cache_test';
const job = (n) => `Caching test, call ${n}. Do not do the task above. Reply with just the word: ok`;
const ruth = bookText('Ruth'), jonah = bookText('Jonah');
const checkerDocs = doc('passages.md') + '\n\n' + doc('checker.md');
const sample = (book) => JSON.stringify([{ id: 1, title: 'Sample', start: `${book} 1:1`, end: `${book} 1:5`,
  type: 'Narrative', story_group: null, position: null, included: [] }], null, 2);

const plan = [
  { name: 'Opus A1', note: 'Ruth, first call', run: () => opus({ step, system: doc('passages.md') + '\n\n' + ruth, prompt: job(1) }) },
  { name: 'Opus A2', note: 'Ruth again, different job', run: () => opus({ step, system: doc('passages.md') + '\n\n' + ruth, prompt: job(2) }) },
  { name: 'Opus A3', note: 'Jonah', run: () => opus({ step, system: doc('passages.md') + '\n\n' + jonah, prompt: job(3) }) },
  { name: 'Opus B1', note: 'Ruth, first call', run: () => opus({ step, system: doc('passages.md'), prompt: ruth + '\n' + job(4) }) },
  { name: 'Opus B2', note: 'Ruth again, different job', run: () => opus({ step, system: doc('passages.md'), prompt: ruth + '\n' + job(5) }) },
  { name: 'Opus B3', note: 'Jonah', run: () => opus({ step, system: doc('passages.md'), prompt: jonah + '\n' + job(6) }) },
  { name: 'Kimi 1', note: 'Ruth, first call', run: () => kimiCall(ruth, 'Ruth', 7) },
  { name: 'Kimi 2', note: 'Ruth again, different job', run: () => kimiCall(ruth, 'Ruth', 8) },
  { name: 'Kimi 3', note: 'Jonah', run: () => kimiCall(jonah, 'Jonah', 9) },
];

function kimiCall(text, book, n) {
  return kimi({ step, maxTokens: 2000, messages: [{ role: 'system', content: checkerDocs },
    { role: 'user', content: text + '\n' + sample(book) + '\n\n' + job(n) }] });
}

await notify('Caching test started', ['6 tiny Opus calls and 3 tiny Kimi calls', 'Ruth twice, then Jonah, for each layout']);
const results = [];
try {
  for (const c of plan) {
    const r = await c.run();
    const u = r.usage ?? {};
    results.push({ name: c.name, note: c.note, input: r.tokens.input, reused: r.tokens.cached,
      pct: Math.round((100 * r.tokens.cached) / r.tokens.input),
      written: u.cache_creation_input_tokens ?? null,
      written1h: u.cache_creation?.ephemeral_1h_input_tokens ?? null, written5m: u.cache_creation?.ephemeral_5m_input_tokens ?? null,
      cost: r.cost ?? null, reply: r.text.slice(0, 20) });
    console.log(results.at(-1));
    await new Promise((res) => setTimeout(res, 3000));
  }
} catch (e) {
  await notify('Caching test failed', ['The test stopped', e.message, e.detail && `Details: ${e.detail}`], { problem: true });
  process.exit(1);
}

fs.writeFileSync(path.join(CACHE, 'cache-test.json'),
  JSON.stringify({ t: new Date().toISOString(), docs: fingerprints(), results }, null, 2));
await notify('Caching test finished', results.filter((r) => !r.note.endsWith('first call'))
  .map((r) => `${r.name} (${r.note}): ${r.pct}% reused, ${r.reused.toLocaleString()} of ${r.input.toLocaleString()} tokens`));
