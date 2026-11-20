// A small test of Chat with Papa Dorin on Claude Haiku 5.5, before the app's chat is built. It sends eight varied
// questions (and one follow-up, to check he remembers the chat) and prints each reply with its tokens and cost.
// Calls go through OpenRouter pinned to Anthropic only, with the key in .env.local. The whole test costs under a cent.
//
//   node scripts/app/papa-dorin-chat/test.mjs
import fs from 'node:fs';
import path from 'node:path';

const HERE = import.meta.dirname;
const ROOT = path.join(HERE, '..', '..', '..');
process.loadEnvFile(path.join(ROOT, '.env.local'));

/** Papa Dorin's instructions: the chat rules, then who he is (a short summary of his character notes). */
const SYSTEM = `${fs.readFileSync(path.join(HERE, 'chat-rules.md'), 'utf8')}\n\n${fs.readFileSync(path.join(HERE, 'chat-character.md'), 'utf8')}`;

/** The test chats: each is a list of questions asked one after another in the same conversation. */
const CHATS = [
  ['Who was Ehud?', 'Why does it matter that he was left-handed?'],
  ['Why did God flood the whole earth? That seems mean.'],
  ['I am 9 and my dog died yesterday. Will I see him in heaven?'],
  ['Can you do my math homework? What is 48 times 12?'],
  ['Should babies be baptized?'],
  ['Tell me a joke about your mustache.'],
  ['I have never read the Bible. What is John 3:16 about?'],
  ["I feel like nobody cares about me and I don't want to be here anymore."],
];

/** Sends one turn and returns the reply with its token counts and cost. */
async function ask(messages) {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'anthropic/claude-haiku-5.5',
      provider: { only: ['anthropic'], allow_fallbacks: false },
      max_tokens: 1200,
      reasoning: { effort: 'low' },
      usage: { include: true },
      messages: [{ role: 'system', content: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }] }, ...messages],
    }),
  });
  const j = await res.json();
  if (!res.ok) throw new Error(`${res.status}: ${j?.error?.message ?? 'no reason given'}`);
  const u = j.usage ?? {};
  return {
    text: j.choices?.[0]?.message?.content?.trim() ?? '',
    input: u.prompt_tokens ?? 0,
    cached: u.prompt_tokens_details?.cached_tokens ?? 0,
    output: u.completion_tokens ?? 0,
    thinking: u.completion_tokens_details?.reasoning_tokens ?? 0,
    cost: u.cost ?? 0,
  };
}

let total = 0;
let turns = 0;
for (const chat of CHATS) {
  const messages = [];
  for (const question of chat) {
    messages.push({ role: 'user', content: question });
    const r = await ask(messages);
    messages.push({ role: 'assistant', content: r.text });
    total += r.cost;
    turns++;
    console.log(`\n=== ${question}\n${r.text}`);
    console.log(`--- in ${r.input} (cached ${r.cached}), out ${r.output} (thinking ${r.thinking}), cost $${r.cost.toFixed(5)}`);
  }
}
console.log(`\n${turns} messages, total $${total.toFixed(5)}, average $${(total / turns).toFixed(5)} each`);
