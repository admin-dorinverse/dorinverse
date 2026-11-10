// Lesson run dashboard: Passages progress, lessons by passage type, what's running, flags, Opus and Kimi usage,
// and the run's notes. Reads the run's files (see events.mjs) and writes nothing. What it shows: models.md
// "Keeping the person updated".
//
//   node scripts/dough-maker/run/dashboard.mjs [--port 4180]
//
// Listens on localhost and on this machine's Tailscale address only, so the phone reaches it over
// Tailscale (http://<machine>:4180) and nothing else on the network can.
import http from 'node:http';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { checkLimits, limitsAge } from './limits.mjs';
import { BOOKS, CACHE, EVENTS, LIMITS, PASSAGES, PASSAGE_STEPS, REMOTE, TYPES } from './events.mjs';

const PORT = Number(process.argv[process.argv.indexOf('--port') + 1] || 0) || 4180;
const NOTES = 100;
const LOG_SIZE = 300;
// An open page reloads itself when this changes, so a restarted dashboard never leaves the phone on an old layout
const VERSION = String(Date.now());

// --- event log, folded incrementally ------------------------------------------------------------

let s;
function reset() {
  s = { offset: 0, partial: Buffer.alloc(0), run: null, lastAt: null, steps: new Map(), stepStart: new Map(),
    calls: new Map(), log: [], notes: [], usage: { opus: usage(), kimi: usage() } };
}
reset();

function usage() {
  // due: tokens that should have come from the cache (calls whose text was there to reuse); got: how many did
  return { calls: 0, input: 0, cached: 0, output: 0, cost: 0, due: 0, got: 0,
    cache: { reused: 0, first: 0, expired: 0, missed: 0, partial: 0 }, missedInARow: 0 };
}

function refresh() {
  if (!fs.existsSync(EVENTS)) { if (s.offset) reset(); return; }
  const size = fs.statSync(EVENTS).size;
  if (size < s.offset) reset();   // the log was replaced
  if (size === s.offset) return;
  const fd = fs.openSync(EVENTS, 'r');
  const buf = Buffer.alloc(size - s.offset);
  fs.readSync(fd, buf, 0, buf.length, s.offset);
  fs.closeSync(fd);
  s.offset = size;
  // only whole lines; a line still being written waits for the next read
  const all = Buffer.concat([s.partial, buf]);
  const end = all.lastIndexOf(0x0a) + 1;
  s.partial = all.subarray(end);
  for (const line of all.subarray(0, end).toString('utf8').split('\n')) {
    if (!line.trim()) continue;
    try { apply(JSON.parse(line)); } catch { /* a bad line is skipped, not fatal */ }
  }
}

function apply(e) {
  s.lastAt = e.t;
  if (e.type === 'run') s.run = e;
  else if (e.type === 'step') {
    // a step runs from its first 'making' (or checking, fixing) until 'done' or 'failed'
    const key = `${e.passage ?? ''}|${e.step}`;
    if (!s.stepStart.has(key)) s.stepStart.set(key, e.t);
    e = { ...e, startedAt: s.stepStart.get(key) };
    if (e.status === 'done' || e.status === 'failed') {
      e.ms = Date.parse(e.t) - Date.parse(e.startedAt);
      s.stepStart.delete(key);
    }
    s.steps.set(key, e);
    addLog(e);
  }
  else if (e.type === 'note') {
    // early notes were one "Title: text" string
    if (!e.title) { const [title, ...rest] = String(e.text ?? '').split(': '); e = { ...e, title, lines: [rest.join(': ')] }; }
    s.notes.push(e);
    if (s.notes.length > NOTES) s.notes.shift();
  }
  else if (e.type === 'call') {
    if (e.status === 'start') return void s.calls.set(e.id, { ...e, startedAt: e.t });
    const start = s.calls.get(e.id);
    s.calls.delete(e.id);
    addLog({ ...e, status: e.status ?? 'done', ms: e.ms ?? (start && Date.parse(e.t) - Date.parse(start.t)) });
    const u = s.usage[e.model];
    if (!u || !e.tokens) return;
    u.calls++;
    for (const k of ['input', 'cached', 'output']) u[k] += e.tokens[k] || 0;
    u.cost += e.cost || 0;
    const v = e.cache?.status;
    if (v in u.cache) u.cache[v]++;
    if (['reused', 'partial', 'missed'].includes(v)) {
      u.due += e.cache.expected;
      u.got += Math.min(e.tokens.cached, e.cache.expected);
    }
    if (v === 'missed') u.missedInARow++;
    else if (v === 'reused') u.missedInARow = 0;
  }
}

function addLog(e) {
  s.log.push(e);
  if (s.log.length > LOG_SIZE) s.log.shift();
}

let passageCache = { mtime: 0, list: [] };
function readPassages() {
  try {
    const mtime = fs.statSync(PASSAGES).mtimeMs;
    if (mtime !== passageCache.mtime) passageCache = { mtime, list: JSON.parse(fs.readFileSync(PASSAGES, 'utf8')) };
  } catch { /* not made yet, or caught mid-write: keep the last good read */ }
  return passageCache.list;
}

// Remote Control's link to this PC in the Claude app, and whether it last said Connected (remote-control.mjs)
function remote() {
  try {
    const r = JSON.parse(fs.readFileSync(REMOTE, 'utf8'));
    return { url: r.url, connected: r.status === 'Connected' };
  } catch { return { url: null, connected: false }; }
}

const book = (ref) => String(ref ?? '').replace(/\s+\d+:\d+.*$/, '');
// "Isaiah 55:1–13", "Luke 6:17–7:1", "Ruth 4:18–Matthew 1:1"
function range(p) {
  if (book(p.start) !== book(p.end)) return `${p.start}–${p.end}`;
  const [c1] = p.start.slice(book(p.start).length).trim().split(':'), [c2, v2] = p.end.slice(book(p.end).length).trim().split(':');
  return `${p.start}–${c1 === c2 ? v2 : `${c2}:${v2}`}`;
}

function snapshot() {
  refresh();
  const list = readPassages();
  const byId = new Map(list.map((p) => [p.id, p]));
  const step = (passage, name) => s.steps.get(`${passage ?? ''}|${name}`);

  const types = Object.fromEntries(TYPES.map((t) => [t, { total: 0, done: 0, going: 0, failed: 0, flagged: 0 }]));
  const steps = Object.fromEntries(PASSAGE_STEPS.map((x) => [x, 0]));
  let done = 0;
  for (const p of list) {
    const t = types[p.type];
    if (!t) continue;
    t.total++;
    const st = PASSAGE_STEPS.map((x) => step(p.id, x));
    st.forEach((e, i) => { if (e?.status === 'done') steps[PASSAGE_STEPS[i]]++; });
    if (st.every((e) => e?.status === 'done')) { t.done++; done++; }
    else if (st.some((e) => e?.status === 'failed')) t.failed++;
    else if (st.some((e) => e)) t.going++;
    if (st.some((e) => e?.flags?.agentFix || e?.flags?.humanDecision)) t.flagged++;
  }

  const label = (passage) => {
    const p = byId.get(passage);
    return p ? `${p.title} (${range(p)})` : passage == null ? null : `Passage ${passage}`;
  };
  const flags = { agentFix: 0, humanDecision: 0 };
  // Working now: every model call in flight, plus any step in progress with no call in flight (a script check)
  const working = [...s.calls.values()].map((e) => ({ ...e, kind: 'call', label: label(e.passage) }));
  const busy = new Set(working.map((e) => `${e.passage ?? ''}|${e.step}`));
  for (const [key, e] of s.steps) {
    flags.agentFix += e.flags?.agentFix || 0;
    flags.humanDecision += e.flags?.humanDecision || 0;
    if (['making', 'checking', 'fixing'].includes(e.status) && !busy.has(key))
      working.push({ ...e, kind: 'step', label: label(e.passage) ?? 'Whole Bible' });
  }

  let limits = null;
  try { limits = JSON.parse(fs.readFileSync(LIMITS, 'utf8')); } catch { /* not known yet */ }
  return {
    version: VERSION, now: new Date().toISOString(), run: s.run, lastAt: s.lastAt, remote: remote(),
    passages: { status: step(null, 'passages')?.status ?? null, count: list.length,
      books: new Set(list.flatMap((p) => [book(p.start), book(p.end)])).size, of: BOOKS,
      byType: Object.fromEntries(TYPES.map((t) => [t, types[t].total])) },
    lessons: { total: list.length, done, steps, types, idioms: step(null, 'idioms')?.status ?? null },
    working: working.sort((a, b) => a.startedAt.localeCompare(b.startedAt)), flags, usage: s.usage, limits,
    flagged: [...s.steps.values()].filter((e) => e.flags?.agentFix || e.flags?.humanDecision)
      .sort((a, b) => b.t.localeCompare(a.t)).map((e) => ({ ...e, label: label(e.passage) ?? 'Whole Bible' })),
    log: s.log.slice().reverse().map((e) => ({ ...e, label: label(e.passage) })),
    notes: s.notes.slice().reverse(),
  };
}

// --- server ------------------------------------------------------------------------------------

function handle(req, res) {
  const url = req.url.split('?')[0];
  if (req.method === 'GET' && url === '/') return send(res, 200, 'text/html; charset=utf-8', PAGE);
  if (req.method === 'GET' && url === '/api/state') return send(res, 200, 'application/json', JSON.stringify(snapshot()));
  send(res, 404, 'text/plain', 'Not found');
}

function send(res, status, type, body) {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(body);
}

// Both of Tailscale's addresses: the machine name gives the phone both, and an iPhone tries IPv6 first, so
// listening on IPv4 only made it wait for the IPv6 try to fail before every load
const ts = spawnSync('tailscale', ['ip'], { encoding: 'utf8' });
const tailscaleIps = ts.status === 0 ? ts.stdout.trim().split(/\s+/) : [];
const dns = spawnSync('tailscale', ['status', '--json'], { encoding: 'utf8' });
const hostName = dns.status === 0 ? JSON.parse(dns.stdout).Self?.DNSName?.replace(/\.$/, '') : null;

// DASH_TRACE=1 logs each request's arrival and time taken to .cache/requests.log, to see where a slow load waits
const trace = process.env.DASH_TRACE === '1' ? (req, ms) => fs.appendFileSync(path.join(CACHE, 'requests.log'),
  `${new Date().toISOString()} ${req.socket.remoteAddress} ${req.url} ${ms}ms\n`) : null;
const serve = (req, res) => {
  const t0 = Date.now();
  if (trace) res.on('finish', () => trace(req, Date.now() - t0));
  handle(req, res);
};

for (const host of ['127.0.0.1', ...tailscaleIps]) {
  http.createServer(serve).listen(PORT, host, () => console.log(`dashboard on http://${host.includes(':') ? `[${host}]` : host}:${PORT}`));
}
// The weekly limit only comes with a Claude call. Only while the run is going: one tiny Haiku call when it starts,
// then every 10 minutes, skipped whenever the run's own Opus calls have kept limits.json fresh. Nothing while idle.
const LIMITS_EVERY = 10 * 60_000;
setInterval(() => {
  refresh();
  if (['running', 'overflow'].includes(s.run?.status) && limitsAge() > LIMITS_EVERY) checkLimits();
}, 60_000);

if (hostName) console.log(`phone (over Tailscale): http://${hostName}:${PORT}`);
else console.log('Tailscale not running: only this machine can open the dashboard');

// --- page --------------------------------------------------------------------------------------

const PAGE = String.raw`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="theme-color" content="#f6f5f2" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#121212" media="(prefers-color-scheme: dark)">
<title>Lesson run</title>
<style>
  :root { --bg: #f6f5f2; --card: #fff; --text: #1d1d1f; --muted: #6e6e73; --line: #e3e1dc;
    --green: #1f8a4c; --amber: #b26a00; --red: #c0362c; --blue: #2b62d9; --bar: #ebe9e4; }
  @media (prefers-color-scheme: dark) {
    :root { --bg: #121212; --card: #1e1e1f; --text: #f2f2f2; --muted: #9a9aa0; --line: #2f2f31;
      --green: #4cc27e; --amber: #f0a43a; --red: #ff6b5e; --blue: #7ea6ff; --bar: #2c2c2e; }
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--text); font: 16px/1.45 -apple-system, system-ui, "Segoe UI", sans-serif; }
  main { max-width: 760px; margin: 0 auto; padding: 16px; padding-top: 64px; }
  header { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 4px; }
  h1 { font-size: 22px; margin: 0; }
  /* The home-screen app has no browser reload, so the page carries its own */
  .head-right { display: flex; align-items: center; gap: 8px; min-width: 0; }
  .reload { flex: none; font: inherit; font-size: 14px; font-weight: 600; color: var(--blue); background: var(--bar); border: 0;
    border-radius: 999px; padding: 5px 12px; cursor: pointer; }
  h2 { font-size: 15px; text-transform: uppercase; letter-spacing: .04em; color: var(--muted); margin: 0 0 10px; }
  h3 { font-size: 16px; margin: 0; }
  section { background: var(--card); border: 1px solid var(--line); border-radius: 14px; padding: 14px 16px; margin: 12px 0; }
  .pill { font-size: 14px; font-weight: 600; padding: 4px 10px; border-radius: 999px; white-space: nowrap; border: 1px solid currentColor; }
  .running, .finished { color: var(--green); } .paused, .overflow { color: var(--amber); } .stopped { color: var(--red); } .idle { color: var(--muted); }
  .sub { color: var(--muted); font-size: 14px; }
  .big { font-size: 28px; font-weight: 700; }
  .bar { height: 8px; background: var(--bar); border-radius: 4px; overflow: hidden; display: flex; margin: 8px 0; }
  .bar i { display: block; height: 100%; }
  .bar .d { background: var(--green); } .bar .a { background: var(--blue); } .bar .f { background: var(--red); }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
  .chip { font-size: 13px; background: var(--bar); border-radius: 999px; padding: 3px 10px; }
  .chip b { font-variant-numeric: tabular-nums; }
  .row { display: flex; justify-content: space-between; gap: 12px; padding: 6px 0; border-top: 1px solid var(--line); font-size: 15px; }
  .row:first-child { border-top: 0; }
  .num { font-variant-numeric: tabular-nums; color: var(--muted); font-size: 14px; white-space: nowrap; }
  .types { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px; }
  .type { border: 1px solid var(--line); border-radius: 10px; padding: 12px; }
  .type .big { font-size: 22px; }
  .two { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px; }
  .stat { border: 1px solid var(--line); border-radius: 10px; padding: 12px; }
  .entry { padding: 10px 0; border-top: 1px solid var(--line); }
  .entry:first-child { border-top: 0; }
  .meta { font-size: 13px; color: var(--muted); display: flex; flex-wrap: wrap; gap: 4px 10px; }
  .problem { color: var(--red); font-weight: 600; }
  .good { color: var(--green); font-weight: 600; }
  .warn { color: var(--amber); font-weight: 600; }
  .empty { color: var(--muted); }
  .tag { font-weight: 600; }
  .tag.done { color: var(--green); } .tag.error, .tag.failed { color: var(--red); } .tag.making, .tag.checking, .tag.fixing { color: var(--blue); }
  .live { display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: var(--green); margin-right: 6px;
    animation: pulse 1.6s ease-in-out infinite; }
  @keyframes pulse { 50% { opacity: .3; } }
  .note-title { font-weight: 600; }
  .note-title.problem { color: var(--red); }
  .note ul { margin: 4px 0 0; padding-left: 20px; }
  .note li { margin: 2px 0; }
  .tabs { position: sticky; top: 0; z-index: 1; display: flex; gap: 4px; background: var(--bar); border-radius: 12px; padding: 4px;
    margin: 12px 0; box-shadow: 0 0 0 8px var(--bg); }
  .tabs a { flex: 1; text-align: center; padding: 8px 4px; border-radius: 9px; color: var(--muted); font-weight: 600;
    text-decoration: none; font-size: 15px; }
  .tabs a.on { background: var(--card); color: var(--text); box-shadow: 0 1px 2px rgba(0,0,0,.12); }
  .badge { display: inline-block; min-width: 20px; padding: 0 6px; border-radius: 999px; background: var(--amber); color: #fff;
    font-size: 12px; line-height: 20px; margin-left: 4px; }
  .pager { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding-top: 10px;
    border-top: 1px solid var(--line); margin-top: 4px; }
  .pager button { font: inherit; font-size: 14px; font-weight: 600; color: var(--blue); background: var(--bar); border: 0;
    border-radius: 8px; padding: 8px 14px; }
  .pager button:disabled { color: var(--muted); opacity: .5; }
  .item { border-left: 3px solid var(--line); padding-left: 10px; margin-top: 6px; }
  .item.human { border-color: var(--amber); } .item.agent { border-color: var(--blue); }
  .talk-row { display: flex; align-items: center; gap: 12px; margin-top: 12px; }
  .talk { flex: none; font-weight: 600; color: #fff; background: var(--blue); border-radius: 10px; padding: 10px 16px;
    text-decoration: none; }
  .talk.off { background: var(--bar); color: var(--muted); pointer-events: none; }
  .dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: var(--muted); margin-right: 6px; }
  .dot.on { background: var(--green); } .dot.down { background: var(--red); }
  .down-banner { background: var(--red); color: #fff; border-radius: 10px; padding: 10px 14px; margin-top: 12px; font-weight: 600; }
  .down-banner span { display: block; font-weight: 400; font-size: 14px; }
  body.down [data-tab] { opacity: .45; }
  .facts { display: grid; grid-template-columns: max-content 1fr; gap: 2px 12px; margin: 6px 0 0; font-size: 14px; }
  .facts dt { color: var(--muted); }
  .facts dd { margin: 0; overflow-wrap: anywhere; }
  .facts dd.problem { font-weight: 500; }
</style>
</head>
<body>
<main>
  <header><h1>Lesson run</h1><div class="head-right"><span id="pill" class="pill idle">Loading…</span>
    <button class="reload" type="button" onclick="location.reload()">↻ Refresh</button></div></header>
  <div id="status" class="sub"></div>
  <div id="down" class="down-banner" hidden></div>
  <div class="talk-row"><a id="talk" class="talk" href="https://claude.ai/code" target="_blank" rel="noopener">Talk to Claude</a>
    <span id="talk-status" class="sub"></span></div>
  <nav class="tabs"><a href="#overview">Overview</a><a href="#logs">Logs</a><a href="#flags">Flags<span id="flag-badge"></span></a></nav>
  <div data-tab="overview">
    <section><h2>Working now</h2><div id="now"></div></section>
    <section><h2>Usage</h2><div id="usage" class="two"></div><div id="cache" class="sub" style="margin-top:10px"></div></section>
    <section><h2>Updates</h2><div id="notes"></div></section>
    <section><h2>Passages</h2><div id="passages"></div></section>
    <section><h2>Lessons</h2><div id="lessons"></div></section>
    <section><h2>Lessons by passage type</h2><div id="types" class="types"></div></section>
  </div>
  <div data-tab="logs" hidden>
    <section><h2>Log</h2><div id="log"></div></section>
  </div>
  <div data-tab="flags" hidden>
    <section><h2>Flags so far</h2><div id="flag-totals" class="two"></div></section>
    <section><h2>Flagged steps</h2><div id="flag-list"></div></section>
  </div>
</main>
<script>
const STEPS = { passages: 'Passages', prep: 'Prep walkthrough', burnt_cookies: 'Burnt Cookies', big_idea: 'The Big Idea',
  answer_explanations: 'Answer explanations', definitions: 'Definitions', sample_table: 'Sample Table', idioms: 'Idioms',
  check: 'the connection check', cache_test: 'the caching test' };
const DOING = { making: 'writing', checking: 'checking', fixing: 'fixing' };
const ROLES = { writer: 'writing', reviewer: 'checking', fixer: 'fixing', final: 'doing the final check of' };
const DID = { writer: 'wrote', reviewer: 'checked', fixer: 'fixed', final: 'did the final check of' };
const STATUS = { making: 'Being written', checking: 'Being checked', fixing: 'Being fixed', done: 'Done', failed: 'Stopped' };
const MODELS = { opus: 'Opus', kimi: 'Kimi', script: 'A script' };
const esc = (x) => String(x ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const n = (x) => Number(x || 0).toLocaleString();
const money = (x) => '$' + Number(x || 0).toFixed(x >= 1 ? 2 : 4);
const pct = (a, b) => b ? Math.round(100 * a / b) + '%' : '—';
// "Nov 9, 6:55 PM"
function when(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ', ' + d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}
function took(ms) {
  const sec = Math.round(ms / 1000);
  const min = Math.floor(sec / 60);
  return sec < 60 ? sec + ' sec' : min < 60 ? min + ' min' + (sec % 60 ? ' ' + (sec % 60) + ' sec' : '')
    : Math.floor(min / 60) + ' h' + (min % 60 ? ' ' + (min % 60) + ' min' : '');
}
const what = (e) => esc(STEPS[e.step] || e.step || 'a job');
const model = (e) => '<b>' + esc(MODELS[e.model] || e.model || 'The run') + '</b>';
const plural = (x, one, many) => n(x) + ' ' + (x === 1 ? one : many);
function flagText(f) {
  if (!f || !(f.agentFix || f.humanDecision)) return 'None';
  return [f.agentFix && plural(f.agentFix, 'needs an agent fix', 'need an agent fix'),
    f.humanDecision && plural(f.humanDecision, 'needs your decision', 'need your decision')].filter(Boolean).join(', ');
}
// One call's cache line (cachewatch.mjs): reused X of the Y tokens at the top of the call, what that text is, and,
// when it fell short, which pieces came from the cache and which didn't
const LASTS = { opus: '1 hour', kimi: 'about 5 minutes' };
function cacheRows(e) {
  const c = e.cache, t = e.tokens;
  if (!c?.pieces) return [['From the cache', n(t.cached) + ' tokens']];   // a call from before the cache check
  const got = Math.min(t.cached, c.expected), share = pct(got, c.expected);
  const of = 'Reused ' + n(got) + ' of ' + n(c.expected) + ' tokens (' + share + ')';
  const top = '<div class="sub">The text at the top: ' + c.pieces.map((p) => esc(p.name)).join(' + ') + '</div>';
  const pieces = '<div class="sub">' + c.pieces.map((p) => (p.reused >= p.tokens ? '✓ ' : p.reused ? '◐ ' : '✗ ') + esc(p.name) + ': ' +
    n(p.reused) + ' of ' + n(p.tokens) + (p.reused >= p.tokens ? ' from the cache' : p.reused ? ' from the cache' : ', not from the cache')).join('<br>') + '</div>';
  const line = {
    reused: '<span class="good">✓ ' + of + '</span>' + top,
    partial: '<span class="warn">⚠ ' + of + '</span><div class="sub">Only part of the text at the top came from the cache:</div>' + pieces,
    missed: '<span class="problem">✗ ' + of + '</span><div class="sub">The cache missed this call. The same text was sent recently, so all of it should have come from the cache:</div>' + pieces,
    expired: '⏱ ' + of + '<div class="sub">The cache had expired. This text was last sent ' + c.minutes + ' min ago, and ' +
      (e.model === 'opus' ? 'Opus' : 'Kimi') + '’s cache lasts ' + LASTS[e.model] + '.</div>' + top,
    first: of + '<div class="sub">First time this text was sent, so nothing was in the cache yet. It’s saved now for the next call.</div>' + top,
  }[c.status];
  return [['Cache', line]];
}
// Labeled lines: [['Ran for', '5 sec'], ...]; empty values are left out. Values are already escaped.
function facts(rows) {
  return '<dl class="facts">' + rows.filter((r) => r[1]).map(([k, v, cls]) => '<dt>' + k + '</dt><dd' + (cls ? ' class="' + cls + '"' : '') + '>' + v + '</dd>').join('') + '</dl>';
}
function ago(iso) {
  const m = Math.round((Date.now() - new Date(iso)) / 60000);
  return m < 1 ? 'just now' : m < 60 ? m + ' min ago' : m < 2880 ? Math.round(m / 60) + ' h ago' : Math.round(m / 1440) + ' days ago';
}
function bar(total, done, going = 0, failed = 0) {
  const p = (x) => total ? (100 * x / total).toFixed(2) + '%' : '0';
  return '<div class="bar"><i class="d" style="width:' + p(done) + '"></i><i class="a" style="width:' + p(going) +
    '"></i><i class="f" style="width:' + p(failed) + '"></i></div>';
}

function render(st) {
  const run = st.run || { status: 'idle' };
  const pills = { idle: 'Not started', running: 'Running', paused: 'Paused', overflow: 'Running: Kimi covering for Opus',
    stopped: 'Stopped', finished: 'Finished' };
  const pill = document.getElementById('pill');
  pill.className = 'pill ' + run.status;
  pill.textContent = pills[run.status] || run.status;
  const bits = [];
  if (run.note) bits.push(esc(run.note));
  bits.push(st.lastAt ? 'Last update ' + ago(st.lastAt) + '.' : 'The run hasn’t started yet.');
  document.getElementById('status').innerHTML = bits.join(' ');

  setTalk(st.remote.connected ? 'ready' : 'off', st.remote.url);

  const P = st.passages;
  document.getElementById('passages').innerHTML =
    '<div class="big">' + n(P.count) + ' <span class="sub">passages made</span></div>' +
    '<div class="sub">' + (P.status ? STATUS[P.status] + ' · ' : P.count ? '' : 'Not started · ') + n(P.books) + ' of ' + P.of + ' books split</div>' +
    bar(P.of, P.status === 'done' ? P.of : P.books) +
    '<div class="chips">' + Object.entries(P.byType).map(([t, c]) => '<span class="chip">' + esc(t) + ' <b>' + n(c) + '</b></span>').join('') + '</div>';

  const L = st.lessons;
  document.getElementById('lessons').innerHTML = L.total
    ? '<div class="big">' + n(L.done) + ' <span class="sub">of ' + n(L.total) + ' lessons done</span></div>' + bar(L.total, L.done) +
      Object.entries(L.steps).map(([k, c]) => '<div class="row"><span>' + STEPS[k] + '</span><span class="num">' + n(c) + ' / ' + n(L.total) + '</span></div>').join('') +
      '<div class="row"><span>Idioms (all passages, at the end)</span><span class="num">' + (STATUS[L.idioms] || 'Not started') + '</span></div>'
    : '<div class="empty">Lessons start once the passages are made and you’ve reviewed the list. Each passage becomes one lesson.</div>';

  document.getElementById('types').innerHTML = Object.entries(L.types).map(([t, x]) => '<div class="type"><h3>' + esc(t) + '</h3>' +
    '<div class="big">' + n(x.done) + ' <span class="sub">of ' + (x.total ? n(x.total) : '—') + '</span></div>' + bar(x.total, x.done, x.going, x.failed) +
    '<div class="sub">' + [x.going && n(x.going) + ' in progress', x.failed && '<span class="problem">' + n(x.failed) + ' stopped</span>',
      x.flagged && n(x.flagged) + ' flagged'].filter(Boolean).join(' · ') + (x.going || x.failed || x.flagged ? '' : x.total && x.done === x.total ? 'All done' : 'None in progress') + '</div></div>').join('');

  document.getElementById('now').innerHTML = st.working.length ? st.working.map((e) => '<div class="entry"><div><span class="live"></span>' +
    model(e) + ' is ' + (e.kind === 'call' ? ROLES[e.role] || 'working on' : DOING[e.status]) + ' ' + what(e) + '</div>' +
    facts([['Passage', esc(e.label)], ['Running for', '<b>' + took(Date.now() - new Date(e.startedAt)) + '</b>'], ['Started', when(e.startedAt)]]) +
    '</div>').join('')
    : '<div class="empty">No model is working right now.</div>';

  document.getElementById('flag-badge').innerHTML = st.flags.humanDecision ? '<span class="badge">' + n(st.flags.humanDecision) + '</span>' : '';
  document.getElementById('flag-totals').innerHTML =
    '<div class="stat"><div class="big">' + n(st.flags.agentFix) + '</div><div class="sub">need an agent fix (a rerun handles these)</div></div>' +
    '<div class="stat"><div class="big">' + n(st.flags.humanDecision) + '</div><div class="sub">need your decision</div></div>';
  document.getElementById('flag-list').innerHTML = pager('flagged', st.flagged, (e) => '<div class="entry">' +
    '<div class="meta"><span>' + when(e.t) + '</span></div><div><b>' + what(e) + '</b></div>' +
    facts([['Passage', esc(e.label)], ['Flags', flagText(e.flags)]]) +
    (e.flags.items || []).map((x) => '<div class="item ' + esc(x.list) + '"><div class="meta"><span class="tag">' +
      (x.list === 'human' ? 'Needs your decision' : 'Needs agent fix') + '</span>' + (x.where ? '<span>' + esc(x.where) + '</span>' : '') +
      '</div><div>' + esc(x.problem) + '</div></div>').join('') + '</div>',
    'No flags yet. After each step’s final check, anything still wrong shows up here.');

  const o = st.usage.opus, k = st.usage.kimi, w = st.limits?.weekly;
  document.getElementById('usage').innerHTML =
    '<div class="stat"><h3>Opus 5.5</h3>' + (w
      ? '<div class="big">' + Math.max(0, Math.round(100 - w.pct)) + '% <span class="sub">of your weekly limit left</span></div>' +
        bar(100, Math.min(100, w.pct)) +
        facts([['Used', (w.pct < 1 && w.pct > 0 ? 'Under 1%' : Math.round(w.pct) + '%')], ['Resets', when(w.resetsAt)],
          ['Checked', when(st.limits.t)]])
      : '<div class="big">— <span class="sub">weekly limit</span></div><div class="sub">Checked when the run starts</div>') +
    '<div class="sub" style="margin-top:6px">' + n(o.calls) + ' calls · ' + n(o.input) + ' tokens in · ' + n(o.output) + ' out</div></div>' +
    '<div class="stat"><h3>Kimi K3.1 Pro</h3><div class="big">' + money(k.cost) + ' <span class="sub">spent</span></div>' +
    '<div class="sub">Through OpenRouter, Moonshot AI only</div>' +
    '<div class="sub">' + n(k.calls) + ' calls · ' + n(k.input) + ' tokens in · ' + n(k.output) + ' out</div></div>';
  // Is the cache caching: each model's calls by verdict (cachewatch.mjs), not a share of all input
  const cacheLine = (name, x) => {
    const c = x.cache;
    const unchecked = x.calls - c.reused - c.partial - c.missed - c.first - c.expired;   // made before calls got a verdict
    const counts = [c.reused && '<span class="good">✓ ' + n(c.reused) + ' reused</span>', c.partial && '<span class="warn">⚠ ' + n(c.partial) + ' partly</span>',
      c.missed && '<span class="problem">✗ ' + n(c.missed) + ' missed</span>', c.expired && '⏱ ' + n(c.expired) + ' expired',
      c.first && n(c.first) + ' first-time', unchecked > 0 && n(unchecked) + ' from before the cache check'].filter(Boolean);
    const total = x.due ? (x.got / x.due >= 0.95 ? '<span class="good">✓ ' : '<span class="warn">⚠ ') + 'Reused ' + n(x.got) + ' of ' + n(x.due) +
      ' tokens that should have come from the cache (' + pct(x.got, x.due) + ')</span>' : 'Nothing has been due from the cache yet';
    return '<div class="entry"><b>' + name + '</b><div>' + total + '</div><div class="sub">' + (counts.join(' · ') || 'No calls yet') + '</div>' +
      (x.missedInARow >= 3 ? '<div class="problem">' + name + ' missed the cache ' + x.missedInARow + ' calls in a row. Something at the top of each call is changing.</div>' : '') + '</div>';
  };
  document.getElementById('cache').innerHTML = '<h3 style="margin:4px 0">Cache</h3>' + cacheLine('Opus', o) + cacheLine('Kimi', k);

  document.getElementById('notes').innerHTML = pager('notes', st.notes, (e) => '<div class="entry note">' +
    '<div class="note-title' + (e.problem ? ' problem' : '') + '">' + (e.problem ? 'Problem: ' : '') + esc(e.title) + '</div>' +
    '<div class="meta"><span>' + when(e.t) + '</span></div>' +
    (e.lines?.length ? '<ul>' + e.lines.map((l) => '<li>' + esc(l) + '</li>').join('') + '</ul>' : '') + '</div>',
    'Nothing yet. Stops, retries and daily summaries show up here in plain words.');

  document.getElementById('log').innerHTML = pager('log', st.log, (e) => {
    const ran = e.ms != null ? took(e.ms) : '';
    let tag, line, rows;
    if (e.type === 'call' && e.status === 'error') {
      tag = 'Error';
      line = model(e) + ' couldn’t finish ' + what(e);
      rows = [['Passage', esc(e.label)], ['Ran for', ran], ['What went wrong', esc(e.error), 'problem'], ['Details', esc(e.detail)]];
    } else if (e.type === 'call') {
      const t = e.tokens;
      tag = 'Finished';
      line = model(e) + ' ' + (DID[e.role] || 'ran') + ' ' + what(e);
      rows = [['Passage', esc(e.label)], ['Ran for', ran],
        ...(t ? cacheRows(e) : []), ['Tokens out', t && n(t.output)],
        ['Cost', e.model === 'opus' ? 'Included in the subscription' : money(e.cost)]];
    } else if (e.status === 'done' || e.status === 'failed') {
      tag = e.status === 'done' ? 'Done' : 'Stopped';
      line = what(e) + (e.status === 'done' ? ' is done' : ' stopped');
      rows = [['Passage', esc(e.label ?? 'Whole Bible')], ['Took', ran], ['Flags', e.status === 'done' && flagText(e.flags)]];
    } else {
      tag = 'Started';
      line = model(e) + ' started ' + DOING[e.status] + ' ' + what(e);
      rows = [['Passage', esc(e.label ?? 'Whole Bible')]];
    }
    return '<div class="entry"><div class="meta"><span>' + when(e.t) + '</span><span class="tag ' + esc(e.status) + '">' + tag + '</span></div>' +
      '<div>' + line + '</div>' + facts(rows) + '</div>';
  }, 'Nothing yet. Every model call and step shows up here with its date and time.');
}

// 5 per page, newest first. The page each list is on survives the refresh every few seconds.
const PER_PAGE = 5, pages = {};
let last = null;
function pager(id, items, fn, empty) {
  if (!items.length) return '<div class="empty">' + empty + '</div>';
  const count = Math.ceil(items.length / PER_PAGE);
  const p = pages[id] = Math.min(pages[id] || 0, count - 1);
  const from = p * PER_PAGE, to = Math.min(from + PER_PAGE, items.length);
  return items.slice(from, to).map(fn).join('') + (count > 1 ? '<div class="pager">' +
    '<button data-pager="' + id + '" data-step="-1"' + (p === 0 ? ' disabled' : '') + '>← Newer</button>' +
    '<span class="sub">' + (from + 1) + '–' + to + ' of ' + n(items.length) + '</span>' +
    '<button data-pager="' + id + '" data-step="1"' + (p === count - 1 ? ' disabled' : '') + '>Older →</button></div>' : '');
}
document.addEventListener('click', (ev) => {
  const b = ev.target.closest('[data-pager]');
  if (!b || !last) return;
  pages[b.dataset.pager] = (pages[b.dataset.pager] || 0) + Number(b.dataset.step);
  render(last);
});

const TABS = ['overview', 'logs', 'flags'];
function showTab() {
  const tab = TABS.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'overview';
  for (const el of document.querySelectorAll('[data-tab]')) el.hidden = el.dataset.tab !== tab;
  for (const a of document.querySelectorAll('.tabs a')) a.classList.toggle('on', a.getAttribute('href') === '#' + tab);
}
window.addEventListener('hashchange', () => { showTab(); scrollTo(0, 0); });
showTab();

// The button only opens Claude; it works only while Remote Control is running on the PC
function setTalk(state, url) {
  const talk = document.getElementById('talk');
  if (state === 'ready') { talk.href = url || 'https://claude.ai/code'; talk.removeAttribute('aria-disabled'); }
  else { talk.removeAttribute('href'); talk.setAttribute('aria-disabled', 'true'); }
  talk.className = 'talk' + (state === 'ready' ? '' : ' off');
  document.getElementById('talk-status').innerHTML = {
    ready: '<span class="dot on"></span>The PC is ready. Opens Claude, where you can start a chat on this PC.',
    off: '<span class="dot"></span>Remote Control is off on the PC, so Claude can’t reach it.',
    down: '<span class="dot down"></span>The PC can’t be reached, so Claude can’t either.',
  }[state];
}

// Lost touch with the PC: say so at the top, gray out the old numbers, and turn the button off
let downSince = null;
function showDown(isDown) {
  document.body.classList.toggle('down', isDown);
  const banner = document.getElementById('down');
  banner.hidden = !isDown;
  if (!isDown) { downSince = null; return; }
  downSince ??= new Date().toISOString();
  banner.innerHTML = 'Can’t reach the PC<span>Since ' + when(downSince) + '. It may be off, restarting, or offline. ' +
    (last ? 'The numbers below are from ' + when(last.now) + '.' : '') + ' This page keeps trying and updates by itself when the PC is back.</span>';
  const p = document.getElementById('pill');
  p.textContent = 'Can’t reach the PC'; p.className = 'pill stopped';
  setTalk('down');
}

// ?preview=off or ?preview=down shows those states without taking anything down. ?preview=cache puts one example
// call for each cache verdict at the top of the log (numbers from the caching test), without touching any totals.
const PREVIEW = new URLSearchParams(location.search).get('preview');
function cacheExamples() {
  const t = new Date().toISOString(), label = 'Example only, not a real call';
  const pm = { name: 'passages.md', tokens: 2812 }, ruth = { name: 'Ruth', tokens: 5158 };
  const call = (model, cached, input, cache) => ({ t, type: 'call', status: 'done', model, step: 'cache_test', ms: 7000, label,
    tokens: { input, cached, output: 5 }, cache });
  const opus = (status, cached, extra = {}) => call('opus', cached, 8797, { status, expected: 7970, ...extra,
    pieces: [{ ...pm, reused: Math.min(cached, 2812) }, { ...ruth, reused: Math.max(0, Math.min(cached - 2812, 5158)) }] });
  return [
    opus('reused', 7955),
    call('kimi', 2304, 4480, { status: 'partial', expected: 4410, pieces: [{ name: 'passages.md', tokens: 2103, reused: 2103 },
      { name: 'checker.md', tokens: 515, reused: 201 }, { name: 'Jonah', tokens: 1792, reused: 0 }] }),
    opus('missed', 0),
    opus('expired', 0, { minutes: 80 }),
    opus('first', 0),
  ];
}
let version = null;
async function tick() {
  try {
    const st = await (await fetch('/api/state')).json();
    if (version && st.version !== version) return location.reload();
    version = st.version;
    if (PREVIEW === 'off') st.remote = { url: null, connected: false };
    if (PREVIEW === 'cache') st.log = cacheExamples().concat(st.log);
    render(last = st);
    showDown(PREVIEW === 'down');
  }
  catch { showDown(true); }
}
tick();
setInterval(tick, 4000);
</script>
</body>
</html>`;
