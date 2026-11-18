// The Places pages' data for pages. One in-memory library, loaded from the phone when the app starts and topped up
// with only the missing cards; then every collected place's two small photos are put in the phone's photo cache.
// After that, the grid, a place's page and "Find in scripture" read memory and never wait on a download.

import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useMemo } from 'react';
import { kindSign, makePlaceLibrary } from '@/data/placeLibrary';
import { syncPlaces } from '@/data/placeSync';
import { useBibleLibrary } from '@/data/queries/bible';
import { queryClient } from '@/data/queries/client';
import { readSavedPlaces, savePlaces } from '@/data/storage/placeStore';
import type { VerseRef } from '@/types/bible';
import type { CollectedPlace } from '@/types/collection';
import type { FoundPlace, PlaceLibrary, PlaceLookup } from '@/types/place';

export { creditLine, filterPlaces, kindSign, placeCharacters, type PlaceCharacterRow } from '@/data/placeLibrary';
export { sortByName, type ListOrder } from '@/data/collectedLists';

/** The library's place in the query cache. */
const PLACES_KEY = ['places', 'library'] as const;

/**
 * Puts every collected place's thumbnail and header photo in the phone's disk cache, so a page never waits on a
 * photo. Photos already in the cache are not downloaded again. A failure only means the plain look shows.
 */
async function keepPhotos(library: PlaceLibrary): Promise<void> {
  const urls = library.places.flatMap((p) => (p.photo ? [p.photo.small, p.photo.header] : []));
  if (urls.length === 0) return;
  const started = Date.now();
  const ok = await Image.prefetch(urls, 'disk').catch(() => false);
  if (__DEV__) console.log(`[places] ${urls.length} photos ${ok ? 'on the phone' : 'not all fetched'} after ${Date.now() - started} ms`);
}

/**
 * Loads the library. What the phone holds is shown right away; then the collected list is checked and only
 * missing cards are downloaded. When nothing is missing, no download happens.
 */
async function loadPlaces(): Promise<PlaceLibrary> {
  const started = Date.now();
  const saved = await readSavedPlaces();
  if (saved.list && !queryClient.getQueryData(PLACES_KEY)) {
    queryClient.setQueryData(PLACES_KEY, makePlaceLibrary(saved.list, saved.cards));
  }
  const result = await syncPlaces(saved, savePlaces);
  if (__DEV__) console.log(`[places] library ready in ${Date.now() - started} ms; downloaded ${result.downloaded} cards`);
  const shown = queryClient.getQueryData<PlaceLibrary>(PLACES_KEY);
  const library = !result.changed && shown ? shown : result.library;
  void keepPhotos(library);
  return library;
}

/** The library query's settings, shared by the start-up load and the pages. Kept for as long as the app runs. */
const placesQuery = { queryKey: PLACES_KEY, queryFn: loadPlaces, staleTime: Infinity, gcTime: Infinity } as const;

/** Starts loading the library in the background. The root layout calls this once when the app starts. */
export function startPlacesLoad(): void {
  void queryClient.prefetchQuery(placesQuery);
}

/** The in-memory library of collected places. */
export function usePlaceLibrary() {
  return useQuery(placesQuery);
}

/** One collected place by lookup, or undefined until loaded (or when not collected). */
export function usePlace(lookup: PlaceLookup | undefined): FoundPlace | undefined {
  const library = usePlaceLibrary().data;
  return lookup ? library?.byLookup[lookup] : undefined;
}

/** The labels of the verses that name a place, as a set, for "Find in scripture". */
export function usePlaceVerseRefs(lookup: PlaceLookup | undefined): ReadonlySet<VerseRef> | undefined {
  const place = usePlace(lookup);
  return useMemo(() => (place ? new Set(place.verseRefs) : undefined), [place]);
}

/** How many of the verses that name a place the person has revealed, or undefined until both libraries are loaded. */
export function usePlaceRevealedCount(place: FoundPlace | undefined): number | undefined {
  const bible = useBibleLibrary().data;
  return useMemo(() => (bible && place ? place.verseRefs.filter((ref) => bible.refs.has(ref)).length : undefined), [bible, place]);
}

/** The lookup of the collected place with this database place id, or undefined when it is not collected. */
export function useCollectedPlaceLookup(placeId: string): PlaceLookup | undefined {
  return usePlaceLibrary().data?.byPlaceId[placeId]?.lookup;
}

/** No places yet, used by the Collections card until the library is loaded. */
const NO_PINS: readonly CollectedPlace[] = [];

/** The newest three collected places as the Collections card's map pins them, oldest first. */
export function usePlacePins(): readonly CollectedPlace[] {
  const library = usePlaceLibrary().data;
  return useMemo(
    () =>
      library
        ? library.places
            .slice(0, 3)
            .reverse()
            .map((p) => ({ name: p.name, book: p.book, emoji: kindSign(p.kind) }))
        : NO_PINS,
    [library],
  );
}
