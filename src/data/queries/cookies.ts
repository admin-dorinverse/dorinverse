// The Prophecy, Instructions and Prayers pages' data for pages. One in-memory library, loaded from the phone when
// the app starts and topped up with only the missing cookies. After that, every list, a prophecy's page and a
// prayer's sheet read memory and never wait on a download.

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { makeCookieLibrary, readingSpot, type ReadingSpot } from '@/data/cookieLibrary';
import { syncCookies } from '@/data/cookieSync';
import { useBibleLibrary } from '@/data/queries/bible';
import { queryClient } from '@/data/queries/client';
import { readSavedCookies, saveCookies } from '@/data/storage/cookieStore';
import type { CookieLibrary } from '@/types/cookie';

export { filterInstructions, filterProphecies, giverOf, type ProphecyFilter, type ReadingSpot } from '@/data/cookieLibrary';

/** The library's place in the query cache. */
const COOKIES_KEY = ['cookies', 'library'] as const;

/**
 * Loads the library. What the phone holds is shown right away; then the collected list is checked and only
 * missing cookies are downloaded. When nothing is missing, no download happens.
 */
async function loadCookies(): Promise<CookieLibrary> {
  const started = Date.now();
  const saved = await readSavedCookies();
  if (saved.list && !queryClient.getQueryData(COOKIES_KEY)) {
    queryClient.setQueryData(COOKIES_KEY, makeCookieLibrary(saved.list, saved.cookies, saved.links));
  }
  const result = await syncCookies(saved, saveCookies);
  if (__DEV__) console.log(`[cookies] library ready in ${Date.now() - started} ms; downloaded ${result.downloaded} cookies`);
  const shown = queryClient.getQueryData<CookieLibrary>(COOKIES_KEY);
  return !result.changed && shown ? shown : result.library;
}

/** The library query's settings, shared by the start-up load and the pages. Kept for as long as the app runs. */
const cookiesQuery = { queryKey: COOKIES_KEY, queryFn: loadCookies, staleTime: Infinity, gcTime: Infinity } as const;

/** Starts loading the library in the background. The root layout calls this once when the app starts. */
export function startCookiesLoad(): void {
  void queryClient.prefetchQuery(cookiesQuery);
}

/** The in-memory library of collected cookies. */
export function useCookieLibrary() {
  return useQuery(cookiesQuery);
}

/**
 * Where a reference opens in the reader, but only when its first verse is revealed in the person's Bible; null when
 * it is still under stardust, undefined while the Bible loads.
 */
export function useRevealedSpot(reference: string | undefined): ReadingSpot | null | undefined {
  const bible = useBibleLibrary().data;
  return useMemo(() => {
    if (!bible || !reference) return undefined;
    const spot = readingSpot(reference);
    return spot && bible.refs.has(spot.firstVerse) ? spot : null;
  }, [bible, reference]);
}
