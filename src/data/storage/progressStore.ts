// DEVELOPMENT ONLY: saves the pretend server's record of the person's progress on the phone (expo-sqlite): stops
// baked, verses revealed and things collected by playing. At hookup the server keeps this and this file goes away.
// It is not encrypted yet; progress will move to the encrypted store or the server.

import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';
import type { ProgressRecord } from '@/data/progressSource';

/** Bump when the record's shape changes; the store is then emptied. */
const STORE_VERSION = 1;

/** The open store, made on first use. */
let opening: Promise<SQLiteDatabase> | null = null;

/** Opens the store and makes its table the first time. */
function store(): Promise<SQLiteDatabase> {
  opening ??= (async () => {
    const db = await openDatabaseAsync('progress.db');
    await db.execAsync('PRAGMA journal_mode = WAL');
    const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
    if ((row?.user_version ?? 0) !== STORE_VERSION) {
      await db.execAsync(`
        DROP TABLE IF EXISTS meta;
        CREATE TABLE meta (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);
        PRAGMA user_version = ${STORE_VERSION};
      `);
    }
    return db;
  })();
  return opening;
}

/** The saved record, or null when nothing has been earned yet. */
export async function readProgressRecord(): Promise<ProgressRecord | null> {
  const db = await store();
  const row = await db.getFirstAsync<{ value: string }>("SELECT value FROM meta WHERE key = 'record'");
  return row ? (JSON.parse(row.value) as ProgressRecord) : null;
}

/** Saves the whole record. It is small: a few numbers and lists of labels. */
export async function saveProgressRecord(record: ProgressRecord): Promise<void> {
  const db = await store();
  await db.runAsync("INSERT OR REPLACE INTO meta (key, value) VALUES ('record', ?)", JSON.stringify(record));
}
