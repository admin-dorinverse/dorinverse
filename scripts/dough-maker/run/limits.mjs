// The owner's Claude weekly limit, for the dashboard (their plan has no 5-hour limit). Every
// `claude -p --output-format stream-json --verbose` call reports it in a rate_limit_event; the run's Opus calls pass
// theirs to saveLimits(). checkLimits() makes the smallest call there is (Haiku, one word) to read it; the dashboard
// does that only while the run is going.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { LIMITS } from './events.mjs';

const npmRoot = spawnSync('npm', ['root', '-g'], { encoding: 'utf8', shell: process.platform === 'win32' }).stdout.trim();
const EXE = path.join(npmRoot, '@anthropic-ai', 'claude-code', 'bin', process.platform === 'win32' ? 'claude.exe' : 'claude');

// rate_limit_info: { unifiedWindows: { seven_day: { utilization, resetsAt, status } }, ... }
// utilization is a fraction (0.01 = 1% used); resetsAt is in seconds
export function saveLimits(info) {
  let cur = {};
  try { cur = JSON.parse(fs.readFileSync(LIMITS, 'utf8')); } catch { /* first */ }
  const w = info.unifiedWindows?.seven_day;
  if (!w) return cur;
  const next = { ...cur, t: new Date().toISOString(), weekly: { pct: Math.round((w.utilization ?? 0) * 1000) / 10,
    resetsAt: w.resetsAt ? new Date(w.resetsAt * 1000).toISOString() : null, status: w.status } };
  fs.mkdirSync(path.dirname(LIMITS), { recursive: true });
  fs.writeFileSync(LIMITS, JSON.stringify(next, null, 2));
  return next;
}

export function limitsAge() {
  try { return Date.now() - Date.parse(JSON.parse(fs.readFileSync(LIMITS, 'utf8')).t); } catch { return Infinity; }
}

export function checkLimits() {
  // from an empty folder, so no project files load; without ANTHROPIC_API_KEY, so it can't bill the API instead
  const env = { ...process.env };
  delete env.ANTHROPIC_API_KEY;
  const args = ['-p', 'Reply with just: ok', '--model', 'claude-haiku-5-5', '--output-format', 'stream-json', '--verbose',
    '--tools', '', '--no-session-persistence', '--strict-mcp-config'];
  return new Promise((resolve) => {
    const child = spawn(EXE, args, { cwd: os.tmpdir(), env, windowsHide: true });
    let buf = '', saved = null;
    child.stdout.on('data', (d) => {
      buf += d;
      let i;
      while ((i = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, i); buf = buf.slice(i + 1);
        try {
          const e = JSON.parse(line);
          if (e.type === 'rate_limit_event') saved = saveLimits(e.rate_limit_info ?? {});
        } catch { /* not a JSON line */ }
      }
    });
    child.on('error', () => resolve(null));
    child.on('close', () => resolve(saved));
  });
}
