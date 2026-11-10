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
// The job is the end of each call: a tag for this run keeps a rerun within the hour from matching the last run's calls
const RUN = Date.now().toString(36);
const job = (n) => `Caching test, call ${n}. Do not do the task above. Reply with just the word: ok (run ${RUN})`;
const piece = (name, text, kind = 'doc') => ({ name, text, kind });
const passagesMd = piece('passages.md', doc('passages.md')), checkerMd = piece('checker.md', doc('checker.md'));
const ruth = piece('Ruth', bookText('Ruth'), 'bible'), jonah = piece('Jonah', bookText('Jonah'), 'bible');
const sample = (book) => JSON.stringify([{ id: 1, title: 'Sample', start: `${book} 1:1`, end: `${book} 1:5`,
  type: 'Narrative', story_group: null, position: null, included: [] }], null, 2);

const plan = [
  { name: 'Opus A1', note: 'Ruth, first call', run: () => opus({ step, system: [passagesMd, ruth], prompt: job(1) }) },
  { name: 'Opus A2', note: 'Ruth again, different job', run: () => opus({ step, system: [passagesMd, ruth], prompt: job(2) }) },
  { name: 'Opus A3', note: 'Jonah', run: () => opus({ step, system: [passagesMd, jonah], prompt: job(3) }) },
  { name: 'Opus B1', note: 'Ruth, first call', run: () => opus({ step, system: [passagesMd], prompt: ruth.text + '\n' + job(4) }) },
  { name: 'Opus B2', note: 'Ruth again, different job', run: () => opus({ step, system: [passagesMd], prompt: ruth.text + '\n' + job(5) }) },
  { name: 'Opus B3', note: 'Jonah', run: () => opus({ step, system: [passagesMd], prompt: jonah.text + '\n' + job(6) }) },
  { name: 'Kimi 1', note: 'Ruth, first call', run: () => kimiCall(ruth, 'Ruth', 7) },
  { name: 'Kimi 2', note: 'Ruth again, different job', run: () => kimiCall(ruth, 'Ruth', 8) },
  { name: 'Kimi 3', note: 'Jonah', run: () => kimiCall(jonah, 'Jonah', 9) },
];

function kimiCall(book, name, n) {
  return kimi({ step, maxTokens: 2000, shared: [passagesMd, checkerMd, book], messages: [
    { role: 'system', content: passagesMd.text + '\n\n' + checkerMd.text },
    { role: 'user', content: book.text + '\n' + sample(name) + '\n\n' + job(n) }] });
}

await notify('Caching test started', ['6 tiny Opus calls and 3 tiny Kimi calls', 'Ruth twice, then Jonah, for each layout']);
const results = [];
try {
  for (const c of plan) {
    const r = await c.run();
    const u = r.usage ?? {};
    // expected is worked out from the text at the top; reused is what the provider reports
    results.push({ name: c.name, note: c.note, verdict: r.cache.status, top: r.cache.pieces.map((p) => p.name).join(' + '),
      reused: r.tokens.cached, expected: r.cache.expected, pct: Math.round((100 * r.tokens.cached) / r.cache.expected),
      input: r.tokens.input, cacheLasts: u.cache_creation?.ephemeral_1h_input_tokens ? '1 hour' : u.cache_creation?.ephemeral_5m_input_tokens ? '5 minutes' : null,
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
await notify('Caching test finished', results.map((r) => `${r.name} (${r.top}): ${r.verdict}, reused ` +
  `${r.reused.toLocaleString()} of ${r.expected.toLocaleString()} tokens (${r.pct}%)`));
