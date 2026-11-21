// A test-only helper that lets the owner chat with Papa Dorin and the weekly guest from the app before the real
// server exists. It runs on the owner's PC: the app (on the same Wi-Fi) sends each message here, and it asks Claude
// through the owner's own Claude subscription (Claude Code). The prompt is the character's notes (papa-dorin.md, or
// a file in guests/) exactly as written, and the baker's words go through unchanged; nothing is added. Claude Code
// keeps each chat as a session, so the character remembers it.
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
 * Sends the baker's message to a character, in a new chat or the one `sessionId` names, and returns the reply and
 * the chat's session id. Runs from an empty folder without an API key, so it uses the subscription.
 */
function askCharacter(character, message, sessionId) {
  const env = { ...process.env };
  delete env.ANTHROPIC_API_KEY;
  const args = ['-p', message, '--model', MODEL, '--effort', EFFORT, '--system-prompt-file', NOTES[character], '--output-format', 'json', '--tools', '', '--strict-mcp-config'];
  if (sessionId) args.push('--resume', sessionId);
  return new Promise((resolve, reject) => {
    const child = spawn(EXE, args, { cwd: os.tmpdir(), env, windowsHide: true });
    let out = '';
    let err = '';
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (err += d));
    child.on('close', (code) => {
      try {
        const j = JSON.parse(out);
        if (j.is_error || !j.result) throw new Error(j.result || 'no reply');
        resolve({ reply: String(j.result).trim(), sessionId: j.session_id });
      } catch (e) {
        reject(new Error(`Claude Code didn't answer (${code}): ${e.message} ${err.slice(0, 300)}`));
      }
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
      const answer = await askCharacter(character, message.slice(0, MAX_CHARS), typeof sessionId === 'string' ? sessionId : undefined);
      console.log(`${character} answered in ${((Date.now() - started) / 1000).toFixed(1)} s: ${message.slice(0, 60)}`);
      send(200, answer);
    } catch (e) {
      console.error(e.message);
      send(500, { error: 'The kitchen is busy. Try again in a moment.' });
    }
  })
  .listen(PORT, '0.0.0.0', () => {
    const ips = Object.values(os.networkInterfaces()).flat().filter((a) => a && a.family === 'IPv4' && !a.internal).map((a) => a.address);
    console.log(`The test chat for Papa Dorin and the weekly guest (${MODEL}, ${EFFORT} effort) is listening on port ${PORT} (${ips.join(', ')}). Keep this window open while you chat.`);
  });
