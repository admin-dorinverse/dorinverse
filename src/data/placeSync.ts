// Brings the phone's place cards up to date when the app starts. It compares the collected list with the cards the
// phone already holds and downloads only missing cards, in one round. When the phone holds every card, it makes no
// download at all. The phone store is passed in, so this works the same in the app and in timing checks.

import { makePlaceLibrary, samePlaceList } from '@/data/placeLibrary';
import { fetchCollectedPlaces, fetchPlaceCards } from '@/data/placeSource';
import type { CollectedPlaceEntry, PlaceCard, PlaceLibrary, PlaceLookup } from '@/types/place';

/** What the phone holds: the collected list (null before the first load) and every saved card by lookup. */
export type SavedPlaces = { list: CollectedPlaceEntry[] | null; cards: Record<PlaceLookup, PlaceCard> };

/** Saves a new collected list and the cards that are new. */
export type SavePlaces = (list: readonly CollectedPlaceEntry[], added: readonly PlaceCard[]) => Promise<void>;

/** What a sync did: the library to show, how many cards it downloaded (0 when none were missing), and whether anything changed. */
export type PlaceSyncResult = { library: PlaceLibrary; downloaded: number; changed: boolean };

/**
 * Checks the collected list against the phone and downloads only missing cards. If a download fails but the
 * phone has a saved copy, the saved copy is used, so the pages work offline.
 */
export async function syncPlaces(saved: SavedPlaces, save: SavePlaces): Promise<PlaceSyncResult> {
  const offline = () => ({ library: makePlaceLibrary(saved.list ?? [], saved.cards), downloaded: 0, changed: false });
  let list: CollectedPlaceEntry[];
  try {
    list = await fetchCollectedPlaces();
  } catch (error) {
    if (!saved.list) throw error;
    return offline();
  }
  const missing = list.filter((e) => !saved.cards[e.lookup]).map((e) => e.lookup);
  const listChanged = !saved.list || !samePlaceList(saved.list, list);
  if (missing.length === 0) {
    if (listChanged) await save(list, []);
    return { library: makePlaceLibrary(list, saved.cards), downloaded: 0, changed: listChanged };
  }
  let added: PlaceCard[];
  try {
    added = await fetchPlaceCards(missing);
  } catch (error) {
    // Offline: keep showing what the phone has; the next start tries again.
    if (!saved.list) throw error;
    return offline();
  }
  await save(list, added);
  const cards = { ...saved.cards };
  for (const card of added) cards[card.lookup] = card;
  return { library: makePlaceLibrary(list, cards), downloaded: added.length, changed: true };
}
