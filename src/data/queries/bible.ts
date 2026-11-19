// The Bible reader's data for pages. The outline ships inside the app. Everything else is one in-memory
// library, loaded from the phone when the app starts and topped up with only what is missing; after that,
// opening the book list, a chapter or search reads memory and never waits on a download.

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { chapterPage, makeLibrary } from '@/data/bibleLibrary';
import { makeSearchIndex, type SearchIndex, type VerseHit } from '@/data/bibleSearch';
import { bibleOutline } from '@/data/bibleSource';
import { syncBible, type SaveBible, type SavedBible } from '@/data/bibleSync';
import { queryClient } from '@/data/queries/client';
import { readSavedBible, saveBible } from '@/data/storage/bibleStore';
import type { BibleBook, BibleLibrary, ChapterPage, VerseRef } from '@/types/bible';

export { bookRevealedCount, nearbyOpenChapter, type ChapterSpot } from '@/data/bibleLibrary';
export { bibleOutline, READER_TRANSLATION } from '@/data/bibleSource';

/** The library's place in the query cache. */
const LIBRARY_KEY = ['bible', 'library'] as const;

/**
 * Loads the library. What the phone holds is shown right away; then the revealed list is checked and only
 * missing verses are downloaded. When nothing is missing, no download happens.
 */
async function loadLibrary(): Promise<BibleLibrary> {
  const started = Date.now();
  const saved = await readSavedBible();
  held = saved;
  if (saved.refs && !queryClient.getQueryData(LIBRARY_KEY)) {
    queryClient.setQueryData(LIBRARY_KEY, makeLibrary(saved.refs, saved.texts, saved.shapes, saved.notes));
  }
  const result = await syncBible(saved, keepBible);
  if (__DEV__) console.log(`[bible] library ready in ${Date.now() - started} ms; downloaded ${result.downloaded} verses`);
  const shown = queryClient.getQueryData<BibleLibrary>(LIBRARY_KEY);
  return !result.changed && shown ? shown : result.library;
}

/** What the phone holds, kept in memory after the first load so a refresh never reads the whole store again. */
let held: SavedBible | null = null;

/** Saves on the phone, and keeps the in-memory copy of what the phone holds the same. */
const keepBible: SaveBible = async (refs, earned) => {
  await saveBible(refs, earned);
  if (held) {
    held = {
      refs: [...refs],
      texts: { ...held.texts, ...earned.texts },
      shapes: { ...held.shapes, ...earned.shapes },
      notes: { ...held.notes, ...earned.notes },
    };
  }
};

/**
 * Picks up newly revealed verses (after a lesson stop is baked) without a restart: the revealed list is checked
 * again and only the new verses' words and their chapters' word lengths are downloaded, in one round.
 */
export async function refreshBible(): Promise<void> {
  if (!held) {
    await queryClient.refetchQueries({ queryKey: LIBRARY_KEY });
    return;
  }
  const started = Date.now();
  const result = await syncBible(held, keepBible);
  if (__DEV__) console.log(`[bible] refreshed in ${Date.now() - started} ms; downloaded ${result.downloaded} verses`);
  if (result.changed) queryClient.setQueryData(LIBRARY_KEY, result.library);
}

/** The library query's settings, shared by the start-up load and the pages. Kept for as long as the app runs. */
const libraryQuery = { queryKey: LIBRARY_KEY, queryFn: loadLibrary, staleTime: Infinity, gcTime: Infinity } as const;

/** Starts loading the library in the background. The root layout calls this once when the app starts. */
export function startBibleLoad(): void {
  void queryClient.prefetchQuery(libraryQuery);
}

/** The in-memory library: the revealed list, revealed words and covered word lengths. */
export function useBibleLibrary() {
  return useQuery(libraryQuery);
}

/** One chapter page, built from memory, or undefined until the library is loaded. */
export function useChapterPage(book: BibleBook | undefined, chapter: number): ChapterPage | undefined {
  const library = useBibleLibrary().data;
  return useMemo(() => (library && book ? chapterPage(library, book, chapter) : undefined), [library, book, chapter]);
}

/** Search indexes and verse lookups already made, by library, so every page shares one of each. */
const indexes = new WeakMap<BibleLibrary, SearchIndex>();
const lookups = new WeakMap<BibleLibrary, ReadonlyMap<VerseRef, VerseHit>>();

/** The library's search index, made the first time any page asks for it. */
function indexFor(library: BibleLibrary): SearchIndex {
  let index = indexes.get(library);
  if (!index) indexes.set(library, (index = makeSearchIndex(bibleOutline, library)));
  return index;
}

/** The revealed verses prepared for search, made once each time the library changes (never per keystroke). */
export function useSearchIndex(): SearchIndex | undefined {
  const library = useBibleLibrary().data;
  return library ? indexFor(library) : undefined;
}

/** Every revealed verse by its reference, made once each time the library changes. */
export function useVerseLookup(): ReadonlyMap<VerseRef, VerseHit> | undefined {
  const library = useBibleLibrary().data;
  if (!library) return undefined;
  let lookup = lookups.get(library);
  if (!lookup) lookups.set(library, (lookup = new Map(indexFor(library).map((v) => [v.ref, v]))));
  return lookup;
}

/** The book at a place in the Bible (1 to 66), or undefined for a wrong number. */
export function bookAt(order: number): BibleBook | undefined {
  return bibleOutline[order - 1];
}
