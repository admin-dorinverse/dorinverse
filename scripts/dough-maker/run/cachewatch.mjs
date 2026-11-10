// Is the cache caching? Every call names the pieces of text at its top that should come from the cache (like
// passages.md, then Ruth's BSB text). Their size is worked out from the text itself, so the dashboard can show
// "reused X of Y tokens" with Y independent of what the provider reports. Each call gets a verdict
// (models.md "Caching" rule 8):
//   reused    reused all of the text at the top (within the estimate's margin)
//   partial   reused only part of it
//   missed    sent recently, but nothing was reused: something at the top changed
//   expired   sent before, but longer ago than the cache lasts
//   first     the first time this text was sent: nothing was in the cache yet
// 3 misses in a row for one model notifies the owner; the run pauses when cacheTrouble() says so.
import { sha } from './docs.mjs';
import { notify } from './events.mjs';

export const LASTS = { opus: 60 * 60_000, kimi: 5 * 60_000 };   // Opus: measured in the caching test; Kimi: about 5 minutes
// Tokens per character, and the fixed text each provider puts before ours, measured in the caching test (Nov 2026).
// Rerun cache-test.mjs after a Claude Code or model update: it prints each estimate next to what was reused.
const PER_CHAR = { opus: { doc: 0.3565, bible: 0.385 }, kimi: { doc: 0.265, bible: 0.265 } };
const OPENING = { opus: 15, kimi: 24 };
const MARGIN = { opus: 0.05, kimi: 0.05 };   // the estimate is good to a few percent; Kimi also reuses in 256-token steps

const seen = new Map();   // model|fingerprint -> last time sent
const inARow = { opus: 0, kimi: 0 };

// pieces: [{ name, text, kind: 'doc' | 'bible' }], in the order they sit at the top of the call
export function size(model, pieces) {
  const sized = pieces.map((p) => ({ name: p.name, tokens: Math.round(p.text.length * PER_CHAR[model][p.kind ?? 'doc']) }));
  if (sized.length) sized[0].tokens += OPENING[model];
  return sized;
}

export function before(model, pieces) {
  return { model, pieces: size(model, pieces), key: `${model}|${sha(pieces.map((p) => p.text).join('\u0000'))}`, at: Date.now() };
}

export async function after({ model, pieces, key, at }, cached) {
  const expected = pieces.reduce((n, p) => n + p.tokens, 0);
  const last = seen.get(key);
  seen.set(key, at);
  let status;
  if (cached >= expected - Math.max(expected * MARGIN[model], model === 'kimi' ? 256 : 0)) status = 'reused';
  else if (cached) status = 'partial';
  else if (last == null) status = 'first';
  else if (at - last > LASTS[model]) status = 'expired';
  else status = 'missed';

  // Which pieces came from the cache: the cache reuses from the top down
  let left = cached;
  const parts = pieces.map((p) => { const got = Math.min(p.tokens, Math.max(0, left)); left -= p.tokens; return { ...p, reused: got }; });
  const cache = { status, expected, pieces: parts, ...(status === 'expired' && { minutes: Math.round((at - last) / 60_000) }) };

  if (status === 'missed') {
    if (++inARow[model] === 3) await notify('Cache problem', [`${model === 'opus' ? 'Opus' : 'Kimi'} missed the cache 3 calls in a row`,
      'Something at the top of each call is changing', 'Calls cost full price until it is fixed',
      'The run pauses here. Its work so far is saved'], { problem: true });
  } else if (status === 'reused') inARow[model] = 0;
  return cache;
}

export const cacheTrouble = (model) => inARow[model] >= 3;
