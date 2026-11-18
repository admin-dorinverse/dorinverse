// Saves the Bible reader's data on the phone (expo-sqlite), so each piece is downloaded once:
// the outline, the list of revealed verses, revealed verses' words, and covered verses' word lengths.
// Bible text is public, so this store is not encrypted; private data will use the encrypted store.

import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';
import type { BibleOutline, VerseRef } from '@/types/bible';

/** Bump when the tables below change shape; the store is then rebuilt and filled again from the server. */
const STORE_VERSION = 1;

/** The open store, made on first use. */
let opening: Promise<SQLiteDatabase> | null = null;

/** Opens the store and makes its tables the first time. */
function store(): Promise<SQLiteDatabase> {
  opening ??= (async () => {
    const db = await openDatabaseAsync('bible.db');
    const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
    if ((row?.user_version ?? 0) !== STORE_VERSION) {
      await db.execAsync(`
        DROP TABLE IF EXISTS meta; DROP TABLE IF EXISTS verse_text; DROP TABLE IF EXISTS verse_shape;
        CREATE TABLE meta (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);
        CREATE TABLE verse_text (ref TEXT PRIMARY KEY NOT NULL, text TEXT NOT NULL);
        CREATE TABLE verse_shape (ref TEXT PRIMARY KEY NOT NULL, lengths TEXT NOT NULL);
        PRAGMA user_version = ${STORE_VERSION};
      `);
    }
    return db;
  })();
  return opening;
}

/** Reads a saved value by name, or null if nothing is saved yet. */
async function getMeta<T>(key: string): Promise<T | null> {
  const row = await (await store()).getFirstAsync<{ value: string }>('SELECT value FROM meta WHERE key = ?', key);
  return row ? (JSON.parse(row.value) as T) : null;
}

/** Saves a value by name. */
async function setMeta(key: string, value: unknown): Promise<void> {
  await (await store()).runAsync('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)', key, JSON.stringify(value));
}

/** The saved outline, or null before the first download. */
export const getSavedOutline = () => getMeta<BibleOutline>('outline');

/** Saves the outline. */
export const saveOutline = (outline: BibleOutline) => setMeta('outline', outline);

/** The saved list of revealed verse labels, or null before the first download. */
export const getSavedRevealed = () => getMeta<VerseRef[]>('revealed');

/** Saves the list of revealed verse labels. */
export const saveRevealed = (refs: readonly VerseRef[]) => setMeta('revealed', refs);

/** The saved words of the given verses, by label. Verses not saved yet are missing. */
export async function getSavedTexts(refs: readonly VerseRef[]): Promise<Record<VerseRef, string>> {
  if (refs.length === 0) return {};
  const db = await store();
  const rows = await db.getAllAsync<{ ref: string; text: string }>(
    `SELECT ref, text FROM verse_text WHERE ref IN (${refs.map(() => '?').join(',')})`,
    ...refs,
  );
  return Object.fromEntries(rows.map((r) => [r.ref, r.text]));
}

/** Saves revealed verses' words, by label. */
export async function saveTexts(texts: Record<VerseRef, string>): Promise<void> {
  const db = await store();
  await db.withTransactionAsync(async () => {
    for (const [ref, text] of Object.entries(texts)) await db.runAsync('INSERT OR REPLACE INTO verse_text (ref, text) VALUES (?, ?)', ref, text);
  });
}

/** The saved word lengths of the given covered verses, by label. */
export async function getSavedShapes(refs: readonly VerseRef[]): Promise<Record<VerseRef, number[]>> {
  if (refs.length === 0) return {};
  const db = await store();
  const rows = await db.getAllAsync<{ ref: string; lengths: string }>(
    `SELECT ref, lengths FROM verse_shape WHERE ref IN (${refs.map(() => '?').join(',')})`,
    ...refs,
  );
  return Object.fromEntries(rows.map((r) => [r.ref, JSON.parse(r.lengths) as number[]]));
}

/** Saves covered verses' word lengths, by label. */
export async function saveShapes(shapes: Record<VerseRef, number[]>): Promise<void> {
  const db = await store();
  await db.withTransactionAsync(async () => {
    for (const [ref, lengths] of Object.entries(shapes)) await db.runAsync('INSERT OR REPLACE INTO verse_shape (ref, lengths) VALUES (?, ?)', ref, JSON.stringify(lengths));
  });
}
