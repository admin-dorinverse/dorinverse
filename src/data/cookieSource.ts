// Where the Prophecy, Instructions and Prayers pages' data comes from. This is the one file that changes at hookup:
// pages, the sync and the store never ask the database or the sample data directly, only through these functions.
//
// How it will work at hookup:
// - The server decides which cookies are collected. When a lesson collects a cookie, the lesson's reply carries
//   that cookie (and, for a prophecy half, its link's outline); the phone saves it. Nothing else is downloaded.
// - A new phone (or a reinstall) gets every collected cookie in the one compressed download right after sign-in.
//
// Today (development): the collected list is sample data, and fetchCookies below stands in for both of the above
// by asking the database directly: one request per 25 cookies (sent together), then one for the link outlines.

import { database } from '@/data/database';
import { earnedCookies } from '@/data/progressSource';
import { sampleCollectedCookies } from '@/data/sample/collectedCookies';
import type { Cookie, CookieKey, LinkHalf, ProphecyHalfSide, ProphecyLinkOutline } from '@/types/cookie';

/** How many cookies one request asks for: short enough for the web address. */
const COOKIES_PER_ASK = 25;

/** The cookie kinds these pages show; the sample table's character and place cookies have their own pages. */
const PAGE_KINDS = ['ten_commandments', 'instruction', 'prayer', 'prophecy'] as const;

/** What the cookies request asks for: the cookie, the Ten Commandments' lines, and a prophecy half's link title. */
const COOKIE_COLUMNS =
  'key, type, reference, instruction, who, reason, what_just_happened, key_line, prophecy_link_no, half, quote, ' +
  'lines:sample_cookie_line(position, text, reference), link:jesus_prophecy_link(title)';

/** One cookie row from the database. */
type CookieRow = {
  key: string;
  type: (typeof PAGE_KINDS)[number];
  reference: string | null;
  instruction: string | null;
  who: string | null;
  reason: string | null;
  what_just_happened: string | null;
  key_line: string | null;
  prophecy_link_no: number | null;
  half: ProphecyHalfSide | null;
  quote: string | null;
  lines: { position: number; text: string; reference: string }[];
  link: { title: string } | null;
};

/** One half in a link's outline, as asked for: no words, only where it is. */
type OutlineRow = { key: string; half: ProphecyHalfSide; reference: string; prophecy_link_no: number };

/** What a cookie download gives: the cookies, and the outline of every prophecy link they belong to. */
export type DownloadedCookies = { cookies: Cookie[]; links: ProphecyLinkOutline[] };

/**
 * Which cookies the person has collected, oldest first. Development: the sample list, then the cookies collected in
 * lessons (kept by progressSource). Hookup: the server.
 */
export async function fetchCollectedCookies(): Promise<CookieKey[]> {
  return [...new Set([...sampleCollectedCookies, ...(await earnedCookies())])];
}

/** Downloads the given cookies and the outlines of their prophecy links. */
export async function fetchCookies(keys: readonly CookieKey[]): Promise<DownloadedCookies> {
  const asks: CookieKey[][] = [];
  for (let i = 0; i < keys.length; i += COOKIES_PER_ASK) asks.push(keys.slice(i, i + COOKIES_PER_ASK));
  const replies = await Promise.all(asks.map((ask) => database.from('sample_cookie').select(COOKIE_COLUMNS).in('type', PAGE_KINDS).in('key', ask)));
  const cookies: Cookie[] = [];
  const titles = new Map<number, string>();
  for (const reply of replies) {
    if (reply.error) throw reply.error;
    for (const row of reply.data as unknown as CookieRow[]) {
      const cookie = toCookie(row);
      if (cookie) cookies.push(cookie);
      if (cookie?.kind === 'prophecy') titles.set(cookie.linkNo, row.link?.title ?? '');
    }
  }
  return { cookies, links: await fetchLinkOutlines(titles) };
}

/**
 * Downloads where every half of the given links is written. Only the key, side and reference are asked for, never
 * the words, so a half the person has not collected never has its words on the phone.
 */
async function fetchLinkOutlines(titles: ReadonlyMap<number, string>): Promise<ProphecyLinkOutline[]> {
  if (titles.size === 0) return [];
  const reply = await database.from('sample_cookie').select('key, half, reference, prophecy_link_no').eq('type', 'prophecy').in('prophecy_link_no', [...titles.keys()]);
  if (reply.error) throw reply.error;
  const halves = new Map<number, LinkHalf[]>();
  for (const row of reply.data as OutlineRow[]) {
    const list = halves.get(row.prophecy_link_no) ?? [];
    list.push({ key: row.key, half: row.half, reference: row.reference });
    halves.set(row.prophecy_link_no, list);
  }
  return [...titles].map(([linkNo, title]) => ({ linkNo, title, halves: halves.get(linkNo) ?? [] }));
}

/** Turns a database row into a cookie, or null when a row is missing what its kind needs. */
function toCookie(row: CookieRow): Cookie | null {
  switch (row.type) {
    case 'ten_commandments':
      return { kind: 'ten_commandments', key: row.key, lines: [...row.lines].sort((a, b) => a.position - b.position) };
    case 'instruction':
      if (!row.instruction || !row.reference) return null;
      return { kind: 'instruction', key: row.key, words: row.instruction, who: row.who ?? '', reference: row.reference, reason: row.reason };
    case 'prayer':
      if (!row.key_line || !row.reference) return null;
      return { kind: 'prayer', key: row.key, who: row.who ?? '', whatJustHappened: row.what_just_happened ?? '', keyLine: row.key_line, reference: row.reference };
    case 'prophecy':
      if (!row.quote || !row.reference || !row.half || row.prophecy_link_no === null) return null;
      return { kind: 'prophecy', key: row.key, linkNo: row.prophecy_link_no, half: row.half, reference: row.reference, quote: row.quote };
    default:
      return null;
  }
}
