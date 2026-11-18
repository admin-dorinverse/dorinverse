// Saves the Bible reader's data on the phone (expo-sqlite), so each verse is downloaded once: the list of
// revealed verses, revealed verses' words and footnotes, and covered verses' word lengths (never their words).
// Bible text is public, so this store is not encrypted; private data will use the encrypted store.

import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';
import type { EarnedVerses } from '@/data/bibleSource';
import type { SavedBible } from '@/data/bibleSync';
import type { Footnote, VerseRef } from '@/types/bible';

/** Bump when the tables below change shape; the store is then rebuilt and filled again from the server. */
const STORE_VERSION = 3;

/** The open store, made on first use. */
let opening: Promise<SQLiteDatabase> | null = null;

/** Opens the store and makes its tables the first time. */
function store(): Promise<SQLiteDatabase> {
  opening ??= (async () => {
    const db = await openDatabaseAsync('bible.db');
    await db.execAsync('PRAGMA journal_mode = WAL');
    const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
    if ((row?.user_version ?? 0) !== STORE_VERSION) {
      await db.execAsync(`
        DROP TABLE IF EXISTS meta; DROP TABLE IF EXISTS verse_text; DROP TABLE IF EXISTS verse_shape;
        CREATE TABLE meta (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);
        CREATE TABLE verse_text (ref TEXT PRIMARY KEY NOT NULL, text TEXT NOT NULL, notes TEXT);
        CREATE TABLE verse_shape (ref TEXT PRIMARY KEY NOT NULL, lengths TEXT NOT NULL);
        PRAGMA user_version = ${STORE_VERSION};
      `);
    }
    return db;
  })();
  return opening;
}

/**
 * Reads everything saved, in three quick reads. Before the first load the revealed list is null.
 * A verse whose footnotes were never saved has no entry in `notes`, so they are asked for again.
 */
export async function readSavedBible(): Promise<SavedBible> {
  const db = await store();
  const [list, textRows, shapeRows] = await Promise.all([
    db.getFirstAsync<{ value: string }>("SELECT value FROM meta WHERE key = 'revealed'"),
    db.getAllAsync<{ ref: string; text: string; notes: string | null }>('SELECT ref, text, notes FROM verse_text'),
    db.getAllAsync<{ ref: string; lengths: string }>('SELECT ref, lengths FROM verse_shape'),
  ]);
  const texts: Record<VerseRef, string> = {};
  const notes: Record<VerseRef, Footnote[]> = {};
  for (const r of textRows) {
    texts[r.ref] = r.text;
    if (r.notes !== null) notes[r.ref] = JSON.parse(r.notes) as Footnote[];
  }
  const shapes: Record<VerseRef, number[]> = {};
  for (const r of shapeRows) shapes[r.ref] = r.lengths ? r.lengths.split(',').map(Number) : [];
  return { refs: list ? (JSON.parse(list.value) as VerseRef[]) : null, texts, shapes, notes };
}

/**
 * Saves the revealed list and newly downloaded verses in one go. A verse that is now revealed loses its
 * saved word lengths, since its words are saved instead.
 */
export async function saveBible(refs: readonly VerseRef[], earned: EarnedVerses): Promise<void> {
  const db = await store();
  await db.withExclusiveTransactionAsync(async (txn) => {
    await txn.runAsync("INSERT OR REPLACE INTO meta (key, value) VALUES ('revealed', ?)", JSON.stringify(refs));
    const putText = await txn.prepareAsync('INSERT OR REPLACE INTO verse_text (ref, text, notes) VALUES (?, ?, ?)');
    const dropShape = await txn.prepareAsync('DELETE FROM verse_shape WHERE ref = ?');
    const putShape = await txn.prepareAsync('INSERT OR REPLACE INTO verse_shape (ref, lengths) VALUES (?, ?)');
    try {
      for (const [ref, text] of Object.entries(earned.texts)) {
        const notes = earned.notes[ref];
        await putText.executeAsync(ref, text, notes ? JSON.stringify(notes) : null);
        await dropShape.executeAsync(ref);
      }
      for (const [ref, lengths] of Object.entries(earned.shapes)) await putShape.executeAsync(ref, lengths.join(','));
    } finally {
      await Promise.all([putText.finalizeAsync(), dropShape.finalizeAsync(), putShape.finalizeAsync()]);
    }
  });
}
