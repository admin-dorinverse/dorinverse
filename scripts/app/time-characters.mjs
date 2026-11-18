// Times the Characters pages' data path with the app's own code: a first launch (empty phone), a second launch
// (phone has every card: must make 0 requests), a newly collected character linked to saved ones (new pairs must
// show with no extra download), a character named in over 1,000 verses, and the page work done from memory.
// Run from the repo root: node --import ./scripts/app/ts-alias.mjs scripts/app/time-characters.mjs
// It reads the database with the public key from .env.local and saves nothing.
import { readFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/).filter((l) => l.includes('=')).map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]));
process.env.EXPO_PUBLIC_SUPABASE_URL = env.EXPO_PUBLIC_SUPABASE_URL;
process.env.EXPO_PUBLIC_SUPABASE_KEY = env.EXPO_PUBLIC_SUPABASE_KEY;
let requests = 0;
const realFetch = globalThis.fetch;
globalThis.fetch = (...a) => { requests++; return realFetch(...a); };

const { syncCharacters } = await import('@/data/characterSync');
const { filterCharacters, linkRows } = await import('@/data/characterLibrary');
const { sampleCollectedCharacters } = await import('@/data/sample/collectedCharacters');
const { database } = await import('@/data/database');
const { syncBible } = await import('@/data/bibleSync');
const { makeSearchIndex, refsPage } = await import('@/data/bibleSearch');
const { bibleOutline } = await import('@/data/bibleSource');

const phone = { list: null, cards: {} };
const save = async (list, changed) => { phone.list = list.map((e) => ({ ...e })); for (const c of changed) phone.cards[c.lookup] = JSON.parse(JSON.stringify(c)); };
async function launch(label) {
  requests = 0;
  const t = performance.now();
  const r = await syncCharacters({ list: phone.list, cards: { ...phone.cards } }, save);
  console.log(`${label}: ${Math.round(performance.now() - t)} ms, ${requests} network requests, ${r.downloaded} cards downloaded`);
  return r.library;
}
/** A lookup from a card id or a card name, asked for outside the timed launches. */
async function lookupOf(match) {
  const r = await database.from('bible_character').select('lookup').match(match).limit(1);
  return r.data[0].lookup;
}

let lib = await launch('1st launch (empty phone)');
lib = await launch('2nd launch (phone has everything)');
const david = lib.byLookup['david_994'];
const before = linkRows(lib, david);
console.log(`David before: ${before.rows.length} collected links shown, ${before.hidden} more to discover`);
const newcomer = await lookupOf({ id: david.hiddenIds[0] });
sampleCollectedCharacters.push({ lookup: newcomer, metIn: '1 Samuel 18' });
lib = await launch(`3rd launch (${newcomer} newly collected)`);
const after = linkRows(lib, lib.byLookup['david_994']);
const back = linkRows(lib, lib.byLookup[newcomer]);
console.log(`David after: ${after.rows.length} shown, ${after.hidden} to discover; ${lib.byLookup[newcomer].name} links back to David: ${back.rows.some((r) => r.other.lookup === 'david_994')}`);
const jesus = await database.from('character_card').select('bible_character_id').eq('name', 'Jesus Christ').limit(1);
const jesusLookup = await lookupOf({ id: jesus.data[0].bible_character_id });
sampleCollectedCharacters.push({ lookup: jesusLookup, metIn: 'John 3' });
lib = await launch(`4th launch (${jesusLookup}, named in 1,831 verses)`);
console.log(`Jesus: ${lib.byLookup[jesusLookup].verseRefs.length} verse labels saved of ${lib.byLookup[jesusLookup].verseCount}`);
await launch('5th launch (phone has everything)');

// No spoilers: every saved link must point to a collected character.
const collectedIds = new Set(Object.values(phone.cards).map((c) => c.id));
const leaks = Object.values(phone.cards).flatMap((c) => c.links.filter((l) => !collectedIds.has(l.otherId)));
console.log(`saved links to characters not collected: ${leaks.length} (must be 0)`);
console.log(`phone holds ${Object.keys(phone.cards).length} cards, about ${Math.round(JSON.stringify(phone.cards).length / 1024)} KB`);

/** Runs `work` many times and prints the average time. */
function time(label, work, runs = 2000) {
  work();
  const t = performance.now();
  for (let i = 0; i < runs; i++) work();
  console.log(`${label}: ${((performance.now() - t) / runs * 1000).toFixed(0)} µs`);
}
time('grid: search "d" over all collected', () => filterCharacters(lib.characters, 'd', null));
time('grid: book chip "Judges"', () => filterCharacters(lib.characters, '', 'Judges'));
time('David page: relationship rows', () => linkRows(lib, lib.byLookup['david_994']));

const phoneBible = { refs: null, texts: {}, shapes: {}, notes: {} };
const bible = (await syncBible(phoneBible, async () => {})).library;
const index = makeSearchIndex(bibleOutline, bible);
for (const who of ['ehud_1039', 'david_994', jesusLookup]) {
  const refs = new Set(lib.byLookup[who].verseRefs);
  const page = refsPage(index, refs);
  time(`Find in scripture for ${lib.byLookup[who].name}: first page (${page.hits.length} revealed verses)`, () => refsPage(index, new Set(lib.byLookup[who].verseRefs)));
}
