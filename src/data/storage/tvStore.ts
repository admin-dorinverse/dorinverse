// Keeps the last downloaded Bakery TV schedule on the phone (expo-sqlite's key-value store), so the page opens
// straight to what is on, without waiting for a download.

import Storage from 'expo-sqlite/kv-store';
import type { TvShowing } from '@/types/tv';

/** Where the schedule is saved. */
const KEY = 'tv.showings';

/** The saved showings that have not ended yet, or an empty list when none are saved. */
export function readSavedShowings(): TvShowing[] {
  try {
    const saved = Storage.getItemSync(KEY);
    const now = Date.now();
    return saved ? (JSON.parse(saved) as TvShowing[]).filter((s) => s.endsAt > now) : [];
  } catch {
    return [];
  }
}

/** Saves the newest schedule in place of the old one. */
export function saveShowings(showings: readonly TvShowing[]): void {
  Storage.setItemSync(KEY, JSON.stringify(showings));
}
