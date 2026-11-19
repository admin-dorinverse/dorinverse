// Keeps the verses the person has marked "memorized" on the phone (expo-sqlite's key-value store), newest first.
// Pages read the list through useMemorizedVerses, which redraws them when the list changes.

import Storage from 'expo-sqlite/kv-store';
import { useSyncExternalStore } from 'react';
import type { VerseRef } from '@/types/bible';

/** Where the list is saved. */
const KEY = 'verseMemory.memorized';

/** The list in memory, read from the phone the first time it is needed. */
let list: readonly VerseRef[] | null = null;

/** Pages listening for changes. */
const listeners = new Set<() => void>();

/** The saved list, newest first. */
function current(): readonly VerseRef[] {
  if (list) return list;
  try {
    const saved = Storage.getItemSync(KEY);
    list = saved ? (JSON.parse(saved) as VerseRef[]) : [];
  } catch {
    list = [];
  }
  return list;
}

/** Saves a new list and tells the listening pages. */
function save(next: readonly VerseRef[]): void {
  list = next;
  Storage.setItemSync(KEY, JSON.stringify(next));
  listeners.forEach((l) => l());
}

/** Marks a verse memorized (it goes to the top of the list). */
export function markMemorized(ref: VerseRef): void {
  save([ref, ...current().filter((r) => r !== ref)]);
}

/** Takes a verse off the memorized list. */
export function unmarkMemorized(ref: VerseRef): void {
  save(current().filter((r) => r !== ref));
}

/** The memorized verses, newest first. The page redraws when the list changes. */
export function useMemorizedVerses(): readonly VerseRef[] {
  return useSyncExternalStore((onChange) => {
    listeners.add(onChange);
    return () => listeners.delete(onChange);
  }, current);
}
