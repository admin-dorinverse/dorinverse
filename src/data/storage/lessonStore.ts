// Saves the lessons on the phone (expo-sqlite), so each is downloaded once: the outline of every lesson, and the full
// content of each lesson whose card has shown in a list. Lessons hold Bible lessons only, so this store is not
// encrypted. DEVELOPMENT ONLY: a saved lesson holds its sealed answer key; at hookup the server keeps it.

import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';
import type { Lesson, LessonId, LessonOutline } from '@/types/lesson';

/** Bump when the tables below or a saved lesson's shape change; the store is then rebuilt and filled again. */
const STORE_VERSION = 2;

/** The open store, made on first use. */
let opening: Promise<SQLiteDatabase> | null = null;

/** Opens the store and makes its tables the first time. */
function store(): Promise<SQLiteDatabase> {
  opening ??= (async () => {
    const db = await openDatabaseAsync('lessons.db');
    await db.execAsync('PRAGMA journal_mode = WAL');
    const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
    if ((row?.user_version ?? 0) !== STORE_VERSION) {
      await db.execAsync(`
        DROP TABLE IF EXISTS meta; DROP TABLE IF EXISTS lesson;
        CREATE TABLE meta (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);
        CREATE TABLE lesson (id INTEGER PRIMARY KEY NOT NULL, data TEXT NOT NULL);
        PRAGMA user_version = ${STORE_VERSION};
      `);
    }
    return db;
  })();
  return opening;
}

/** The saved outline, or null before the first download. */
export async function readSavedOutline(): Promise<LessonOutline[] | null> {
  const db = await store();
  const row = await db.getFirstAsync<{ value: string }>("SELECT value FROM meta WHERE key = 'outline'");
  return row ? (JSON.parse(row.value) as LessonOutline[]) : null;
}

/** Saves the outline. */
export async function saveOutline(outline: readonly LessonOutline[]): Promise<void> {
  const db = await store();
  await db.runAsync("INSERT OR REPLACE INTO meta (key, value) VALUES ('outline', ?)", JSON.stringify(outline));
}

/** One saved lesson, or null when it is not on the phone. */
export async function readSavedLesson(id: LessonId): Promise<Lesson | null> {
  const db = await store();
  const row = await db.getFirstAsync<{ data: string }>('SELECT data FROM lesson WHERE id = ?', id);
  return row ? (JSON.parse(row.data) as Lesson) : null;
}

/** Saves one lesson. */
export async function saveLesson(lesson: Lesson): Promise<void> {
  const db = await store();
  await db.runAsync('INSERT OR REPLACE INTO lesson (id, data) VALUES (?, ?)', lesson.id, JSON.stringify(lesson));
}
