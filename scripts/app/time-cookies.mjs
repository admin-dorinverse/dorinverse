// Times the Prophecy, Instructions and Prayers pages' data path with the app's own code: a first launch (empty
// phone), a second launch (phone has every cookie: must make 0 requests), a newly collected prophecy half that joins
// a waiting link, the same half taken away again, and the page work done from memory. It also checks that no
// uncollected cookie, and no missing half's words, is ever on the phone.
// Run from the repo root: node --import ./scripts/app/ts-alias.mjs scripts/app/time-cookies.mjs
// It reads the database with the public key from .env.local and saves nothing.
import { readFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/).filter((l) => l.includes('=')).map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]));
process.env.EXPO_PUBLIC_SUPABASE_URL = env.EXPO_PUBLIC_SUPABASE_URL;
process.env.EXPO_PUBLIC_SUPABASE_KEY = env.EXPO_PUBLIC_SUPABASE_KEY;
let requests = 0;
const realFetch = globalThis.fetch;
globalThis.fetch = (...a) => { requests++; return realFetch(...a); };

const { syncCookies } = await import('@/data/cookieSync');
const { filterInstructions, filterProphecies, readingSpot } = await import('@/data/cookieLibrary');
const { sampleCollectedCookies } = await import('@/data/sample/collectedCookies');

const phone = { list: null, cookies: {}, links: {} };
const save = async (list, added, links) => {
  phone.list = [...list];
  for (const c of added) phone.cookies[c.key] = JSON.parse(JSON.stringify(c));
  for (const key of Object.keys(phone.cookies)) if (!list.includes(key)) delete phone.cookies[key];
  phone.links = Object.fromEntries(links.map((l) => [l.linkNo, JSON.parse(JSON.stringify(l))]));
};
async function launch(label) {
  requests = 0;
  const t = performance.now();
  const r = await syncCookies({ list: phone.list, cookies: { ...phone.cookies }, links: { ...phone.links } }, save);
  console.log(`${label}: ${Math.round(performance.now() - t)} ms, ${requests} network requests, ${r.downloaded} cookies downloaded`);
  return r.library;
}
/** Checks the phone holds only collected cookies and no words of a missing half. */
function checkPhone() {
  const extra = Object.keys(phone.cookies).filter((k) => !phone.list.includes(k)).length;
  const text = JSON.stringify(phone.links);
  const wordsInOutlines = /quote|words/.test(text);
  console.log(`  phone: ${Object.keys(phone.cookies).length} cookies for ${phone.list.length} collected, ${Object.keys(phone.links).length} link outlines, about ${Math.round(JSON.stringify(phone).length / 1024)} KB; uncollected cookies saved: ${extra} (must be 0); words in outlines: ${wordsInOutlines} (must be false)`);
}

let lib = await launch('1st launch (empty phone)');
checkPhone();
lib = await launch('2nd launch (phone has everything)');
sampleCollectedCookies.push('prophecy:4:fulfillment:John 12:14-15');
lib = await launch('3rd launch (a fulfillment of link 4 newly collected)');
console.log(`  link 4 joined now: ${lib.byLinkNo[4].joined}`);
await launch('4th launch (phone has everything)');
sampleCollectedCookies.pop();
lib = await launch('5th launch (that half no longer collected)');
checkPhone();

console.log(`library: Ten Commandments ${lib.commandments ? `pack with ${lib.commandments.lines.length} lines` : 'not collected'}, ${lib.instructions.length} commands (givers ${lib.givers.join(', ')}), ${lib.prayers.length} prayers, ${lib.prophecies.length} prophecy links (${lib.joinedCount} joined)`);
for (const card of lib.prophecies) {
  const show = (s) => (s.kind === 'held' ? s.cookie.reference : `[still to find: ${s.half.reference}]`);
  console.log(`  ${card.linkNo}. ${card.title}${card.joined ? ' ✦ Joined' : ''}: ${show(card.promise)} → ${card.fulfillments.map(show).join(', ')}`);
}
const unread = [...lib.prayers.map((p) => p.reference), ...lib.prophecies.flatMap((c) => [c.promise, ...c.fulfillments]).map((s) => (s.kind === 'held' ? s.cookie.reference : s.half.reference))].filter((r) => !readingSpot(r));
console.log(`references the reader can't open: ${unread.length} ${unread.join(', ')}`);

// Which "Read in the Bible" buttons are on: only for held references whose first verse is revealed.
const { syncBible } = await import('@/data/bibleSync');
const bible = (await syncBible({ refs: null, texts: {}, shapes: {}, notes: {} }, async () => {})).library;
const held = [...lib.prayers.map((p) => p.reference), ...lib.prophecies.flatMap((c) => [c.promise, ...c.fulfillments]).flatMap((s) => (s.kind === 'held' ? [s.cookie.reference] : []))];
const open = held.filter((r) => bible.refs.has(readingSpot(r).firstVerse));
console.log(`"Read in the Bible" on for ${open.length} of ${held.length} held references (${open.join(', ') || 'none'}); the rest show the stardust note`);

/** Runs `work` many times and prints the average time. */
function time(label, work, runs = 5000) {
  work();
  const t = performance.now();
  for (let i = 0; i < runs; i++) work();
  console.log(`${label}: ${((performance.now() - t) / runs * 1000).toFixed(1)} µs`);
}
time('Prophecy: "Waiting for a half" chip', () => filterProphecies(lib.prophecies, 'waiting'));
time('Instructions: "Jesus" chip', () => filterInstructions(lib.instructions, 'Jesus'));
time('Read in the Bible: reading a reference', () => readingSpot('Genesis 24:12-14'));
