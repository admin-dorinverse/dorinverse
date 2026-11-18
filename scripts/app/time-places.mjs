// Times the Places pages' data path with the app's own code: a first launch (empty phone), a second launch (phone
// has every card: must make 0 requests), a newly collected Jerusalem (the place named in the most verses), the page
// work done from memory, and how many photo bytes a phone downloads for the collected places (WebP copies against
// the original JPEGs).
// Run from the repo root: node --import ./scripts/app/ts-alias.mjs scripts/app/time-places.mjs
// It reads the database and storage with the public key from .env.local and saves nothing.
import { readFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/).filter((l) => l.includes('=')).map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]));
process.env.EXPO_PUBLIC_SUPABASE_URL = env.EXPO_PUBLIC_SUPABASE_URL;
process.env.EXPO_PUBLIC_SUPABASE_KEY = env.EXPO_PUBLIC_SUPABASE_KEY;
let requests = 0;
const realFetch = globalThis.fetch;
globalThis.fetch = (...a) => { requests++; return realFetch(...a); };

const { syncPlaces } = await import('@/data/placeSync');
const { filterPlaces, placeCharacters } = await import('@/data/placeLibrary');
const { sortByName } = await import('@/data/collectedLists');
const { sampleCollectedPlaces } = await import('@/data/sample/collectedPlaces');
const { syncCharacters } = await import('@/data/characterSync');
const { syncBible } = await import('@/data/bibleSync');
const { makeSearchIndex, refsPage } = await import('@/data/bibleSearch');
const { bibleOutline } = await import('@/data/bibleSource');

const phone = { list: null, cards: {} };
const save = async (list, added) => {
  phone.list = list.map((e) => ({ ...e }));
  for (const c of added) phone.cards[c.lookup] = JSON.parse(JSON.stringify(c));
  for (const lookup of Object.keys(phone.cards)) if (!list.some((e) => e.lookup === lookup)) delete phone.cards[lookup];
};
async function launch(label) {
  requests = 0;
  const t = performance.now();
  const r = await syncPlaces({ list: phone.list, cards: { ...phone.cards } }, save);
  console.log(`${label}: ${Math.round(performance.now() - t)} ms, ${requests} network requests, ${r.downloaded} cards downloaded`);
  return r.library;
}

let lib = await launch('1st launch (empty phone)');
lib = await launch('2nd launch (phone has everything)');
sampleCollectedPlaces.push({ lookup: 'jerusalems_637', foundIn: '2 Samuel 5' });
lib = await launch('3rd launch (Jerusalem newly collected)');
console.log(`Jerusalem: ${lib.byLookup['jerusalems_637'].verseRefs.length} verse labels, ${lib.byLookup['jerusalems_637'].characters.length} linked characters (ids only)`);
await launch('4th launch (phone has everything)');
sampleCollectedPlaces.pop();
lib = await launch('5th launch (Jerusalem no longer collected)');
console.log(`phone holds ${Object.keys(phone.cards).length} cards for ${phone.list.length} collected places, about ${Math.round(JSON.stringify(phone.cards).length / 1024)} KB`);
console.log(`saved cards not in the collected list: ${Object.keys(phone.cards).filter((l) => !phone.list.some((e) => e.lookup === l)).length} (must be 0)`);

const chars = (await syncCharacters({ list: null, cards: {} }, async () => {})).library;
for (const place of lib.places) {
  const { rows, hidden } = placeCharacters(chars, place);
  console.log(`  ${place.name}: ${place.verseRefs.length} verses, characters named ${rows.map((r) => r.character.name).join(', ') || '(none)'}; ${hidden} more to discover; ${place.moments.length} key moments; photo ${place.photo ? 'yes' : 'no'}`);
}

/** Runs `work` many times and prints the average time. */
function time(label, work, runs = 2000) {
  work();
  const t = performance.now();
  for (let i = 0; i < runs; i++) work();
  console.log(`${label}: ${((performance.now() - t) / runs * 1000).toFixed(0)} µs`);
}
time('grid: search "k" over all collected', () => filterPlaces(lib.places, 'k', null));
time('grid: book chip "Judges", A–Z', () => sortByName(filterPlaces(lib.places, '', 'Judges'), 'az'));
time('Mount Tabor page: character rows', () => placeCharacters(chars, lib.byLookup['tabor_1129']));

const bible = (await syncBible({ refs: null, texts: {}, shapes: {}, notes: {} }, async () => {})).library;
const index = makeSearchIndex(bibleOutline, bible);
for (const who of ['moab_815', 'kishon_705', 'jericho_634']) {
  const page = refsPage(index, new Set(lib.byLookup[who].verseRefs));
  time(`Find in scripture for ${lib.byLookup[who].name}: first page (${page.hits.length} revealed verses)`, () => refsPage(index, new Set(lib.byLookup[who].verseRefs)));
}

// Photo bytes a phone downloads once for the collected places: the WebP copies, against the original JPEGs.
const sizes = { small: 0, header: 0, original: 0, missing: 0 };
const base = `${env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/public/place-images`;
/** Downloads one file and returns its size, or 0 when it is not there. */
async function bytes(url) {
  const reply = await realFetch(url);
  return reply.ok ? (await reply.arrayBuffer()).byteLength : 0;
}
for (const place of lib.places) {
  if (!place.photo) continue;
  const [s, h, o] = await Promise.all([bytes(place.photo.small), bytes(place.photo.header), bytes(`${base}/${place.lookup}.jpg`)]);
  if (!s || !h) sizes.missing++;
  sizes.small += s;
  sizes.header += h;
  sizes.original += o;
}
const kb = (n) => `${(n / 1024).toFixed(0)} KB`;
console.log(`photos for ${lib.places.length} collected places: WebP ${kb(sizes.small + sizes.header)} (small ${kb(sizes.small)}, header ${kb(sizes.header)}) against originals ${kb(sizes.original)}; places whose WebP copies are not in storage yet: ${sizes.missing}`);
