// Saves the Prophecy, Instructions and Prayers pages' data on the phone (expo-sqlite), so each cookie is downloaded
// once: the collected list, every collected cookie, and the outline of each prophecy link the person holds a half of
// (references only). Cookies hold Bible words only, so this store is not encrypted; private data will use the
// encrypted store.

import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';
import type { SavedCookies } from '@/data/cookieSync';
import type { Cookie, CookieKey, ProphecyLinkOutline } from '@/types/cookie';

/** Bump when the tables below or a saved cookie's shape change; the store is then rebuilt and filled again. */
const STORE_VERSION = 1;

/** The open store, made on first use. */
let opening: Promise<SQLiteDatabase> | null = null;

/** Opens the store and makes its tables the first time. */
function store(): Promise<SQLiteDatabase> {
  opening ??= (async () => {
    const db = await openDatabaseAsync('cookies.db');
    await db.execAsync('PRAGMA journal_mode = WAL');
    const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
    if ((row?.user_version ?? 0) !== STORE_VERSION) {
      await db.execAsync(`
        DROP TABLE IF EXISTS meta; DROP TABLE IF EXISTS cookie; DROP TABLE IF EXISTS link;
        CREATE TABLE meta (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);
        CREATE TABLE cookie (key TEXT PRIMARY KEY NOT NULL, data TEXT NOT NULL);
        CREATE TABLE link (link_no INTEGER PRIMARY KEY NOT NULL, data TEXT NOT NULL);
        PRAGMA user_version = ${STORE_VERSION};
      `);
    }
    return db;
  })();
  return opening;
}

/** Reads everything saved, in three quick reads. Before the first load the collected list is null. */
export async function readSavedCookies(): Promise<SavedCookies> {
  const db = await store();
  const [list, rows, linkRows] = await Promise.all([
    db.getFirstAsync<{ value: string }>("SELECT value FROM meta WHERE key = 'collected'"),
    db.getAllAsync<{ key: string; data: string }>('SELECT key, data FROM cookie'),
    db.getAllAsync<{ link_no: number; data: string }>('SELECT link_no, data FROM link'),
  ]);
  const cookies: Record<CookieKey, Cookie> = {};
  for (const r of rows) cookies[r.key] = JSON.parse(r.data) as Cookie;
  const links: Record<number, ProphecyLinkOutline> = {};
  for (const r of linkRows) links[r.link_no] = JSON.parse(r.data) as ProphecyLinkOutline;
  return { list: list ? (JSON.parse(list.value) as CookieKey[]) : null, cookies, links };
}

/**
 * Saves the collected list and the new cookies in one go, drops any cookie no longer in the list, and replaces the
 * link outlines with the ones given (a few short rows).
 */
export async function saveCookies(list: readonly CookieKey[], added: readonly Cookie[], links: readonly ProphecyLinkOutline[]): Promise<void> {
  const db = await store();
  const listText = JSON.stringify(list);
  await db.withExclusiveTransactionAsync(async (txn) => {
    await txn.runAsync("INSERT OR REPLACE INTO meta (key, value) VALUES ('collected', ?)", listText);
    await txn.runAsync('DELETE FROM cookie WHERE key NOT IN (SELECT value FROM json_each(?))', listText);
    await txn.runAsync('DELETE FROM link');
    const put = await txn.prepareAsync('INSERT OR REPLACE INTO cookie (key, data) VALUES (?, ?)');
    const putLink = await txn.prepareAsync('INSERT INTO link (link_no, data) VALUES (?, ?)');
    try {
      for (const cookie of added) await put.executeAsync(cookie.key, JSON.stringify(cookie));
      for (const link of links) await putLink.executeAsync(link.linkNo, JSON.stringify(link));
    } finally {
      await put.finalizeAsync();
      await putLink.finalizeAsync();
    }
  });
}
