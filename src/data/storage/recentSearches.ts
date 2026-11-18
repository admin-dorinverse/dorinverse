// Keeps the person's recent Bible searches on the phone (expo-sqlite's key-value store), newest first.
// Recent searches stay on the phone only; they are never sent anywhere.

import Storage from 'expo-sqlite/kv-store';

/** Where the list is saved, and how many searches are kept. */
const KEY = 'bible.recentSearches';
const KEEP = 8;

/** The saved recent searches, newest first. */
export function readRecentSearches(): string[] {
  try {
    const saved = Storage.getItemSync(KEY);
    return saved ? (JSON.parse(saved) as string[]) : [];
  } catch {
    return [];
  }
}

/** Puts a search at the top of the recent list (once), and returns the new list. */
export function rememberSearch(query: string): string[] {
  const q = query.trim();
  if (!q) return readRecentSearches();
  const list = [q, ...readRecentSearches().filter((x) => x.toLowerCase() !== q.toLowerCase())].slice(0, KEEP);
  Storage.setItemSync(KEY, JSON.stringify(list));
  return list;
}
