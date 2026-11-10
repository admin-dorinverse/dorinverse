// Stop hook: push to the owner's phone (ntfy) only when Claude's last message asks the owner something.
// A turn that just reports, or that Claude ended on its own while work runs in the background, sends nothing.
// The topic is NTFY_TOPIC in .env.local (git-ignored): anyone who knows it can read and send these pushes.
import fs from 'node:fs';
import path from 'node:path';

try { process.loadEnvFile(path.join(import.meta.dirname, '..', '..', '.env.local')); } catch { /* no file: no push */ }
const TOPIC = process.env.NTFY_TOPIC;

let input = '';
process.stdin.on('data', (d) => { input += d; });
process.stdin.on('end', async () => {
  let text = '';
  try {
    const h = JSON.parse(input);
    text = h.last_assistant_message ?? '';
    if (!text && h.transcript_path && fs.existsSync(h.transcript_path)) {
      const lines = fs.readFileSync(h.transcript_path, 'utf8').trim().split('\n').reverse();
      for (const l of lines) {
        const e = JSON.parse(l);
        if (e.type !== 'assistant') continue;
        const parts = (e.message?.content ?? []).filter((c) => c.type === 'text').map((c) => c.text);
        if (parts.length) { text = parts.join('\n'); break; }
      }
    }
  } catch { return; }
  if (!TOPIC) return;
  // the last paragraph is where a question to the owner sits
  const last = text.trim().split(/\n\s*\n/).slice(-2).join(' ');
  if (!/\?\s*(\*\*)?\s*$|\?\s*\S{0,40}$|\byes or no\b/i.test(last)) return;
  const q = last.replace(/[*_`#>]/g, '').replace(/\s+/g, ' ').trim().slice(-300);
  try {
    await fetch(`https://ntfy.sh/${TOPIC}`, { method: 'POST', headers: { Title: 'Claude needs your answer' },
      body: q, signal: AbortSignal.timeout(10_000) });
  } catch { /* nothing to do */ }
});
