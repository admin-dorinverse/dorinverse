// Keeps the badge levels whose reward pop-up the person has already seen, as keys like "baker:2", on the phone
// (expo-sqlite's key-value store), so each pop-up shows once. Pages read the list through useCelebrated.

import Storage from 'expo-sqlite/kv-store';
import { useSyncExternalStore } from 'react';

/** Where the list is saved. */
const KEY = 'rewards.celebratedLevels';

/** The list in memory: null until read, and still null after reading when nothing was ever saved. */
let list: ReadonlySet<string> | null = null;

/** True once the phone has been read. */
let read = false;

/** Pages listening for changes. */
const listeners = new Set<() => void>();

/** The saved list, or null when nothing was ever saved (a phone that has not been set up for rewards yet). */
function current(): ReadonlySet<string> | null {
  if (read) return list;
  read = true;
  try {
    const saved = Storage.getItemSync(KEY);
    list = saved ? new Set(JSON.parse(saved) as string[]) : null;
  } catch {
    list = null;
  }
  return list;
}

/** Saves a new list and tells the listening pages. */
function save(next: ReadonlySet<string>): void {
  list = next;
  read = true;
  Storage.setItemSync(KEY, JSON.stringify([...next]));
  listeners.forEach((l) => l());
}

/** Marks badge levels as celebrated, so their pop-ups never show again. */
export function markCelebrated(ids: Iterable<string>): void {
  save(new Set([...(current() ?? []), ...ids]));
}

/** The badge levels already celebrated, or null on a phone never set up for rewards. Redraws the page when it changes. */
export function useCelebrated(): ReadonlySet<string> | null {
  return useSyncExternalStore((onChange) => {
    listeners.add(onChange);
    return () => listeners.delete(onChange);
  }, current);
}
