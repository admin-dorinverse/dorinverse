// Opus 5.5 on the owner's Claude subscription, through Claude Code (`claude -p`), set up so the cache works
// (models.md "Caching" and "By provider"):
//   - always the same empty folder, so no project files, folder names or git details are added
//   - no tools, MCP servers, skills or user and project settings, so nothing they add can change
//   - `system` goes in as the system prompt (from a file: it can be longer than a command line), `prompt` as the message
//   - no ANTHROPIC_API_KEY, so the call can't fall back to API billing
// Logs each call's start and end for the dashboard, and passes the weekly limit Claude reports to limits.mjs.
//
//   const { text, tokens, usage } = await opus({ system, prompt, passage, step, role });
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { CACHE, logEvent } from './events.mjs';
import { saveLimits } from './limits.mjs';

export const OPUS = 'claude-opus-5-5';
const npmRoot = spawnSync('npm root -g', { encoding: 'utf8', shell: true }).stdout.trim();
const EXE = path.join(npmRoot, '@anthropic-ai', 'claude-code', 'bin', process.platform === 'win32' ? 'claude.exe' : 'claude');
// A fixed name, never a random one: if the folder's name ever reaches the call, it must be the same every time
const EMPTY = path.join(os.tmpdir(), 'dough-run-opus');
const PROMPTS = path.join(CACHE, 'opus-prompts');

export class LimitError extends Error {
  constructor(msg, resetsAt) { super(msg); this.resetsAt = resetsAt; }
}

export function opus({ system, prompt, passage = null, step = null, role = null, effort = 'medium' }) {
  fs.mkdirSync(EMPTY, { recursive: true });
  fs.mkdirSync(PROMPTS, { recursive: true });
  const id = randomUUID();
  const systemFile = path.join(PROMPTS, `${id}.txt`);
  fs.writeFileSync(systemFile, system);
  const args = ['-p', '--model', OPUS, '--effort', effort, '--system-prompt-file', systemFile,
    '--output-format', 'stream-json', '--verbose', '--tools', '', '--strict-mcp-config', '--disable-slash-commands',
    '--setting-sources', 'project', '--no-session-persistence'];
  const env = { ...process.env };
  delete env.ANTHROPIC_API_KEY;
  const call = { type: 'call', id, model: 'opus', passage, step, role };
  const started = Date.now();
  logEvent({ ...call, status: 'start' });

  return new Promise((resolve, reject) => {
    const child = spawn(EXE, args, { cwd: EMPTY, env, windowsHide: true });
    let buf = '', err = '', result = null, limited = null;
    child.stdout.on('data', (d) => {
      buf += d;
      let i;
      while ((i = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, i); buf = buf.slice(i + 1);
        let e; try { e = JSON.parse(line); } catch { continue; }
        if (e.type === 'rate_limit_event') {
          saveLimits(e.rate_limit_info ?? {});
          if (e.rate_limit_info?.status === 'rejected') limited = e.rate_limit_info;
        } else if (e.type === 'result') result = e;
      }
    });
    child.stderr.on('data', (d) => { err += d; });
    child.stdin.end(prompt);
    const fail = (error, detail) => {
      logEvent({ ...call, status: 'error', ms: Date.now() - started, error: error.message, detail });
      reject(error);
    };
    child.on('error', (e) => fail(new Error('Couldn’t start Claude Code on the PC.'), e.message));
    child.on('close', (code) => {
      fs.rmSync(systemFile, { force: true });
      const resetsAt = limited?.resetsAt ? new Date(limited.resetsAt * 1000).toISOString() : null;
      if (limited) return fail(new LimitError('Opus hit the weekly limit.', resetsAt), null);
      if (!result) return fail(new Error('Opus gave no answer.'), `exit ${code}: ${(err || buf).slice(0, 500)}`);
      if (result.is_error) return fail(new Error('Opus returned an error.'), String(result.result ?? '').slice(0, 500));
      const u = result.usage ?? {};
      const tokens = { input: (u.input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0),
        cached: u.cache_read_input_tokens ?? 0, output: u.output_tokens ?? 0 };
      logEvent({ ...call, status: 'done', ms: Date.now() - started, tokens });
      resolve({ text: String(result.result ?? '').trim(), tokens, usage: u });
    });
  });
}
