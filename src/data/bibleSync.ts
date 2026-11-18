// Brings the phone's Bible up to date when the app starts. It compares the revealed list with what the phone
// already holds and downloads only what is missing, in one round. When the phone holds everything, it makes
// no download at all. The phone store is passed in, so this works the same in the app and in timing checks.

import { bibleOutline, fetchEarnedVerses, fetchRevealedRefs, type EarnedVerses } from '@/data/bibleSource';
import { makeLibrary, missingVerses, sameRefs } from '@/data/bibleLibrary';
import type { BibleLibrary, VerseRef } from '@/types/bible';

/** What the phone holds: the revealed list (null before the first load), words and word lengths. */
export type SavedBible = {
  refs: VerseRef[] | null;
  texts: Record<VerseRef, string>;
  shapes: Record<VerseRef, readonly number[]>;
};

/** Saves a new revealed list and newly downloaded verses on the phone. */
export type SaveBible = (refs: readonly VerseRef[], earned: EarnedVerses) => Promise<void>;

/** What a sync did: the library to show, and how many verses it had to download (0 when nothing was missing). */
export type SyncResult = { library: BibleLibrary; downloaded: number; changed: boolean };

/**
 * Checks the revealed list against the phone and downloads only missing verses. If a download fails but the
 * phone has a saved copy, the saved copy is used, so the reader works offline.
 */
export async function syncBible(saved: SavedBible, save: SaveBible): Promise<SyncResult> {
  let refs: VerseRef[];
  try {
    refs = await fetchRevealedRefs();
  } catch (error) {
    if (!saved.refs) throw error;
    return { library: makeLibrary(saved.refs, saved.texts, saved.shapes), downloaded: 0, changed: false };
  }
  const missing = missingVerses(bibleOutline, refs, saved.texts, saved.shapes);
  const count = missing.revealed.length + missing.covered.length;
  const listChanged = !saved.refs || !sameRefs(saved.refs, refs);
  if (count === 0) {
    if (listChanged) await save(refs, { texts: {}, shapes: {} });
    return { library: makeLibrary(refs, saved.texts, saved.shapes), downloaded: 0, changed: listChanged };
  }
  let earned: EarnedVerses;
  try {
    earned = await fetchEarnedVerses(missing.revealed, missing.covered);
  } catch (error) {
    // Offline: keep showing what the phone has; the next start tries again.
    if (!saved.refs) throw error;
    return { library: makeLibrary(saved.refs, saved.texts, saved.shapes), downloaded: 0, changed: false };
  }
  await save(refs, earned);
  const library = makeLibrary(refs, { ...saved.texts, ...earned.texts }, { ...saved.shapes, ...earned.shapes });
  return { library, downloaded: count, changed: true };
}
