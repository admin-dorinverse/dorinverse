// Keeps `claude remote-control --name Dorinverse` running in the background, so the owner can start a Claude chat on
// this PC from the Claude app (the dashboard's "Talk to Claude" button). Its screen output redraws every few seconds,
// so instead of saving all of it this keeps only the latest link and status in remote-control.json.
// If it stops, it starts again a minute later.
//
//   node scripts/dough-maker/run/remote-control.mjs
//
// The first run ever has to be in a real terminal (`claude remote-control`) to answer its yes/no questions.
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { CACHE, REMOTE } from './events.mjs';

const root = path.join(import.meta.dirname, '..', '..', '..');
// The real program, not the npm .cmd shim, so it can be stopped cleanly
const npmRoot = spawnSync('npm', ['root', '-g'], { encoding: 'utf8', shell: process.platform === 'win32' }).stdout.trim();
const EXE = process.platform === 'win32' ? path.join(npmRoot, '@anthropic-ai', 'claude-code', 'bin', 'claude.exe') : 'claude';

let state = { url: null, status: 'Starting', t: null };
function save(next) {
  if (next.url === state.url && next.status === state.status) return;
  state = { ...next, t: new Date().toISOString() };
  fs.mkdirSync(CACHE, { recursive: true });
  fs.writeFileSync(REMOTE, JSON.stringify(state, null, 2));
}

function start() {
  const child = spawn(EXE, ['remote-control', '--name', 'Dorinverse'], { cwd: root, windowsHide: true });
  let tail = '';
  const read = (d) => {
    tail = (tail + d).slice(-8192);
    // drop the screen's color and link codes before reading it
    const text = tail.replace(/\x1b\[[0-9;]*[A-Za-z]|\x1b\]8;;[^\x07\x1b]*(\x07|\x1b\\)?/g, '');
    const url = [...text.matchAll(/https:\/\/claude\.ai\/code\?environment=[\w-]+/g)].at(-1)?.[0] ?? state.url;
    const status = [...text.matchAll(/(Connected|Reconnecting|Disconnected|Connecting)/g)].at(-1)?.[1] ?? state.status;
    save({ url, status });
  };
  child.stdout.on('data', read);
  child.stderr.on('data', read);
  child.on('exit', (code) => {
    save({ url: state.url, status: `Stopped (code ${code}), restarting in a minute` });
    setTimeout(start, 60_000);
  });
}

save({ url: null, status: 'Starting' });
start();
