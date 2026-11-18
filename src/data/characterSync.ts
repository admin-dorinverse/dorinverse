// Brings the phone's character cards up to date when the app starts. It compares the collected list with the
// cards the phone already holds and downloads only missing cards, in one round. When the phone holds every card,
// it makes no download at all. The phone store is passed in, so this works the same in the app and in timing checks.

import { makeCharacterLibrary, sameList, settleLinks } from '@/data/characterLibrary';
import { fetchCards, fetchCollected, type DownloadedCard } from '@/data/characterSource';
import type { CharacterCard, CharacterLibrary, CharacterLookup, CollectedEntry } from '@/types/character';

/** What the phone holds: the collected list (null before the first load) and every saved card by lookup. */
export type SavedCharacters = { list: CollectedEntry[] | null; cards: Record<CharacterLookup, CharacterCard> };

/** Saves a new collected list and the cards that are new or changed. */
export type SaveCharacters = (list: readonly CollectedEntry[], changed: readonly CharacterCard[]) => Promise<void>;

/** What a sync did: the library to show, how many cards it downloaded (0 when none were missing), and whether anything changed. */
export type CharacterSyncResult = { library: CharacterLibrary; downloaded: number; changed: boolean };

/**
 * Checks the collected list against the phone and downloads only missing cards. If a download fails but the
 * phone has a saved copy, the saved copy is used, so the pages work offline.
 */
export async function syncCharacters(saved: SavedCharacters, save: SaveCharacters): Promise<CharacterSyncResult> {
  const offline = () => ({ library: makeCharacterLibrary(saved.list ?? [], saved.cards), downloaded: 0, changed: false });
  let list: CollectedEntry[];
  try {
    list = await fetchCollected();
  } catch (error) {
    if (!saved.list) throw error;
    return offline();
  }
  const missing = list.filter((e) => !saved.cards[e.lookup]).map((e) => e.lookup);
  const listChanged = !saved.list || !sameList(saved.list, list);
  if (missing.length === 0) {
    if (listChanged) await save(list, []);
    return { library: makeCharacterLibrary(list, saved.cards), downloaded: 0, changed: listChanged };
  }
  let downloaded: DownloadedCard[];
  try {
    downloaded = await fetchCards(missing);
  } catch (error) {
    // Offline: keep showing what the phone has; the next start tries again.
    if (!saved.list) throw error;
    return offline();
  }
  const { cards, changed } = settleLinks(list, saved.cards, downloaded);
  await save(list, changed);
  return { library: makeCharacterLibrary(list, cards), downloaded: downloaded.length, changed: true };
}
