// The files the lesson run writes and the dashboard reads, all under scripts/dough-maker/run/.cache/
// (DOUGH_RUN_CACHE overrides the folder, for tests). What the dashboard shows comes from lesson-docs/models.md.
//
//   passages.json   the Passages step's output so far (passages.md "Output"), in Bible order
//   events.jsonl    one JSON object per line, appended by the run:
//     { t, type: 'run', status: 'running' | 'paused' | 'overflow' | 'stopped' | 'finished', note? }
//     { t, type: 'step', passage, step, status: 'making' | 'checking' | 'fixing' | 'done' | 'failed', model,
//       flags?: { agentFix, humanDecision, items?: [{ list: 'agent' | 'human', where, problem }] } }
//       passage is the passage id, or null for the whole-Bible steps (passages, idioms). flags come with 'done';
//       items are the flagged items in plain words (where: "stop 2, card 5"), for the dashboard's Flags tab.
//     { t, type: 'call', id, status: 'start', model: 'opus' | 'kimi', passage?, step?, role?: 'writer' | 'reviewer' | 'fixer' | 'final' }
//     { t, type: 'call', id, status: 'done' | 'error', model, passage?, step?, role?, ms, tokens?: { input, cached, output },
//       cost?, error?, detail? }
//       error is one plain sentence for the person; detail is the provider's own words.
//       input counts every input token, cached ones too. cost is dollars (Kimi only; Opus is the subscription).
//     { t, type: 'note', title, lines: [...], problem? }   plain words, one fact per line; problem: true for a stop,
//       retry or overflow switch
//   limits.json     the Claude weekly limit, from limits.mjs: { t, weekly: { pct, resetsAt, status } }   pct is the percent used
//   remote-control.json   { url, status, t }: Remote Control's link to this PC in the Claude app and its last status,
//     written by remote-control.mjs; the dashboard's "Talk to Claude" button uses it
import fs from 'node:fs';
import path from 'node:path';

export const CACHE = process.env.DOUGH_RUN_CACHE || path.join(import.meta.dirname, '.cache');
export const EVENTS = path.join(CACHE, 'events.jsonl');
export const PASSAGES = path.join(CACHE, 'passages.json');
export const LIMITS = path.join(CACHE, 'limits.json');
export const REMOTE = path.join(CACHE, 'remote-control.json');

export const TYPES = ['Narrative', 'Poetry & Wisdom', 'Letters', 'Prophetic', 'Parables', 'Sermons'];
// The steps run for every passage (README "The build order" and "Which file to load"); a lesson is done when all are
export const PASSAGE_STEPS = ['prep', 'burnt_cookies', 'big_idea', 'answer_explanations', 'definitions', 'sample_table'];
export const BOOKS = 66;

const root = path.join(import.meta.dirname, '..', '..', '..');
try { process.loadEnvFile(path.join(root, '.env.local')); } catch { /* no file: no pushes */ }

export function logEvent(event) {
  fs.mkdirSync(CACHE, { recursive: true });
  // a line cut short by a crash would swallow this event; start a fresh line instead
  const cut = fs.existsSync(EVENTS) && fs.statSync(EVENTS).size > 0 && !endsWithNewline(EVENTS);
  fs.appendFileSync(EVENTS, (cut ? '\n' : '') + JSON.stringify({ t: new Date().toISOString(), ...event }) + '\n');
}

function endsWithNewline(file) {
  const fd = fs.openSync(file, 'r'), b = Buffer.alloc(1);
  fs.readSync(fd, b, 0, 1, fs.statSync(file).size - 1);
  fs.closeSync(fd);
  return b[0] === 0x0a;
}

// A note on the dashboard and a push to the owner's phone (ntfy topic NTFY_TOPIC in .env.local).
// lines: one short fact each, like ['Cache: 99% reused', 'Cost: $0.01'].
export async function notify(title, lines, { problem = false } = {}) {
  lines = [lines].flat().filter(Boolean);
  logEvent({ type: 'note', title, lines, ...(problem && { problem }) });
  if (!process.env.NTFY_TOPIC) return;
  try {
    await fetch(`https://ntfy.sh/${process.env.NTFY_TOPIC}`, { method: 'POST',
      headers: { Title: title.replace(/[^\x20-\x7e]/g, '') }, body: lines.join('\n'), signal: AbortSignal.timeout(10_000) });
  } catch { /* the note is still on the dashboard */ }
}
