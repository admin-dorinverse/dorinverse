// Times working out the badges with the app's own code, on a whole Bible of pretend lessons (one per chapter, about
// 1,190, spread over the six constellations) with half of them finished, 150 people and 60 places. It also prints
// each badge's level. Saves nothing and uses no network.
// Run from the repo root: node --import ./scripts/app/ts-alias.mjs scripts/app/time-badges.mjs
import { performance } from 'node:perf_hooks';

const { earnedLevels } = await import('@/data/badgeSource');
const { BADGES, levelReached } = await import('@/data/badgeList');
const { BIBLE_OUTLINE } = await import('@/data/bibleOutline');

const TYPES = ['Narrative', 'Poetry & Wisdom', 'Letters', 'Prophetic', 'Parables', 'Sermons'];
const outlines = [];
const baked = {};
for (const book of BIBLE_OUTLINE) {
  book.chapterVerses.forEach((_, i) => {
    const id = outlines.length + 1;
    outlines.push({ id, title: '', reference: '', startChapter: `${book.name} ${i + 1}`, type: TYPES[id % TYPES.length], storyGroup: null, storyPosition: null, stopCount: 3 });
    if (id % 2 === 0 || book.name === 'Ruth') baked[id] = 3;
  });
}
const collected = new Set();
for (let i = 0; i < 150; i++) collected.add(`character:p${i}`);
for (let i = 0; i < 60; i++) collected.add(`place:x${i}`);
collected.add('cookie:prophecy:1:promise:Genesis 22:18');
collected.add('cookie:prophecy:1:fulfillment:Galatians 3:16');

const facts = { outlines, baked, collected, wordGuessed: true, streak: 12 };
const earned = earnedLevels(facts);
console.log(`${outlines.length} lessons, ${BADGES.length} badges:`);
for (const b of BADGES) console.log(`  ${b.name}: level ${levelReached(b, earned)} of ${b.levels.length}`);

const runs = 200;
const t = performance.now();
for (let i = 0; i < runs; i++) earnedLevels(facts);
console.log(`working out the levels: ${((performance.now() - t) / runs).toFixed(2)} ms each (done once per change, not per frame)`);
