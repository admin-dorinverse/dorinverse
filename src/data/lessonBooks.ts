// A constellation's lessons sorted into Bible books and stories, worked out once per constellation and kept: each
// book in Bible order with its lessons, and its cards (a story told over 2+ lessons, or a lesson on its own). Also
// how many lessons are done and which lesson is "Up next". Plain functions, so the same code can be timed outside the
// app.

import { BIBLE_OUTLINE } from '@/data/bibleOutline';
import { readingSpot } from '@/data/cookieLibrary';
import type { BibleBook } from '@/types/bible';
import type { LessonId, LessonOutline, LessonType } from '@/types/lesson';

/** One card on a book page: a story told over 2 or more lessons, or a lesson that stands alone. */
export type ShelfItem =
  | {
      kind: 'story';
      /** The card's key in a list. */
      key: string;
      /** Its first lesson's number, also the story page's address. */
      firstId: LessonId;
      /** The story's name, like "Joseph and His Brothers". */
      name: string;
      /** The chapters it spans, like "Genesis 37–41". */
      span: string;
      /** Its lessons, in Bible order. */
      lessons: LessonOutline[];
    }
  | { kind: 'lesson'; key: string; lesson: LessonOutline };

/** A story card's story. */
export type ShelfStory = Extract<ShelfItem, { kind: 'story' }>;

/** One Bible book in a constellation: the book, its lessons in Bible order, and its cards in Bible order. */
export type LessonBook = { book: BibleBook; lessons: LessonOutline[]; items: ShelfItem[]; stories: number };

/** The lesson to pick up next, and whether the person has started it. */
export type UpNext = { lesson: LessonOutline; started: boolean };

/** How many stops each lesson has baked, by lesson number. */
export type BakedStops = Readonly<Record<LessonId, number>>;

/** The book name and chapters of a reference like "Genesis 40:1–41:57": ["Genesis", 40, 41]. */
function chaptersOf(reference: string): [string, number, number] | null {
  const found = reference.match(/^(.+?)\s+(\d+):\d+(?:–(\d+):\d+)?/);
  return found ? [found[1], Number(found[2]), Number(found[3] ?? found[2])] : null;
}

/** The chapters a story's lessons cover, written for people, like "Genesis 37–41" or "Ruth 1". */
function storySpan(lessons: readonly LessonOutline[]): string {
  const first = chaptersOf(lessons[0].reference);
  const last = chaptersOf(lessons[lessons.length - 1].reference);
  if (!first || !last) return lessons[0].reference;
  return first[1] === last[2] ? `${first[0]} ${first[1]}` : `${first[0]} ${first[1]}–${last[2]}`;
}

/** A book's cards: each story once, where its first lesson sits, and each lesson that stands alone. */
function shelfItems(lessons: readonly LessonOutline[]): { items: ShelfItem[]; stories: number } {
  const sizes = new Map<string, number>();
  for (const l of lessons) if (l.storyGroup) sizes.set(l.storyGroup, (sizes.get(l.storyGroup) ?? 0) + 1);
  const stories = new Map<string, LessonOutline[]>();
  const items: ShelfItem[] = [];
  for (const lesson of lessons) {
    const group = lesson.storyGroup;
    if (!group || (sizes.get(group) ?? 0) < 2) {
      items.push({ kind: 'lesson', key: `lesson${lesson.id}`, lesson });
      continue;
    }
    const told = stories.get(group);
    if (told) {
      told.push(lesson);
      continue;
    }
    const story = [lesson];
    stories.set(group, story);
    items.push({ kind: 'story', key: `story${lesson.id}`, firstId: lesson.id, name: group, span: '', lessons: story });
  }
  // Spans are written once every story has all its lessons.
  for (const item of items) if (item.kind === 'story') item.span = storySpan(item.lessons);
  return { items, stories: stories.size };
}

/** One kind of lesson sorted into its Bible books, in Bible order. A lesson whose reference can't be read is left out. */
export function lessonBooks(outlines: readonly LessonOutline[], type: LessonType): LessonBook[] {
  const byBook = new Map<number, LessonOutline[]>();
  for (const lesson of outlines) {
    if (lesson.type !== type) continue;
    const spot = readingSpot(lesson.reference);
    if (!spot) continue;
    const list = byBook.get(spot.book);
    if (list) list.push(lesson);
    else byBook.set(spot.book, [lesson]);
  }
  return [...byBook.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([order, lessons]) => ({ book: BIBLE_OUTLINE[order - 1], lessons, ...shelfItems(lessons) }));
}

/** The books worked out so far, per outline and kind of lesson, so every page reuses them. */
const kept = new WeakMap<readonly LessonOutline[], Map<LessonType, LessonBook[]>>();

/** One kind of lesson's books, worked out the first time they are asked for and kept for as long as the outline. */
export function keptLessonBooks(outlines: readonly LessonOutline[], type: LessonType): LessonBook[] {
  let perType = kept.get(outlines);
  if (!perType) kept.set(outlines, (perType = new Map()));
  let books = perType.get(type);
  if (!books) perType.set(type, (books = lessonBooks(outlines, type)));
  return books;
}

/** True when every stop of a lesson is baked. */
export function isBaked(lesson: LessonOutline, baked: BakedStops): boolean {
  return (baked[lesson.id] ?? 0) >= lesson.stopCount;
}

/** How many of the lessons have every stop baked. */
export function doneCount(lessons: readonly LessonOutline[], baked: BakedStops): number {
  let done = 0;
  for (const l of lessons) if (isBaked(l, baked)) done += 1;
  return done;
}

/**
 * The lesson to pick up next among these: the first one, in Bible order, the person is in the middle of; if none,
 * the first one not yet finished; null when all are done. Progress does not record when a stop was baked, so the
 * most recent one can't be told apart.
 */
export function upNextIn(lessons: readonly LessonOutline[], baked: BakedStops): UpNext | null {
  let firstUnfinished: LessonOutline | null = null;
  for (const lesson of lessons) {
    const stops = baked[lesson.id] ?? 0;
    if (stops >= lesson.stopCount) continue;
    if (stops > 0) return { lesson, started: true };
    firstUnfinished ??= lesson;
  }
  return firstUnfinished ? { lesson: firstUnfinished, started: false } : null;
}
