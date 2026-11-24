// Keeps the badges whose reward pop-up the person has already seen, on the phone (expo-sqlite's key-value store), so
// each pop-up shows once. Pages read the list through useCelebrated, which redraws them when it changes.

import Storage from 'expo-sqlite/kv-store';
import { useSyncExternalStore } from 'react';
import type { BadgeId } from '@/types/badges';

/** Where the list is saved. */
const KEY = 'rewards.celebratedBadges';

/** The list in memory: null until read, and still null after reading when nothing was ever saved. */
let list: ReadonlySet<BadgeId> | null = null;

/** True once the phone has been read. */
let read = false;

/** Pages listening for changes. */
const listeners = new Set<() => void>();

/** The saved list, or null when nothing was ever saved (a phone that has not been set up for rewards yet). */
function current(): ReadonlySet<BadgeId> | null {
  if (read) return list;
  read = true;
  try {
    const saved = Storage.getItemSync(KEY);
    list = saved ? new Set(JSON.parse(saved) as BadgeId[]) : null;
  } catch {
    list = null;
  }
  return list;
}

/** Saves a new list and tells the listening pages. */
function save(next: ReadonlySet<BadgeId>): void {
  list = next;
  read = true;
  Storage.setItemSync(KEY, JSON.stringify([...next]));
  listeners.forEach((l) => l());
}

/** Marks badges as celebrated, so their pop-ups never show again. */
export function markCelebrated(ids: Iterable<BadgeId>): void {
  save(new Set([...(current() ?? []), ...ids]));
}

/** The badges already celebrated, or null on a phone never set up for rewards. Redraws the page when it changes. */
export function useCelebrated(): ReadonlySet<BadgeId> | null {
  return useSyncExternalStore((onChange) => {
    listeners.add(onChange);
    return () => listeners.delete(onChange);
  }, current);
}
