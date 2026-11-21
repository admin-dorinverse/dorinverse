// A test-only helper that lets the owner chat with Papa Dorin and the weekly guest from the app before the real
// server exists. It runs on the owner's PC: the app (on the same Wi-Fi) sends each message here, and it asks Claude
// through the owner's own Claude subscription (Claude Code). The prompt is the character's notes (papa-dorin.md, or
// a file in guests/) exactly as written, and the baker's words go through unchanged; nothing is added. Claude Code
// keeps each chat as a session, so the character remembers it. The reply streams back as it is written: one JSON
// line per piece ({"text"}), then {"done", "sessionId"} or {"error"}, so the app shows words as they come.
// For the owner only: a Claude subscription is for its owner's own use and must never serve other people.
//
//   node scripts/app/papa-dorin-chat/dev-server.mjs                              # Claude Sonnet 5.5, low effort
//   node scripts/app/papa-dorin-chat/dev-server.mjs claude-sonnet-5-5 medium     # or another model and effort
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

const PORT = 8787;
const MODEL = process.argv[2] ?? 'claude-sonnet-5-5';
const EFFORT = process.argv[3] ?? 'low';
/** The longest a message may be, as in the design's text box. */
const MAX_CHARS = 600;
/** Each character's notes, their whole prompt. Only the characters listed here can be chatted with. */
const NOTES = {
  'papa-dorin': path.join(import.meta.dirname, '..', '..', 'dough-maker', 'lesson-docs', 'papa-dorin.md'),
  peter: path.join(import.meta.dirname, 'guests', 'peter.md'),
};

const npmRoot = spawnSync('npm root -g', { encoding: 'utf8', shell: true }).stdout.trim();
const EXE = path.join(npmRoot, '@anthropic-ai', 'claude-code', 'bin', process.platform === 'win32' ? 'claude.exe' : 'claude');

/**
 * Sends the baker's message to a character, in a new chat or the one `sessionId` names. Calls `onText` with each
 * piece of the reply as it is written, and resolves with the chat's session id once the reply is done. Runs from an
 * empty folder without an API key, so it uses the subscription.
 */
function askCharacter(character, message, sessionId, onText) {
  const env = { ...process.env };
  delete env.ANTHROPIC_API_KEY;
  const args = ['-p', message, '--model', MODEL, '--effort', EFFORT, '--system-prompt-file', NOTES[character], '--output-format', 'stream-json', '--verbose', '--include-partial-messages', '--tools', '', '--strict-mcp-config'];
  if (sessionId) args.push('--resume', sessionId);
  return new Promise((resolve, reject) => {
    const child = spawn(EXE, args, { cwd: os.tmpdir(), env, windowsHide: true });
    let pending = '';
    let err = '';
    let result = null;
    /** Reads one line of Claude Code's output: a piece of the reply, or the final result. */
    const line = (text) => {
      if (!text.trim()) return;
      let j;
      try {
        j = JSON.parse(text);
      } catch {
        return;
      }
      const d = j.type === 'stream_event' ? j.event?.delta : null;
      if (j.event?.type === 'content_block_delta' && d?.type === 'text_delta' && d.text) onText(d.text);
      if (j.type === 'result') result = j;
    };
    child.stdout.on('data', (chunk) => {
      pending += chunk;
      const lines = pending.split('\n');
      pending = lines.pop();
      lines.forEach(line);
    });
    child.stderr.on('data', (d) => (err += d));
    child.on('close', (code) => {
      line(pending);
      if (result && !result.is_error && result.session_id) resolve(result.session_id);
      else reject(new Error(`Claude Code didn't answer (${code}): ${result?.result ?? ''} ${err.slice(0, 300)}`));
    });
  });
}

/** Reads a request's JSON body. */
function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (d) => (body += d));
    req.on('end', () => {
      try {
        resolve(JSON.parse(body || '{}'));
      } catch (e) {
        reject(e);
      }
    });
  });
}

http
  .createServer(async (req, res) => {
    const send = (status, data) => {
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
    };
    if (req.method !== 'POST' || req.url !== '/chat') return send(404, { error: 'not found' });
    try {
      const { character = 'papa-dorin', message, sessionId } = await readBody(req);
      if (typeof character !== 'string' || !Object.hasOwn(NOTES, character)) return send(400, { error: 'no such character' });
      if (typeof message !== 'string' || !message.trim()) return send(400, { error: 'no message' });
      const started = Date.now();
      let first = 0;
      res.writeHead(200, { 'Content-Type': 'application/x-ndjson', 'Cache-Control': 'no-cache' });
      const write = (data) => res.write(`${JSON.stringify(data)}\n`);
      try {
        const id = await askCharacter(character, message.slice(0, MAX_CHARS), typeof sessionId === 'string' ? sessionId : undefined, (text) => {
          first ||= Date.now();
          write({ text });
        });
        write({ done: true, sessionId: id });
        const secs = (t) => ((t - started) / 1000).toFixed(1);
        console.log(`${character}: first words in ${secs(first || Date.now())} s, done in ${secs(Date.now())} s: ${message.slice(0, 60)}`);
      } catch (e) {
        console.error(e.message);
        write({ error: 'The kitchen is busy. Try again in a moment.' });
      }
      res.end();
    } catch (e) {
      console.error(e.message);
      if (!res.headersSent) send(400, { error: 'bad request' });
      else res.end();
    }
  })
  .listen(PORT, '0.0.0.0', () => {
    const ips = Object.values(os.networkInterfaces()).flat().filter((a) => a && a.family === 'IPv4' && !a.internal).map((a) => a.address);
    console.log(`The test chat for Papa Dorin and the weekly guest (${MODEL}, ${EFFORT} effort) is listening on port ${PORT} (${ips.join(', ')}). Keep this window open while you chat.`);
  });
