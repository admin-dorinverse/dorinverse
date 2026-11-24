// Which badges the person has earned. This is the one file that changes at hookup: pages never decide badges.
//
// How it will work at hookup: the server decides every badge from what it records (lessons, streak, collections,
// calls, chats, trivia), and the earned list comes in the one download after sign-in, then with each change.
//
// Today (development): there is no badge server yet, so this works badges out from what the pretend server keeps on
// the phone. Badges the phone has no record for (trivia, calls, chats, first-try answers, lost streaks, people's
// mention counts, the full people list, how many mysteries were solved) stay unearned until the server does them.

import { BADGES, CONSTELLATION_BADGES } from '@/data/badgeList';
import { BIBLE_OUTLINE } from '@/data/bibleOutline';
import { bookOf } from '@/data/collectedLists';
import { isBaked, type BakedStops } from '@/data/lessonBooks';
import type { VerseRef } from '@/types/bible';
import type { BadgeId } from '@/types/badges';
import type { LessonOutline } from '@/types/lesson';

/** DEVELOPMENT ONLY: what the phone knows that badges are worked out from. */
export type BadgeFacts = {
  /** Every lesson, or null until loaded. */
  outlines: readonly LessonOutline[] | null;
  /** Stops baked per lesson. */
  baked: BakedStops;
  /** Everything collected, as "character:lookup", "place:lookup" and "cookie:key". */
  collected: ReadonlySet<string>;
  /** Verses marked memorized. */
  memorized: readonly VerseRef[];
  /** True when a Weekly Mystery has been solved (this week or last). */
  mysterySolved: boolean;
  /** How many friends, or null while not known. */
  friendCount: number | null;
  /** Days in a row. */
  streak: number;
};

/** Each book's place in the Bible and testament, by name. */
const BOOKS = new Map(BIBLE_OUTLINE.map((b) => [b.name, b]));

/** The Psalms' code and how many verses each psalm has, for Psalm Singer. */
const PSALMS = BIBLE_OUTLINE.find((b) => b.name === 'Psalms');

/** How many collected things start with a prefix, like "place:". */
function countStarting(collected: ReadonlySet<string>, prefix: string): number {
  let n = 0;
  for (const id of collected) if (id.startsWith(prefix)) n += 1;
  return n;
}

/** How many prophecy links have both a promise and a fulfillment collected. Keys look like "prophecy:1:promise:…". */
function joinedLinks(collected: ReadonlySet<string>): number {
  const sides = new Map<string, Set<string>>();
  for (const id of collected) {
    if (!id.startsWith('cookie:prophecy:')) continue;
    const [, , no, side] = id.split(':');
    if (!sides.has(no)) sides.set(no, new Set());
    sides.get(no)!.add(side);
  }
  let n = 0;
  for (const s of sides.values()) if (s.has('promise') && s.has('fulfillment')) n += 1;
  return n;
}

/** True when every verse of at least one psalm is memorized. Verse labels look like "Ps.23.1". */
function wholePsalm(memorized: readonly VerseRef[]): boolean {
  if (!PSALMS) return false;
  const perPsalm = new Map<number, number>();
  for (const ref of memorized) {
    const [code, chapter] = ref.split('.');
    if (code !== PSALMS.code) continue;
    const c = Number(chapter);
    perPsalm.set(c, (perPsalm.get(c) ?? 0) + 1);
  }
  for (const [c, n] of perPsalm) if (n >= (PSALMS.chapterVerses[c - 1] ?? Infinity)) return true;
  return false;
}

/** The lesson badges: lesson counts, a whole book, both testaments, the six constellations and every lesson. */
function lessonBadges(outlines: readonly LessonOutline[], baked: BakedStops, earned: Set<BadgeId>): void {
  const done = outlines.filter((l) => isBaked(l, baked));
  if (done.length >= 1) earned.add('first-batch');
  if (done.length >= 13) earned.add('bakers-dozen');
  if (outlines.length > 0 && done.length === outlines.length) earned.add('front-to-back');

  const perBook = new Map<string, { all: number; done: number }>();
  for (const l of outlines) {
    const book = bookOf(l.startChapter);
    const counts = perBook.get(book) ?? { all: 0, done: 0 };
    counts.all += 1;
    if (isBaked(l, baked)) counts.done += 1;
    perBook.set(book, counts);
  }
  for (const c of perBook.values()) if (c.done === c.all) earned.add('whole-book');

  const testaments = new Set<string>();
  for (const l of done) {
    const book = BOOKS.get(bookOf(l.startChapter));
    if (!book) continue;
    testaments.add(book.testament);
  }
  for (const k of CONSTELLATION_BADGES) if (done.some((l) => l.type === k.type)) earned.add(k.id);
  if (testaments.size === 2) earned.add('old-and-new');
}

/** DEVELOPMENT ONLY: the badges earned, worked out from what the phone knows. */
export function earnedBadges(facts: BadgeFacts): ReadonlySet<BadgeId> {
  const earned = new Set<BadgeId>();
  if (facts.outlines) lessonBadges(facts.outlines, facts.baked, earned);

  for (const days of [3, 7, 30, 100, 365]) if (facts.streak >= days) earned.add(`streak-${days}`);

  const people = countStarting(facts.collected, 'character:');
  for (const n of [10, 50, 100]) if (people >= n) earned.add(`people-${n}`);
  const places = countStarting(facts.collected, 'place:');
  if (places >= 10) earned.add('places-10');
  if (places >= 50) earned.add('places-50');
  const links = joinedLinks(facts.collected);
  if (links >= 1) earned.add('prophecy-1');
  if (links >= 25) earned.add('prophecy-25');
  if (countStarting(facts.collected, 'cookie:prayer:') >= 10) earned.add('prayers-10');
  if (countStarting(facts.collected, 'cookie:instruction:') >= 25) earned.add('instructions-25');

  for (const n of [1, 10, 50, 100]) if (facts.memorized.length >= n) earned.add(`memory-${n}`);
  if (wholePsalm(facts.memorized)) earned.add('psalm-singer');

  if (facts.mysterySolved) earned.add('mystery-1');
  if ((facts.friendCount ?? 0) >= 1) earned.add('friends-1');
  if ((facts.friendCount ?? 0) >= 12) earned.add('friends-12');

  // Only ids on the list count, so a typo above can never show a badge that doesn't exist.
  return new Set(BADGES.filter((b) => earned.has(b.id)).map((b) => b.id));
}
