// Kimi K3.1 Pro through OpenRouter (key: OPENROUTER_API_KEY in .env.local). Every call goes to Moonshot AI only:
// each provider keeps its own cache, so letting OpenRouter spread calls loses the cache discount (models.md "Caching").
// Logs each call's start and end for the dashboard.
//
//   const { text, tokens, cost, cache } = await kimi({ messages, shared, passage, step, role });
//
// shared lists the named pieces at the top of the call that should come from the cache, in order: the docs, then the
// BSB text when every check of it shares it ([{ name: 'passages.md', text, kind: 'doc' }, { name: 'Ruth', text,
// kind: 'bible' }]), for the cache verdict (cachewatch.mjs). Left out, it is the system message.
import { randomUUID } from 'node:crypto';
import { logEvent } from './events.mjs';
import * as cachewatch from './cachewatch.mjs';

export const KIMI = 'moonshotai/kimi-k3.1-pro';

export async function kimi({ messages, shared = null, maxTokens = 16000, passage = null, step = null, role = null }) {
  if (!process.env.OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY is missing from .env.local');
  const call = { type: 'call', id: randomUUID(), model: 'kimi', passage, step, role };
  const watch = cachewatch.before('kimi', shared ?? [{ name: 'the instructions', text: messages.find((m) => m.role === 'system')?.content ?? '' }]);
  const started = Date.now();
  logEvent({ ...call, status: 'start' });
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: KIMI, messages,
        max_tokens: maxTokens,   // Kimi's thinking counts as output, so a small cap can leave no answer
        provider: { order: ['moonshotai'], allow_fallbacks: false },
        usage: { include: true },
      }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) throw Object.assign(new Error(plain(res.status)), { detail: `${res.status}: ${j.error?.message ?? 'no reason given'}` });
    const u = j.usage ?? {};
    const tokens = { input: u.prompt_tokens ?? 0, cached: u.prompt_tokens_details?.cached_tokens ?? 0,
      output: u.completion_tokens ?? 0 };
    const cost = u.cost ?? 0;
    const cache = await cachewatch.after(watch, tokens.cached);
    logEvent({ ...call, status: 'done', ms: Date.now() - started, tokens, cost, cache });
    return { text: j.choices?.[0]?.message?.content?.trim() ?? '', tokens, cost, cache, provider: j.provider };
  } catch (e) {
    if (!e.detail) { e.detail = e.message; e.message = 'Couldn’t reach OpenRouter. The internet may be down on the PC.'; }
    logEvent({ ...call, status: 'error', ms: Date.now() - started, error: e.message, detail: e.detail });
    throw e;
  }
}

// OpenRouter's error codes, for the person reading the dashboard
function plain(status) {
  if (status === 401) return 'OpenRouter didn’t accept the key. Check OPENROUTER_API_KEY in .env.local.';
  if (status === 402) return 'Out of OpenRouter credits, or the key hit its spending limit.';
  if (status === 429) return 'Too many requests at once. OpenRouter asked the run to slow down.';
  if (status === 408 || status >= 500) return 'OpenRouter or Moonshot AI had a problem on their end.';
  return 'OpenRouter turned the request down.';
}
