// Times the Bible reader's data path with the app's own code: a first launch (empty phone), a second launch
// (phone has everything: must make 0 requests), new verses, and building chapter pages from memory.
// Run from the repo root: node --import ./scripts/app/ts-alias.mjs scripts/app/time-bible.mjs
// It reads the database with the public key from .env.local and saves nothing.
import { readFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/).filter((l) => l.includes('=')).map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]));
process.env.EXPO_PUBLIC_SUPABASE_URL = env.EXPO_PUBLIC_SUPABASE_URL;
process.env.EXPO_PUBLIC_SUPABASE_KEY = env.EXPO_PUBLIC_SUPABASE_KEY;
let requests = 0;
const realFetch = globalThis.fetch;
globalThis.fetch = (...a) => { requests++; return realFetch(...a); };

const { syncBible } = await import('@/data/bibleSync');
const { chapterPage, revealedTexts } = await import('@/data/bibleLibrary');
const { bibleOutline } = await import('@/data/bibleSource');
const { sampleRevealedVerses } = await import('@/data/sample/revealedVerses');
const { stardustText } = await import('@/components/bible/stardust');

const phone = { refs: null, texts: {}, shapes: {} };
const save = async (refs, earned) => { phone.refs = [...refs]; Object.assign(phone.texts, earned.texts); Object.assign(phone.shapes, earned.shapes); };
async function launch(label) {
  requests = 0;
  const t = performance.now();
  const r = await syncBible({ refs: phone.refs, texts: { ...phone.texts }, shapes: { ...phone.shapes } }, save);
  console.log(`${label}: ${Math.round(performance.now() - t)} ms, ${requests} network requests, ${r.downloaded} verses downloaded`);
  return r.library;
}
let lib = await launch('1st launch (empty phone)');
lib = await launch('2nd launch (phone has everything)');
sampleRevealedVerses.push('John.3.18');
lib = await launch('3rd launch (1 new verse in a saved chapter)');
sampleRevealedVerses.push('Rom.8.28');
lib = await launch('4th launch (1 new verse in a new chapter)');
const bytes = JSON.stringify(phone.texts).length + JSON.stringify(phone.shapes).length;
console.log(`phone holds ${Object.keys(phone.texts).length} revealed + ${Object.keys(phone.shapes).length} covered verses, about ${Math.round(bytes / 1024)} KB`);

/** Builds a page the way the reader does: the page from memory, then the stardust letters for covered verses. */
function openChapter(code, chapter) {
  const book = bibleOutline.find((b) => b.code === code);
  const page = chapterPage(lib, book, chapter);
  for (const v of page.verses) if (v.kind === 'covered') stardustText(v.wordLengths, v.number);
  return page;
}
for (const [code, chapter] of [['Judg', 3], ['Ps', 119], ['Gen', 1]]) {
  const page = openChapter(code, chapter);
  const runs = 2000;
  const t = performance.now();
  for (let i = 0; i < runs; i++) openChapter(code, chapter);
  const covered = page.verses.filter((v) => v.kind === 'covered').length;
  console.log(`open ${code} ${chapter} (${page.verses.length} verses, ${covered} covered): ${((performance.now() - t) / runs * 1000).toFixed(0)} µs`);
}
{
  const runs = 2000;
  const t = performance.now();
  for (let i = 0; i < runs; i++) {
    const items = [...bibleOutline.filter((b) => b.testament === 'OT'), ...bibleOutline.filter((b) => b.testament === 'NT')];
    items.map((b) => lib.counts[b.code]);
  }
  console.log(`book list data (66 books + counts): ${((performance.now() - t) / runs * 1000).toFixed(0)} µs, 0 network requests`);
  const t2 = performance.now();
  revealedTexts(lib);
  console.log(`search texts from memory: ${((performance.now() - t2) * 1000).toFixed(0)} µs`);
}
