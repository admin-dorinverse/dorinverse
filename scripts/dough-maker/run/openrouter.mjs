// OpenRouter calls for the answer-explanations run: one call now (chat), or many at half price (batch, results
// within 24 hours, usually minutes). Every call is pinned to the model's own company (owner's rule): Anthropic for
// Claude. The docs go in a cached system block, so each call reuses them at the cached price.
//
//   const r = await chat({ model, only, system, user, reasoning, passage, step, role });   // { text, cost, tokens }
//   const id = await submitBatch({ model, only, items: [{ id, system, user, reasoning }] });
//   const done = await waitBatch(id);   // { status, results: Map(id -> { text, error }), cost }
import { randomUUID } from 'node:crypto';
import { logEvent } from './events.mjs';

const API = 'https://openrouter.ai/api/v1';
const headers = () => ({ Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' });
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

export const SONNET_OR = { model: 'anthropic/claude-sonnet-5.5', only: ['anthropic'], name: 'sonnet' };
export const OPUS_OR = { model: 'anthropic/claude-opus-5.5', only: ['anthropic'], name: 'opus' };

function body({ system, user, reasoning, maxTokens = 16000 }) {
  const b = { max_tokens: maxTokens, usage: { include: true },
    messages: [{ role: 'system', content: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }] }, { role: 'user', content: user }] };
  if (reasoning) b.reasoning = reasoning;
  return b;
}
const plain = (status, j) => {
  const e = Object.assign(new Error(status === 402 ? 'Out of OpenRouter credits, or the key hit its spending limit.'
    : status === 429 ? 'Too many requests at once.' : status >= 500 || status === 408 ? 'OpenRouter or Anthropic had a problem on their end.'
    : 'OpenRouter turned the request down.'), { detail: `${status}: ${j?.error?.message ?? 'no reason given'}` });
  return e;
};

export async function chat({ model, only, name, system, user, reasoning, maxTokens, passage = null, step = null, role = null }) {
  const id = randomUUID(), started = Date.now();
  logEvent({ type: 'call', id, model: name, passage, step, role, status: 'start' });
  try {
    const res = await fetch(`${API}/chat/completions`, { method: 'POST', headers: headers(),
      body: JSON.stringify({ model, provider: { only, allow_fallbacks: false }, ...body({ system, user, reasoning, maxTokens }) }) });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) throw plain(res.status, j);
    const u = j.usage ?? {};
    const tokens = { input: u.prompt_tokens ?? 0, cached: u.prompt_tokens_details?.cached_tokens ?? 0, output: u.completion_tokens ?? 0 };
    logEvent({ type: 'call', id, model: name, passage, step, role, status: 'done', ms: Date.now() - started, tokens, cost: u.cost ?? 0 });
    return { text: j.choices?.[0]?.message?.content?.trim() ?? '', cost: u.cost ?? 0, tokens };
  } catch (e) {
    if (!e.detail) { e.detail = e.message; e.message = 'Couldn’t reach OpenRouter. The internet may be down on the PC.'; }
    logEvent({ type: 'call', id, model: name, passage, step, role, status: 'error', error: e.message, detail: e.detail });
    throw e;
  }
}

export async function submitBatch({ model, only, items }) {
  for (;;) {
    const res = await fetch(`${API}/batches`, { method: 'POST', headers: headers(), body: JSON.stringify({
      endpoint: '/v1/chat/completions', model, provider: { only, allow_fallbacks: false },
      requests: items.map((it) => ({ custom_id: String(it.id), body: body(it) })) }) });
    const j = await res.json().catch(() => ({}));
    if (res.status === 202 || res.ok) return j.id;
    if (res.status === 429) { await sleep(120_000); continue; }
    throw plain(res.status, j);
  }
}

const FINAL = new Set(['completed', 'failed', 'expired', 'cancelled']);
export async function waitBatch(id, { onPoll } = {}) {
  const since = Date.now();
  for (;;) {
    let res;
    try { res = await fetch(`${API}/batches/${id}`, { headers: headers() }); } catch { await sleep(60_000); continue; }
    if (res.ok) {
      const b = await res.json();
      onPoll?.(b);
      if (FINAL.has(b.status) && (b.status !== 'completed' || b.results !== null)) {
        const results = new Map();
        for (const r of b.results ?? []) {
          const text = r.response?.choices?.[0]?.message?.content?.trim() ?? r.response?.body?.choices?.[0]?.message?.content?.trim() ?? null;
          results.set(r.custom_id, { text, error: r.error ? (r.error.message ?? JSON.stringify(r.error)) : (text ? null : 'no answer') });
        }
        return { status: b.status, results, cost: b.usage?.cost ?? 0, provider: b.provider, error: b.error?.message };
      }
    } else if (res.status === 404 && Date.now() - since < 15 * 60_000) {
      // a new batch can take a little while to show up
    } else if (res.status !== 429 && res.status < 500) {
      throw plain(res.status, await res.json().catch(() => null));
    }
    await sleep(res.status === 429 ? 120_000 : res.status === 404 ? 20_000 : 60_000);
  }
}
