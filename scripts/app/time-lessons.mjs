// Times the lessons' data path with the app's own code: the outline on a first launch (empty phone) and a second
// (must make 0 requests), each constellation's list rows, a varied set of lesson downloads (size, time, requests) and
// their second open (must make 0), checking answers, and baking a stop: the revealed verses and a collected cookie
// must reach the Bible and Characters with one round of downloads, and nothing again after that.
// Run from the repo root: node --import ./scripts/app/ts-alias.mjs scripts/app/time-lessons.mjs
// It reads the database with the public key from .env.local and saves nothing.
import { readFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/).filter((l) => l.includes('=')).map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]));
process.env.EXPO_PUBLIC_SUPABASE_URL = env.EXPO_PUBLIC_SUPABASE_URL;
process.env.EXPO_PUBLIC_SUPABASE_KEY = env.EXPO_PUBLIC_SUPABASE_KEY;
let requests = 0;
let bytes = 0;
const realFetch = globalThis.fetch;
globalThis.fetch = async (...a) => {
  requests++;
  const reply = await realFetch(...a);
  const body = await reply.clone().arrayBuffer();
  bytes += body.byteLength;
  return reply;
};
const kb = (n) => `${Math.round(n / 1024)} KB`;
const ms = (t) => `${Math.round(performance.now() - t)} ms`;

const { syncOutline, syncLesson } = await import('@/data/lessonSync');
const { lessonRows, LESSON_TYPE_OF, markText, stopVerseRefs } = await import('@/data/lessonLibrary');
const { checkAnswer } = await import('@/data/lessonSource');
const progress = await import('@/data/progressSource');
const { syncBible } = await import('@/data/bibleSync');
const { syncCharacters } = await import('@/data/characterSync');

// 1. The outline.
const phone = { outline: null, lessons: {} };
const outlineStore = { read: async () => phone.outline, save: async (o) => (phone.outline = JSON.parse(JSON.stringify(o))) };
for (const label of ['1st launch (empty phone)', '2nd launch (phone has it)']) {
  requests = 0; bytes = 0;
  const t = performance.now();
  const r = await syncOutline(phone.outline, outlineStore);
  console.log(`outline, ${label}: ${ms(t)}, ${requests} requests, ${kb(bytes)} downloaded, ${r.data.length} lessons; saved on the phone ${kb(JSON.stringify(phone.outline).length)}`);
}
const outline = phone.outline;

// 2. Each constellation's list rows.
for (const [id, type] of Object.entries(LESSON_TYPE_OF)) {
  const t = performance.now();
  const rows = lessonRows(outline, type);
  const groups = rows.filter((r) => r.kind === 'group').length;
  console.log(`list ${id} (${type}): ${rows.length - groups} lessons, ${groups} story headings, rows made in ${(performance.now() - t).toFixed(2)} ms`);
}

// 3. A varied set of lessons: the first and a middle one of each kind, plus Judges 3 and the longest by stops.
const pick = new Set([228]);
for (const type of Object.values(LESSON_TYPE_OF)) {
  const of = outline.filter((l) => l.type === type);
  pick.add(of[0].id);
  pick.add(of[Math.floor(of.length / 2)].id);
}
pick.add([...outline].sort((a, b) => b.stopCount - a.stopCount)[0].id);
const lessonStore = { read: async (id) => phone.lessons[id] ?? null, save: async (l) => (phone.lessons[l.id] = JSON.parse(JSON.stringify(l))) };
const sizes = [];
const times = [];
for (const id of pick) {
  requests = 0; bytes = 0;
  const t = performance.now();
  const { data } = await syncLesson(id, lessonStore);
  const took = performance.now() - t;
  const cards = data.stops.flatMap((s) => s.cards);
  const pops = new Set(cards.flatMap((c) => (c.kind === 'story' ? c.cookies.map((k) => k.key) : [])));
  const words = cards.reduce((n, c) => n + c.words.length + c.idioms.length, 0);
  const saved = JSON.stringify(data).length;
  sizes.push(saved); times.push(took);
  const o = outline.find((l) => l.id === id);
  console.log(`lesson ${id} ${o.reference} (${o.type}): ${Math.round(took)} ms, ${requests} requests, ${kb(bytes)} downloaded, saved ${kb(saved)}; ${data.stops.length} stops, ${cards.length} cards, ${words} explained words/sayings, ${pops.size} collectibles`);
  requests = 0;
  const t2 = performance.now();
  await syncLesson(id, lessonStore);
  if (requests !== 0) console.log(`  SECOND OPEN MADE ${requests} REQUESTS (must be 0)`);
  else if (id === 228) console.log(`  second open: ${ms(t2)}, 0 requests`);
}
const avg = (a) => a.reduce((x, y) => x + y, 0) / a.length;
console.log(`lessons: average ${Math.round(avg(times))} ms and ${kb(avg(sizes))} saved each; largest ${kb(Math.max(...sizes))}; slowest ${Math.round(Math.max(...times))} ms`);

// 4. Checking answers and marking words.
const judges = phone.lessons[228];
const choice = judges.stops[0].cards.find((c) => c.kind === 'choice');
let t = performance.now();
const result = await checkAnswer(choice, [choice.answers[0].id]);
console.log(`check an answer: ${((performance.now() - t) * 1000).toFixed(0)} µs, right=${result.right}, right answer "${result.rightTexts.join(', ')}", ${result.explanations.length} explanation(s)`);
const story = judges.stops[0].cards.find((c) => c.kind === 'story' && c.words.length);
t = performance.now();
for (let i = 0; i < 1000; i++) markText(story.text, story.words, story.idioms);
console.log(`mark a card's explained words: ${((performance.now() - t)).toFixed(0)} µs each`);

// 5. Baking stop 1 of Judges 3 (verses 7-18): the Bible must pick up the new verses in one round, then nothing.
const memory = { record: null };
progress.connectProgressKeeper({ read: async () => memory.record, save: async (r) => (memory.record = JSON.parse(JSON.stringify(r))) });
const bible = { refs: null, texts: {}, shapes: {}, notes: {} };
const keepBible = async (refs, earned) => { bible.refs = [...refs]; Object.assign(bible.texts, earned.texts); Object.assign(bible.shapes, earned.shapes); Object.assign(bible.notes, earned.notes); };
await syncBible(bible, keepBible);
requests = 0;
let r = await syncBible(bible, keepBible);
console.log(`Bible before baking: ${r.library.refs.size} revealed verses, ${requests} requests on a second launch`);
const stop = judges.stops[0];
const baked = await progress.bakeStop(228, stop);
console.log(`bake ${stop.verses}: ${stopVerseRefs(stop.firstVerse, stop.lastVerse).length} verses in the stop, ${baked.revealed.length} newly revealed (${baked.revealed.join(' ')})`);
requests = 0; bytes = 0; t = performance.now();
r = await syncBible(bible, keepBible);
console.log(`Bible after baking: ${ms(t)}, ${requests} requests, ${kb(bytes)}, ${r.downloaded} verses downloaded; ${r.library.refs.size} revealed`);
requests = 0;
await syncBible(bible, keepBible);
console.log(`Bible again: ${requests} requests (must be 0)`);

// 6. Collecting a character found on a story card: Characters must pick up its card in one round, then nothing.
const chars = { list: null, cards: {} };
const keepChars = async (list, changed) => { chars.list = list.map((e) => ({ ...e })); for (const c of changed) chars.cards[c.lookup] = c; };
await syncCharacters(chars, keepChars);
const { collected } = await progress.fetchProgress();
const cookie = Object.values(phone.lessons).flatMap((l) => l.stops.flatMap((s) => s.cards)).flatMap((c) => (c.kind === 'story' ? c.cookies : [])).find((k) => k.target.kind === 'character' && !collected.has(`character:${k.target.lookup}`));
await progress.collectCookie(cookie, 'test');
requests = 0; t = performance.now();
const cr = await syncCharacters(chars, keepChars);
console.log(`collect ${cookie.title}: Characters picked it up in ${ms(t)}, ${requests} requests, ${cr.downloaded} card downloaded; ${cr.library.characters.length} collected`);
requests = 0;
await syncCharacters(chars, keepChars);
console.log(`Characters again: ${requests} requests (must be 0)`);
const baking = await progress.bakeStop(228, stop);
console.log(`baking the same stop again changes nothing: ${baking.revealed.length} revealed, ${baking.bakedStops} baked`);
