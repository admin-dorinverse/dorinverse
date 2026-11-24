// Which badge levels the person has reached. This is the one file that changes at hookup: pages never decide badges.
//
// How it will work at hookup: the server decides every badge level from what it records (lessons, streak,
// collections, calls, chats, trivia), and the reached list comes in the one download after sign-in, then with each
// change.
//
// Today (development): there is no badge server yet, so this works levels out from what the pretend server keeps on
// the phone. Levels the phone has no record for (trivia, calls, chats, first-try answers, lost streaks, people's
// mention counts, how many Weekly Words were guessed) stay unreached until the server does them.

import { BADGES, CONSTELLATIONS } from '@/data/badgeList';
import { BIBLE_OUTLINE } from '@/data/bibleOutline';
import { bookOf } from '@/data/collectedLists';
import { isBaked, type BakedStops } from '@/data/lessonBooks';
import type { BadgeLevelId, CountKind } from '@/types/badges';
import type { LessonOutline } from '@/types/lesson';

/** DEVELOPMENT ONLY: what the phone knows that badges are worked out from. */
export type BadgeFacts = {
  /** Every lesson, or null until loaded. */
  outlines: readonly LessonOutline[] | null;
  /** Stops baked per lesson. */
  baked: BakedStops;
  /** Everything collected, as "character:lookup", "place:lookup" and "cookie:key". */
  collected: ReadonlySet<string>;
  /** True when a Weekly Word has been guessed (this week or last). */
  wordGuessed: boolean;
  /** Days in a row. */
  streak: number;
};

/** Each book's place in the Bible and testament, by name. */
const BOOKS = new Map(BIBLE_OUTLINE.map((b) => [b.name, b]));

/** Every level id on the badge list, so a typo below can never count a level that doesn't exist. */
const ALL_LEVELS = new Set(BADGES.flatMap((b) => b.levels.map((l) => l.id)));

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

/** The one-time lesson badges and Stargazer: a whole book, both testaments and the six constellations. */
function lessonLevels(outlines: readonly LessonOutline[], done: readonly LessonOutline[], earned: Set<BadgeLevelId>): void {
  const perBook = new Map<string, { all: number; done: number }>();
  for (const l of outlines) {
    const book = bookOf(l.startChapter);
    const counts = perBook.get(book) ?? { all: 0, done: 0 };
    counts.all += 1;
    perBook.set(book, counts);
  }
  for (const l of done) perBook.get(bookOf(l.startChapter))!.done += 1;
  for (const c of perBook.values()) if (c.done === c.all) earned.add('whole-book');

  const testaments = new Set<string>();
  for (const l of done) {
    const book = BOOKS.get(bookOf(l.startChapter));
    if (book) testaments.add(book.testament);
  }
  if (testaments.size === 2) earned.add('old-and-new');
  for (const k of CONSTELLATIONS) if (done.some((l) => l.type === k.type)) earned.add(k.id);
}

/** DEVELOPMENT ONLY: the badge levels reached, worked out from what the phone knows. */
export function earnedLevels(facts: BadgeFacts): ReadonlySet<BadgeLevelId> {
  const earned = new Set<BadgeLevelId>();
  const done = facts.outlines ? facts.outlines.filter((l) => isBaked(l, facts.baked)) : [];
  if (facts.outlines) lessonLevels(facts.outlines, done, earned);

  // Every lesson finished counts as the last Baker level, even if more lessons were added since TOTALS was counted.
  const allLessons = facts.outlines != null && facts.outlines.length > 0 && done.length === facts.outlines.length;
  const counts: Record<CountKind, number> = {
    lessons: allLessons ? Infinity : done.length,
    streak: facts.streak,
    people: countStarting(facts.collected, 'character:'),
    places: countStarting(facts.collected, 'place:'),
    prophecyLinks: joinedLinks(facts.collected),
    weeklyWords: facts.wordGuessed ? 1 : 0,
    prayers: countStarting(facts.collected, 'cookie:prayer:'),
    instructions: countStarting(facts.collected, 'cookie:instruction:'),
  };
  for (const badge of BADGES) {
    if (!badge.counts) continue;
    for (const l of badge.levels) if (l.goal != null && counts[badge.counts] >= l.goal) earned.add(l.id);
  }

  return new Set([...earned].filter((id) => ALL_LEVELS.has(id)));
}
