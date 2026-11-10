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
//   node scripts/dough-maker/run/cache-test.mjs --prep   the Prep calls instead (prep.mjs): Genesis 1:1-2:3 twice, then
//                                                        the next passage. Opus should reuse the docs on calls 2 and 3;
//                                                        Kimi the docs and passage on call 2, the docs on call 3.
//                                                        Results go to .cache/cache-test-prep.json.
import fs from 'node:fs';
import path from 'node:path';
import { CACHE, notify } from './events.mjs';
import { doc, fingerprints } from './docs.mjs';
import { bookText } from './bsb.mjs';
import { opus } from './opus.mjs';
import { kimi } from './kimi.mjs';
import { PASSAGES } from './events.mjs';
import { about, theText } from './prep.mjs';

const step = 'cache_test';
// The job is the end of each call: a tag for this run keeps a rerun within the hour from matching the last run's calls
const RUN = Date.now().toString(36);
const job = (n) => `Caching test, call ${n}. Do not do the task above. Reply with just the word: ok (run ${RUN})`;
const piece = (name, text, kind = 'doc') => ({ name, text, kind });
const passagesMd = piece('passages.md', doc('passages.md')), checkerMd = piece('checker.md', doc('checker.md'));
const ruth = piece('Ruth', bookText('Ruth'), 'bible'), jonah = piece('Jonah', bookText('Jonah'), 'bible');
const sample = (book) => JSON.stringify([{ id: 1, title: 'Sample', start: `${book} 1:1`, end: `${book} 1:5`,
  type: 'Narrative', story_group: null, position: null, included: [] }], null, 2);

const PREP = process.argv.includes('--prep');
const papaMd = piece('papa-dorin.md', doc('papa-dorin.md')), prepMd = piece('prep-walkthrough.md', doc('prep-walkthrough.md'));
const [p1, p2] = JSON.parse(fs.readFileSync(PASSAGES, 'utf8'));
const head = (p) => about(p) + '\n\n' + theText(p);
const prepSample = (p) => JSON.stringify({ passage: about(p).split('\n')[0].slice('Passage: '.length), stops: [] }, null, 2);
const prepKimi = (p, n) => kimi({ step, maxTokens: 2000, shared: [papaMd, prepMd, checkerMd, piece(p.title, head(p), 'bible')], messages: [
  { role: 'system', content: [papaMd, prepMd, checkerMd].map((x) => x.text).join('\n\n') },
  { role: 'user', content: head(p) + '\n\n' + prepSample(p) + '\n\n' + job(n) }] });
const prepOpus = (p, n) => opus({ step, system: [papaMd, prepMd], prompt: head(p) + '\n\n' + job(n) });
const prepPlan = [
  { name: 'Opus 1', note: 'Genesis 1:1-2:3, first call', run: () => prepOpus(p1, 1) },
  { name: 'Opus 2', note: 'Same passage, different job', run: () => prepOpus(p1, 2) },
  { name: 'Opus 3', note: 'The next passage', run: () => prepOpus(p2, 3) },
  { name: 'Kimi 1', note: 'Genesis 1:1-2:3 check, first call', run: () => prepKimi(p1, 4) },
  { name: 'Kimi 2', note: 'Same passage, different job', run: () => prepKimi(p1, 5) },
  { name: 'Kimi 3', note: 'The next passage', run: () => prepKimi(p2, 6) },
];

const passagesPlan = [
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
const plan = PREP ? prepPlan : passagesPlan;

function kimiCall(book, name, n) {
  return kimi({ step, maxTokens: 2000, shared: [passagesMd, checkerMd, book], messages: [
    { role: 'system', content: passagesMd.text + '\n\n' + checkerMd.text },
    { role: 'user', content: book.text + '\n' + sample(name) + '\n\n' + job(n) }] });
}

await notify(PREP ? 'Prep caching test started' : 'Caching test started', PREP
  ? ['3 tiny Opus calls and 3 tiny Kimi calls', 'The first passage twice, then the next one']
  : ['6 tiny Opus calls and 3 tiny Kimi calls', 'Ruth twice, then Jonah, for each layout']);
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

fs.writeFileSync(path.join(CACHE, PREP ? 'cache-test-prep.json' : 'cache-test.json'),
  JSON.stringify({ t: new Date().toISOString(), docs: fingerprints(), results }, null, 2));
await notify(PREP ? 'Prep caching test finished' : 'Caching test finished', results.map((r) => `${r.name} (${r.top}): ${r.verdict}, reused ` +
  `${r.reused.toLocaleString()} of ${r.expected.toLocaleString()} tokens (${r.pct}%)`));
