// Backs up the run's outputs to GitHub (AGENTS.md: every output is kept in git). Commits only the output folder,
// then pushes. A failure never stops the run: it goes on the dashboard, and the next save tries again.
//
//   saveToGit('Prep: 50 more passages saved')   returns true when the commit is pushed (or nothing changed)
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { OUTPUT, logEvent } from './events.mjs';

const ROOT = path.join(import.meta.dirname, '..', '..', '..');
const git = (...args) => spawnSync('git', args, { cwd: ROOT, encoding: 'utf8', windowsHide: true });

export function saveToGit(message) {
  if (process.env.DOUGH_RUN_OUTPUT) return true;   // a test run: its outputs aren't the real ones
  const folder = path.relative(ROOT, OUTPUT);
  git('add', '--', folder);
  if (git('diff', '--cached', '--quiet', '--', folder).status === 0) return true;   // nothing new
  const c = git('commit', '-m', message, '--', folder);
  if (c.status !== 0) return fail('Couldn’t save the outputs to git.', c.stderr || c.stdout);
  for (const wait of [2000, 4000, 8000, 16000]) {
    const p = git('push', 'origin', 'HEAD');
    if (p.status === 0) return true;
    if (wait === 16000) return fail('Couldn’t push the outputs to GitHub. They’re saved on the PC, and the next save tries again.', p.stderr);
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, wait);
  }
}

function fail(line, detail) {
  logEvent({ type: 'note', title: 'GitHub backup failed', lines: [line, String(detail ?? '').trim().slice(0, 200)], problem: true });
  return false;
}
