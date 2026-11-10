// Connection check: two small Kimi calls with the same long start, so the second should come from the cache.
// Pushes an alert when it starts and when it ends, and both calls show on the dashboard.
//
//   node scripts/dough-maker/run/check-kimi.mjs
import { notify } from './events.mjs';
import { kimi } from './kimi.mjs';

const doc = 'Papa Dorin bakes cookies and teaches Bible lessons in plain words. '.repeat(250);   // ~3K tokens
const ask = (q) => kimi({ messages: [{ role: 'system', content: doc }, { role: 'user', content: q }], maxTokens: 2000,
  step: 'check' });

await notify('Kimi check started', ['Sending 2 small test messages to Kimi', 'Through OpenRouter, Moonshot AI only']);
try {
  const a = await ask('In one short sentence, who is Papa Dorin?');
  await new Promise((r) => setTimeout(r, 3000));
  const b = await ask('In one short sentence, what does Papa Dorin bake?');
  const pct = Math.round((100 * b.tokens.cached) / b.tokens.input);
  await notify('Kimi check finished', [`Both answers came from ${b.provider}`, `Cache: ${pct}% of the 2nd message reused`,
    `Cost: $${(a.cost + b.cost).toFixed(4)}`, `Kimi said: "${b.text.slice(0, 80)}"`]);
} catch (e) {
  await notify('Kimi check failed', ['The check stopped', e.message, e.detail && `Details: ${e.detail}`], { problem: true });
  process.exit(1);
}
