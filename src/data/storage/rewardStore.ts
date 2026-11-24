// Keeps two things about badge levels on the phone (expo-sqlite's key-value store), by keys like "baker:2": the day
// each level was first reached, for the badge page's date, and which levels' pop-ups were already seen, so each
// shows once. DEVELOPMENT ONLY for the dates: at hookup the server keeps when each level was earned.

import Storage from 'expo-sqlite/kv-store';
import { useSyncExternalStore } from 'react';

/** Where the record is saved. */
const KEY = 'rewards.levels';

/** What is kept about badge levels. */
export type RewardRecord = {
  /** When each level was first reached (an ISO date), or null when it was reached before dates were kept. */
  reached: Readonly<Record<string, string | null>>;
  /** The levels whose pop-up was seen. */
  celebrated: readonly string[];
};

/** The record in memory, or null when nothing was ever saved (a phone not yet set up for rewards). */
let record: RewardRecord | null = null;

/** True once the phone has been read. */
let read = false;

/** Pages listening for changes. */
const listeners = new Set<() => void>();

/** The saved record, read from the phone the first time. */
function current(): RewardRecord | null {
  if (read) return record;
  read = true;
  try {
    const saved = Storage.getItemSync(KEY);
    record = saved ? (JSON.parse(saved) as RewardRecord) : null;
  } catch {
    record = null;
  }
  return record;
}

/** Saves a new record and tells the listening pages. */
function save(next: RewardRecord): void {
  record = next;
  read = true;
  Storage.setItemSync(KEY, JSON.stringify(next));
  listeners.forEach((l) => l());
}

/**
 * Notes levels as reached, keeping the first date for each. On a phone not yet set up, every level already reached
 * is noted with no date and counted as celebrated, so an existing baker isn't flooded with pop-ups.
 */
export function noteReached(keys: readonly string[]): void {
  const now = current();
  if (!now) {
    save({ reached: Object.fromEntries(keys.map((k) => [k, null])), celebrated: [...keys] });
    return;
  }
  const fresh = keys.filter((k) => !(k in now.reached));
  if (fresh.length === 0) return;
  const today = new Date().toISOString();
  save({ ...now, reached: { ...now.reached, ...Object.fromEntries(fresh.map((k) => [k, today])) } });
}

/** Marks a level's pop-up as seen, so it never shows again. */
export function markCelebrated(key: string): void {
  const now = current() ?? { reached: {}, celebrated: [] };
  if (!now.celebrated.includes(key)) save({ ...now, celebrated: [...now.celebrated, key] });
}

/** The record, or null on a phone never set up for rewards. Redraws the page when it changes. */
export function useRewardRecord(): RewardRecord | null {
  return useSyncExternalStore((onChange) => {
    listeners.add(onChange);
    return () => listeners.delete(onChange);
  }, current);
}
