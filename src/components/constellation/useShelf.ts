// What every page of a constellation's lessons needs: the constellation, its cookie pictures and card colors, the
// person's baked stops, its books, and a way to open a lesson. Also the rows each page's list draws, worked out only
// when the books or the baked stops change.

import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { cookieArtFor } from '@/components/common/cookieArt';
import { cardLook } from '@/components/constellation/LessonCard';
import { useSky } from '@/components/sky/SkyProvider';
import { upNextIn, type BakedStops, type LessonBook, type ShelfItem, type UpNext } from '@/data/lessonBooks';
import { useLessonBooks } from '@/data/queries/lessons';
import { useProgress } from '@/data/queries/progress';
import type { LessonId, LessonOutline } from '@/types/lesson';

/** Nothing baked: used until progress loads. */
const NOTHING_BAKED: BakedStops = {};

/** The constellation page's rows: "Up next", a testament heading, or two book tiles side by side. */
export type BooksRow =
  | { kind: 'upNext'; key: string; next: UpNext; lessonIds: LessonId[] }
  | { kind: 'heading'; key: string; title: string; lessonIds: LessonId[] }
  | { kind: 'pair'; key: string; books: LessonBook[]; lessonIds: LessonId[] };

/** A book page's rows: "Up next", or a story or lone lesson card. */
export type ShelfRow = { kind: 'upNext'; key: string; next: UpNext; lessonIds: LessonId[] } | { kind: 'item'; key: string; item: ShelfItem; lessonIds: LessonId[] };

/** A story page's rows: one per part. */
export type PartRow = { key: string; lesson: LessonOutline; lessonIds: LessonId[] };

/** The page's constellation (from the address), its look, the baked stops, its books, and how to open a lesson. */
export function useShelf() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { constellations } = useSky();
  const constellation = constellations.find((c) => c.id === id) ?? constellations[0];
  const books = useLessonBooks(constellation.id);
  const baked = useProgress().data?.baked ?? NOTHING_BAKED;
  const art = cookieArtFor(constellation.id);
  const look = useMemo(() => cardLook(constellation.color), [constellation.color]);

  /** Opens a lesson's orbit view. */
  // The generated route list names the orbit page "/lesson/[id]/index"; its real address is "/lesson/<id>".
  const openLesson = useCallback((lesson: LessonOutline) => router.push(`/lesson/${lesson.id}?c=${constellation.id}` as Href), [router, constellation.id]);

  return { router, constellation, books, baked, art, look, openLesson };
}

/**
 * The "Up next" row for these lessons, or nothing when every one is done. With `startedOnly`, it shows only for a
 * lesson already partly baked: subscribers can open any lesson, so a book they haven't begun needs no "Start" card.
 */
function upNextRows(lessons: readonly LessonOutline[], baked: BakedStops, startedOnly = false): { kind: 'upNext'; key: string; next: UpNext; lessonIds: LessonId[] }[] {
  const next = upNextIn(lessons, baked);
  return next && (next.started || !startedOnly) ? [{ kind: 'upNext', key: 'up-next', next, lessonIds: [next.lesson.id] }] : [];
}

/** The constellation page's rows: "Up next", then each testament's heading and its books two to a row. */
export function useBooksRows(books: readonly LessonBook[] | undefined, baked: BakedStops): BooksRow[] {
  const tiles = useMemo(() => {
    const rows: BooksRow[] = [];
    for (const [testament, title] of [['OT', 'Old Testament'], ['NT', 'New Testament']] as const) {
      const these = (books ?? []).filter((b) => b.book.testament === testament);
      if (these.length) rows.push({ kind: 'heading', key: testament, title, lessonIds: [] });
      for (let i = 0; i < these.length; i += 2) rows.push({ kind: 'pair', key: these[i].book.code, books: these.slice(i, i + 2), lessonIds: [] });
    }
    return rows;
  }, [books]);
  const lessons = useMemo(() => (books ?? []).flatMap((b) => b.lessons), [books]);
  return useMemo(() => [...upNextRows(lessons, baked), ...tiles], [lessons, baked, tiles]);
}

/** A book page's rows: "Up next" when a lesson in the book is partly baked, then its cards. A story card gets its next lesson ready. */
export function useShelfRows(book: LessonBook | undefined, baked: BakedStops): ShelfRow[] {
  return useMemo(() => {
    if (!book) return [];
    const cards: ShelfRow[] = book.items.map((item) => {
      const ready = item.kind === 'story' ? upNextIn(item.lessons, baked)?.lesson : item.lesson;
      return { kind: 'item', key: item.key, item, lessonIds: ready ? [ready.id] : [] };
    });
    return [...upNextRows(book.lessons, baked, true), ...cards];
  }, [book, baked]);
}

/** A story page's rows, one per part, each getting its lesson ready. */
export function usePartRows(lessons: readonly LessonOutline[] | undefined): PartRow[] {
  return useMemo(() => (lessons ?? []).map((lesson) => ({ key: String(lesson.id), lesson, lessonIds: [lesson.id] })), [lessons]);
}
