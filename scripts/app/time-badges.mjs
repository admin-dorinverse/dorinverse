// Times working out the Profile page's badges with the app's own code, on a whole Bible of pretend lessons (one per
// chapter, about 1,190) with half of them finished, 150 people, 60 places and 120 memorized verses. It also checks
// which badges come out earned. Saves nothing and uses no network.
// Run from the repo root: node --import ./scripts/app/ts-alias.mjs scripts/app/time-badges.mjs
import { performance } from 'node:perf_hooks';

const { earnedBadges } = await import('@/data/badgeSource');
const { BADGES } = await import('@/data/badgeList');
const { BIBLE_OUTLINE } = await import('@/data/bibleOutline');

const outlines = [];
const baked = {};
for (const book of BIBLE_OUTLINE) {
  book.chapterVerses.forEach((_, i) => {
    const id = outlines.length + 1;
    outlines.push({ id, title: '', reference: '', startChapter: `${book.name} ${i + 1}`, type: 'narrative', storyGroup: null, storyPosition: null, stopCount: 3 });
    if (id % 2 === 0 || book.name === 'Ruth') baked[id] = 3;
  });
}
const collected = new Set();
for (let i = 0; i < 150; i++) collected.add(`character:p${i}`);
for (let i = 0; i < 60; i++) collected.add(`place:x${i}`);
collected.add('cookie:prophecy:1:promise:Genesis 22:18');
collected.add('cookie:prophecy:1:fulfillment:Galatians 3:16');
const memorized = [];
for (let v = 1; v <= 6; v++) memorized.push(`Ps.23.${v}`);
for (let v = 1; v <= 114; v++) memorized.push(`John.${(v % 21) + 1}.${v}`);

const facts = { outlines, baked, collected, memorized, mysterySolved: true, friendCount: 3, streak: 12 };
const earned = earnedBadges(facts);
console.log(`${outlines.length} lessons, ${BADGES.length} badges, ${earned.size} earned:`);
console.log(`  ${[...earned].join(', ')}`);

const runs = 200;
earnedBadges(facts);
const t = performance.now();
for (let i = 0; i < runs; i++) earnedBadges(facts);
console.log(`working out the badges: ${((performance.now() - t) / runs).toFixed(2)} ms each (done once per change, not per frame)`);
