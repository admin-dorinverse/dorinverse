// The Bible reader's data for pages. The outline ships inside the app. Everything else is one in-memory
// library, loaded from the phone when the app starts and topped up with only what is missing; after that,
// opening the book list, a chapter or search reads memory and never waits on a download.

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { chapterPage, makeLibrary, revealedTexts } from '@/data/bibleLibrary';
import { bibleOutline } from '@/data/bibleSource';
import { syncBible } from '@/data/bibleSync';
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
  if (saved.refs && !queryClient.getQueryData(LIBRARY_KEY)) {
    queryClient.setQueryData(LIBRARY_KEY, makeLibrary(saved.refs, saved.texts, saved.shapes));
  }
  const result = await syncBible(saved, saveBible);
  if (__DEV__) console.log(`[bible] library ready in ${Date.now() - started} ms; downloaded ${result.downloaded} verses`);
  const shown = queryClient.getQueryData<BibleLibrary>(LIBRARY_KEY);
  return !result.changed && shown ? shown : result.library;
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

/** The words of every revealed verse, by label, for search. */
export function useRevealedTexts(): Record<VerseRef, string> | undefined {
  const library = useBibleLibrary().data;
  return useMemo(() => (library ? revealedTexts(library) : undefined), [library]);
}

/** The book at a place in the Bible (1 to 66), or undefined for a wrong number. */
export function bookAt(order: number): BibleBook | undefined {
  return bibleOutline[order - 1];
}
