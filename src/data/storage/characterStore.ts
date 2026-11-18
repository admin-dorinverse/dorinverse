// Saves the Characters pages' data on the phone (expo-sqlite), so each card is downloaded once: the collected
// list and every collected character's card. Cards hold Bible facts only, so this store is not encrypted; private
// data will use the encrypted store.

import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';
import type { SavedCharacters } from '@/data/characterSync';
import type { CharacterCard, CharacterLookup, CollectedEntry } from '@/types/character';

/** Bump when the tables below or the saved card's shape change; the store is then rebuilt and filled again. */
const STORE_VERSION = 1;

/** The open store, made on first use. */
let opening: Promise<SQLiteDatabase> | null = null;

/** Opens the store and makes its tables the first time. */
function store(): Promise<SQLiteDatabase> {
  opening ??= (async () => {
    const db = await openDatabaseAsync('characters.db');
    await db.execAsync('PRAGMA journal_mode = WAL');
    const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
    if ((row?.user_version ?? 0) !== STORE_VERSION) {
      await db.execAsync(`
        DROP TABLE IF EXISTS meta; DROP TABLE IF EXISTS card;
        CREATE TABLE meta (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);
        CREATE TABLE card (lookup TEXT PRIMARY KEY NOT NULL, data TEXT NOT NULL);
        PRAGMA user_version = ${STORE_VERSION};
      `);
    }
    return db;
  })();
  return opening;
}

/** Reads everything saved, in two quick reads. Before the first load the collected list is null. */
export async function readSavedCharacters(): Promise<SavedCharacters> {
  const db = await store();
  const [list, rows] = await Promise.all([
    db.getFirstAsync<{ value: string }>("SELECT value FROM meta WHERE key = 'collected'"),
    db.getAllAsync<{ lookup: string; data: string }>('SELECT lookup, data FROM card'),
  ]);
  const cards: Record<CharacterLookup, CharacterCard> = {};
  for (const r of rows) cards[r.lookup] = JSON.parse(r.data) as CharacterCard;
  return { list: list ? (JSON.parse(list.value) as CollectedEntry[]) : null, cards };
}

/** Saves the collected list and the new or changed cards in one go. */
export async function saveCharacters(list: readonly CollectedEntry[], changed: readonly CharacterCard[]): Promise<void> {
  const db = await store();
  await db.withExclusiveTransactionAsync(async (txn) => {
    await txn.runAsync("INSERT OR REPLACE INTO meta (key, value) VALUES ('collected', ?)", JSON.stringify(list));
    const put = await txn.prepareAsync('INSERT OR REPLACE INTO card (lookup, data) VALUES (?, ?)');
    try {
      for (const card of changed) await put.executeAsync(card.lookup, JSON.stringify(card));
    } finally {
      await put.finalizeAsync();
    }
  });
}
