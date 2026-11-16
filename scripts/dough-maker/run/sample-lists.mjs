// Sample Table (sample-table.md), the two lists that need reading (owner's go, 2026-11-15):
//   PRAYERS: each verse where the BSB says someone prayed. Sonnet reads it in its passage: are the prayer's words
//     given (the card needs a key line), and is it a lament (never a cookie)? It names who prayed, what just happened,
//     where the prayer runs and one key line in exact BSB wording. The script checks the key line is word for word in
//     those verses and that a story card tells them; Terra checks the rest is true to the verses.
//   COMMANDS: New Testament commands told on a Prep story card (letters, and Jesus's spoken words). Sonnet says which
//     are commands for believers (not a one-time instruction to one person), gives the command in exact BSB wording,
//     who gave it, a reason only if the verse states one, and how well known it is for kids (1-10). The script checks
//     the wording is word for word in the verse; repeats of the same command keep only the first. The top 70 go on a
//     shortlist the owner picks 50 from.
// Writes output/sample/prayers.json and output/sample/commands-shortlist.json (+ .csv for review).
//   node scripts/dough-maker/run/sample-lists.mjs [prayers|commands|both]
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { verses, parseRefs } from './bsb.mjs';
import { chat, SONNET_OR } from './openrouter.mjs';
import { json } from './burnt.mjs';
import { passing } from './prep.mjs';
import { storyCards, SAMPLE_DIR } from './sample-place.mjs';

const V = verses();
const SONNET = { ...SONNET_OR, reasoning: { effort: 'low' }, maxTokens: 16000 };
const TERRA = { model: 'openai/gpt-6.1-terra', only: ['openai'], name: 'gpt-6.1-terra', maxTokens: 16000 };
const writeJson = (f, d) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(d, null, 1) + '\n'); };
const norm = (s) => String(s ?? '').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim();
const LETTERS = ['Romans', '1 Corinthians', '2 Corinthians', 'Galatians', 'Ephesians', 'Philippians', 'Colossians', '1 Thessalonians', '2 Thessalonians', '1 Timothy', '2 Timothy', 'Titus', 'Philemon', 'Hebrews', 'James', '1 Peter', '2 Peter', '1 John', '2 John', '3 John', 'Jude'];
const GOSPELS = ['Matthew', 'Mark', 'Luke', 'John'];
const bookOf = (ref) => ref.replace(/ \d+:\d+$/, '');
const textOf = (ref) => { const r = parseRefs(String(ref).replace(/–/g, '-')); return r ? r.map(([a, b]) => V.slice(a, b + 1).map((v) => v.text).join(' ')).join(' ') : null; };
const idxOf = (ref) => parseRefs(String(ref).replace(/–/g, '-'))?.[0]?.[0] ?? null;

async function ask(chatFn, opts, read, tries = 2) {
  let cost = 0;
  for (let t = 0; t < tries; t++) {
    let r;
    try { r = await chatFn(opts); } catch (e) { if (!passing(e)) throw e; t--; await new Promise((res) => setTimeout(res, 60_000)); continue; }
    cost += r.cost ?? 0;
    const v = read(r.text);
    if (v) return { v, cost };
  }
  return { v: null, cost };
}

// --- prayers ---------------------------------------------------------------------------------------------------------
export async function prayers({ chatFn = chat, out = SAMPLE_DIR } = {}) {
  const tells = storyCards();
  const cands = V.map((v, k) => ({ v, k })).filter(({ v }) => /\bprayed\b/i.test(v.text));
  const results = [], dropped = [];
  let cost = 0;
  for (const { v, k } of cands) {
    const ctx = V.slice(Math.max(0, k - 2), k + 16).map((x) => `${x.ref} ${x.text}`).join('\n');
    const r = await ask(chatFn, { ...SONNET, system: 'You read the BSB for a children\'s Bible app.', role: 'prayers', step: 'sample',
      user: `${ctx}\n\n${v.ref} says someone prayed. Do these verses give the words of that prayer? Is the prayer a lament (crying out in grief or complaint)?\nIf the words are given: who prayed, what happened just before (one short sentence), the verses where the prayer's words run, and one key line from the prayer copied exactly from the BSB text above.\nReply with only JSON: {"words_given": true, "lament": false, "who": "...", "what_just_happened": "...", "reference": "Book c:v-v", "key_line": "..."} or {"words_given": false}` },
      (t) => { const x = json(t); return x && typeof x.words_given === 'boolean' ? x : null; });
    cost += r.cost;
    const x = r.v;
    if (!x) { dropped.push({ ref: v.ref, why: 'reply could not be read' }); continue; }
    if (!x.words_given) { dropped.push({ ref: v.ref, why: 'the prayer\'s words are not given' }); continue; }
    if (x.lament) { dropped.push({ ref: v.ref, why: 'a lament' }); continue; }
    const words = textOf(x.reference), i = idxOf(x.reference);
    if (!words || !norm(words).includes(norm(x.key_line))) { dropped.push({ ref: v.ref, why: `key line not word for word in ${x.reference}` }); continue; }
    const card = (tells.get(i) ?? [])[0];
    if (!card) { dropped.push({ ref: v.ref, why: `no story card tells ${x.reference}` }); continue; }
    results.push({ type: 'prayer', ...card, who: x.who, what_just_happened: x.what_just_happened, reference: x.reference, key_line: x.key_line, prayed_at: v.ref, verses: words });
  }
  // the same prayer found from two "prayed" verses: keep one
  const seen = new Set(), unique = results.filter((p) => { const k = p.reference; if (seen.has(k)) return false; seen.add(k); return true; });
  // Terra checks each against its verses
  const t = unique.length ? await ask(chatFn, { ...TERRA, system: 'You check Bible-based text for a children\'s Bible app against the BSB.', role: 'reviewer', step: 'sample',
    user: `Each item is a prayer cookie. Check that who prayed and what happened just before are true to the verses, and that it really is a prayer (not a song or a lament).\n\n${unique.map((p, i) => `Item ${i + 1}: who: ${p.who} | just before: ${p.what_just_happened} | ${p.reference}: ${p.verses}`).join('\n\n')}\n\nReply with only JSON: {"findings": [{"n": 1, "problem": "..."}]}. All fine: {"findings": []}` },
    (x) => { const v = json(x); return Array.isArray(v?.findings) ? v : null; }) : { v: { findings: [] }, cost: 0 };
  cost += t.cost;
  writeJson(path.join(out, 'prayers.json'), { made: new Date().toISOString(), prayers: unique.map(({ verses: _, ...p }) => p), dropped, terra: t.v?.findings ?? 'unread', cost });
  return { candidates: cands.length, prayers: unique.length, dropped: dropped.length, terraFindings: t.v?.findings?.length ?? 'unread', cost };
}

// --- commands ------------------------------------------------------------------------------------------------------
export async function commands({ chatFn = chat, out = SAMPLE_DIR, top = 70 } = {}) {
  const tells = storyCards();
  const IMP = /(^|[.;:!?“"]\s*|,\s*(and|but|so)\s+|\b[A-Z][a-z]+,\s+)(do not|let (us|your|no one|each|everyone|all)|be|love|pray|rejoice|forgive|give|put|walk|stand|keep|honor|submit|obey|flee|pursue|bear|encourage|consider|remember|serve|seek|repent|believe|follow|watch|beware|take|make|turn|fear|trust|abide|go|bless|welcome|greet|devote|clothe|set|guard|carry|live|speak|examine|test|resist|humble|draw near|hold fast|fix|run|count|confess|ask|judge|store|treat|do to|honor|teach|make disciples)\b/i;
  const cands = V.map((v, k) => ({ v, k })).filter(({ v, k }) => tells.has(k) && (LETTERS.includes(bookOf(v.ref)) || (GOSPELS.includes(bookOf(v.ref)) && /[“"]/.test(v.text))) && IMP.test(v.text));
  const found = [];
  let cost = 0, unread = 0;
  for (let i = 0; i < cands.length; i += 40) {
    const batch = cands.slice(i, i + 40);
    const r = await ask(chatFn, { ...SONNET, system: 'You read the BSB for a children\'s Bible app.', role: 'commands', step: 'sample',
      user: `For each verse: is there a command for believers, given or approved by Jesus or written by a New Testament letter writer? A one-time instruction to one person or group isn't (like "Go and wash" or "Greet Andronicus"). If there is, give the command copied exactly from the verse (the shortest complete command), who gave it, the reason only if the verse states one, and how well known and important it is for kids (1-10, where "Love your neighbor as yourself" is 10).\n\n${batch.map((c, n) => `${n + 1}. ${c.v.ref}: ${c.v.text}`).join('\n')}\n\nReply with only JSON: {"verses": [{"n": 1, "command": "..." or null, "who": "...", "reason": "..." or null, "known": 7}]} with one entry for every verse.` },
      (t) => { const x = json(t); return Array.isArray(x?.verses) ? x.verses : null; });
    cost += r.cost;
    if (!r.v) { unread += batch.length; continue; }
    for (const x of r.v) { const c = batch[x?.n - 1]; if (!c || !x.command) continue;
      if (!norm(c.v.text).includes(norm(x.command))) continue;   // not word for word in the verse
      found.push({ type: 'instruction', ...tells.get(c.k)[0], instruction: x.command, who: x.who, reason: x.reason ?? null, reference: c.v.ref, known: Number(x.known) || 0, k: c.k }); }
  }
  // the same command again later (love one another) keeps only its first telling
  const key = (s) => norm(s).toLowerCase().replace(/[^a-z ]/g, '').replace(/\s+/g, ' ');
  const seen = new Set(), unique = found.sort((a, b) => a.k - b.k).filter((c) => { const k = key(c.instruction); if (seen.has(k)) return false; seen.add(k); return true; });
  const short = [...unique].sort((a, b) => b.known - a.known || a.k - b.k).slice(0, top).map(({ k, ...c }) => c);
  writeJson(path.join(out, 'commands-shortlist.json'), { made: new Date().toISOString(), candidates: cands.length, commands_found: unique.length, unread, shortlist: short, cost });
  const csv = 'keep,known,command,who,reference,passage_id\n' + short.map((c) => ['yes', c.known, `"${c.instruction.replace(/"/g, '""')}"`, `"${String(c.who).replace(/"/g, '""')}"`, c.reference, c.passage_id].join(',')).join('\n') + '\n';
  fs.writeFileSync(path.join(out, 'commands-shortlist.csv'), csv);
  return { candidates: cands.length, commandsFound: unique.length, shortlist: short.length, unread, cost };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const which = process.argv[2] ?? 'both';
  if (which !== 'commands') console.log('prayers:', JSON.stringify(await prayers()));
  if (which !== 'prayers') console.log('commands:', JSON.stringify(await commands()));
}
