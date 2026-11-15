// Definitions, step 1: the Bible word list (owner's plan, 2026-11-15). Only Bible-world words get a definition:
// Sabbath, ephod, tabernacle, Pharisee, leaven, tithe. Never everyday English, never names of people or places.
//   1. Free: every word on the Prep cards, less the 1,000 most common English words (run/.cache/en_50k.txt,
//      FrequencyWords, OpenSubtitles 2018), less words the BSB never uses, less names of people and places
//      (the database's people and places, .cache/reference.json). -> output/definitions/candidates.json
//   2. Sonnet sorts the candidates in batches of 500: Bible-world word or not. -> output/definitions/bible-words.json
//   3. The owner looks over the list before any meaning is written.
//
//   node scripts/dough-maker/run/biblewords.mjs [--dry]        (--dry: step 1 only, free)
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { OUTPUT } from './events.mjs';
import { verses } from './bsb.mjs';
import { PREP_DIR, folder, passing } from './prep.mjs';
import { chat, SONNET_OR } from './openrouter.mjs';
import { json } from './burnt.mjs';

export const DEF_DIR = path.join(OUTPUT, 'definitions');
const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'));
const BATCH = 500;
const SONNET = { ...SONNET_OR, reasoning: { effort: 'low' }, maxTokens: 16000 };
const WORD = /(?<![A-Za-z'])[A-Za-z][a-z]+(?![A-Za-z])/g;
const writeJson = (f, d) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(d, null, 1) + '\n'); };

export function candidates() {
  const rank = new Map(fs.readFileSync(path.join(HERE, '.cache', 'en_50k.txt'), 'utf8').split('\n').map((l, i) => [l.split(' ')[0], i + 1]));
  const ref = JSON.parse(fs.readFileSync(path.join(HERE, '..', '.cache', 'reference.json'), 'utf8'));
  const names = new Set([...ref.people.flatMap((p) => [p.name, p.display_title]), ...ref.places.map((p) => p.name)].filter(Boolean)
    .flatMap((n) => String(n).toLowerCase().split(/[^a-z']+/)).filter((w) => w.length > 2));
  const bsb = new Map();
  for (const v of verses()) for (const w of v.text.replace(/[‘’]/g, "'").match(WORD) ?? []) {
    const k = w.toLowerCase(), e = bsb.get(k) ?? { n: 0, lower: false };
    e.n++; if (w[0] === w[0].toLowerCase()) e.lower = true; bsb.set(k, e);
  }
  const passages = JSON.parse(fs.readFileSync(path.join(OUTPUT, 'passages.json'), 'utf8'));
  const seen = new Map();   // word -> how many cards
  for (const p of passages) {
    const j = JSON.parse(fs.readFileSync(path.join(PREP_DIR, folder(p), 'prep.json'), 'utf8'));
    for (const s of j.stops) for (const c of s.cards) {
      const t = c.kind === 'story' ? c.text : `${c.question} ${(c.answers ?? []).map((a) => a.text).join(' ')}`;
      for (const w of new Set((t.replace(/[‘’]/g, "'").match(WORD) ?? []).map((x) => x.toLowerCase()))) seen.set(w, (seen.get(w) ?? 0) + 1);
    }
  }
  // A word the BSB only ever capitalizes is a name if it's on the people or places list (Moses), not if it isn't (Sabbath)
  return [...seen].filter(([w]) => bsb.has(w) && !(rank.get(w) <= 1000) && !(!bsb.get(w).lower && names.has(w)))
    .map(([word, cards]) => ({ word, cards, bsb: bsb.get(word).n })).sort((a, b) => a.word.localeCompare(b.word));
}

const SYSTEM = `You help build a children's Bible app (readers about 10 years old). It shows a pop-up definition for Bible words only.

A Bible word belongs to the Bible's world: its people groups, practices, worship, objects, measures, offices and ideas, words a child would need explained to follow a Bible story. Examples: Sabbath, ephod, tabernacle, Pharisee, Levite, leaven, tithe, altar, covenant, Passover, cubit, shekel, cherubim, manna, sackcloth, circumcise, atonement, righteousness, repent, prophet, priest, offering, winnow, threshing floor (threshing), concubine.

Not a Bible word: everyday English, even when hard or old-fashioned (cheese, funeral, noise, shield, abandon, countenance, devious, wardrobe), and names of people or places.

When unsure, leave it out: the owner checks the list by hand.`;
const ASK = (words) => `Here are ${words.length} words, one per line. Return only the ones that are Bible words, spelled exactly as given.

${words.join('\n')}

Reply with only JSON: {"bible_words": ["...", "..."]}`;

export async function sortWords(list, { chatFn = chat, dir = DEF_DIR } = {}) {
  const out = path.join(dir, 'bible-words.json'), parts = path.join(dir, 'sort');
  const words = list.map((x) => x.word), found = new Set(), batches = [];
  for (let i = 0; i < words.length; i += BATCH) batches.push(words.slice(i, i + BATCH));
  let cost = 0, failed = [];
  await Promise.all(batches.map(async (b, n) => {
    const file = path.join(parts, `batch-${String(n + 1).padStart(2, '0')}.json`);
    let got = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null;
    if (!got) {
      for (let tries = 0; tries < 2 && !got; tries++) {
        let r;
        try { r = await chatFn({ ...SONNET, system: SYSTEM, user: ASK(b), step: 'definitions', role: 'sorter' }); }
        catch (e) { if (!passing(e)) throw e; tries--; await new Promise((res) => setTimeout(res, 60_000)); continue; }
        cost += r.cost ?? 0;
        const v = json(r.text);
        if (Array.isArray(v?.bible_words)) got = { words: v.bible_words, cost: r.cost ?? 0 };
        else { fs.mkdirSync(dir, { recursive: true }); fs.appendFileSync(path.join(dir, 'unreadable.txt'), `--- batch ${n + 1}\n${r.text}\n`); }
      }
      if (!got) { failed.push(n + 1); return; }
      writeJson(file, got);
    }
    const asked = new Set(b);
    for (const w of got.words) if (asked.has(String(w).toLowerCase())) found.add(String(w).toLowerCase());   // only words it was given
  }));
  const byWord = new Map(list.map((x) => [x.word, x]));
  const result = [...found].sort().map((w) => byWord.get(w));
  writeJson(out, { made: new Date().toISOString(), from: list.length, words: result });
  return { kept: result.length, from: list.length, batches: batches.length, failed, cost };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const list = candidates();
  writeJson(path.join(DEF_DIR, 'candidates.json'), { made: new Date().toISOString(), words: list });
  console.log(`${list.length} candidates -> output/definitions/candidates.json`);
  if (!process.argv.includes('--dry')) sortWords(list).then((r) => console.log(JSON.stringify(r)), (e) => { console.error(e.message); process.exit(1); });
}
