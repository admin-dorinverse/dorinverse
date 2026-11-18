// The Prophecy, Instructions and Prayers pages' data work that needs no screen: building the in-memory library
// (joining prophecy halves into links), filtering commands by who gave them, and finding where a reference opens in
// the Bible reader. Plain functions, so the same code can be timed outside the app.

import { BIBLE_OUTLINE } from '@/data/bibleOutline';
import type { VerseRef } from '@/types/bible';
import type {
  Cookie,
  CookieKey,
  CookieLibrary,
  HalfSlot,
  InstructionCookie,
  LinkHalf,
  PrayerCookie,
  ProphecyCard,
  ProphecyCookie,
  ProphecyLinkOutline,
} from '@/types/cookie';

/** Book names that references write differently from the outline, like "Psalm 110:4". */
const NAME_ALIASES: Readonly<Record<string, string>> = { Psalm: 'Psalms', 'Song of Songs': 'Song of Solomon' };

/** Each book by name, for reading a reference. */
const BOOKS = new Map(BIBLE_OUTLINE.map((b) => [b.name, b]));

/** Where a reference opens in the reader: the book's place (1 to 66), the chapter, and its first verse's label. */
export type ReadingSpot = { book: number; chapter: number; firstVerse: VerseRef };

/** Where a reference like "Genesis 24:12-14" starts, or null when it can't be read. */
export function readingSpot(reference: string): ReadingSpot | null {
  const found = reference.trim().match(/^(.+?)\s+(\d+):(\d+)/);
  if (!found) return null;
  const book = BOOKS.get(NAME_ALIASES[found[1]] ?? found[1]);
  if (!book) return null;
  const chapter = Number(found[2]);
  return { book: book.order, chapter, firstVerse: `${book.code}.${chapter}.${Number(found[3])}` };
}

/** A number that puts references in Bible order (book, then chapter); unreadable ones go last. */
function bibleOrder(reference: string): number {
  const spot = readingSpot(reference);
  return spot ? spot.book * 1000 + spot.chapter : 1e9;
}

/** True when two collected lists hold the same cookies in the same order. */
export function sameCookieList(a: readonly CookieKey[], b: readonly CookieKey[]): boolean {
  return a.length === b.length && a.every((key, i) => key === b[i]);
}

/** The link numbers of the prophecy halves among the cookies, so only those links' outlines are kept. */
export function heldLinkNos(cookies: Iterable<Cookie>): Set<number> {
  const nos = new Set<number>();
  for (const cookie of cookies) if (cookie.kind === 'prophecy') nos.add(cookie.linkNo);
  return nos;
}

/** Who gave a command, for the filter chips: "Paul (quoting Proverbs)" counts as Paul. */
export function giverOf(who: string): string {
  return who.replace(/\s*\(.*\)\s*$/, '');
}

/** The commands given by one person, or all of them when none is picked. */
export function filterInstructions(list: readonly InstructionCookie[], giver: string | null): readonly InstructionCookie[] {
  return giver ? list.filter((c) => giverOf(c.who) === giver) : list;
}

/** One spot on a link's card: the held half, or the outline's half as still to find. */
function slotFor(half: LinkHalf, held: ReadonlyMap<CookieKey, ProphecyCookie>): HalfSlot {
  const cookie = held.get(half.key);
  return cookie ? { kind: 'held', cookie } : { kind: 'missing', half };
}

/** A link's card from its outline and the halves the person holds. */
function makeProphecyCard(outline: ProphecyLinkOutline, held: ReadonlyMap<CookieKey, ProphecyCookie>): ProphecyCard | null {
  const promiseHalf = outline.halves.find((h) => h.half === 'promise');
  if (!promiseHalf) return null;
  const promise = slotFor(promiseHalf, held);
  const fulfillments = outline.halves
    .filter((h) => h.half === 'fulfillment')
    .sort((a, b) => bibleOrder(a.reference) - bibleOrder(b.reference))
    .map((h) => slotFor(h, held));
  const joined = promise.kind === 'held' && fulfillments.some((f) => f.kind === 'held');
  return { linkNo: outline.linkNo, title: outline.title, promise, fulfillments, joined };
}

/** Builds the in-memory library from the collected list (oldest first), the saved cookies and the link outlines. */
export function makeCookieLibrary(
  list: readonly CookieKey[],
  cookies: Readonly<Record<CookieKey, Cookie>>,
  links: Readonly<Record<number, ProphecyLinkOutline>>,
): CookieLibrary {
  let commandments: CookieLibrary['commandments'] = null;
  const instructions: InstructionCookie[] = [];
  const prayers: PrayerCookie[] = [];
  const held = new Map<CookieKey, ProphecyCookie>();
  const linkOrder: number[] = [];
  for (let i = list.length - 1; i >= 0; i--) {
    const cookie = cookies[list[i]];
    if (!cookie) continue;
    if (cookie.kind === 'ten_commandments') commandments = cookie;
    else if (cookie.kind === 'instruction') instructions.push(cookie);
    else if (cookie.kind === 'prayer') prayers.push(cookie);
    else {
      held.set(cookie.key, cookie);
      if (!linkOrder.includes(cookie.linkNo)) linkOrder.push(cookie.linkNo);
    }
  }
  const prophecies: ProphecyCard[] = [];
  const byLinkNo: Record<number, ProphecyCard> = {};
  for (const no of linkOrder) {
    const card = links[no] ? makeProphecyCard(links[no], held) : null;
    if (!card) continue;
    prophecies.push(card);
    byLinkNo[no] = card;
  }
  const counts = new Map<string, number>();
  for (const c of instructions) counts.set(giverOf(c.who), (counts.get(giverOf(c.who)) ?? 0) + 1);
  const givers = [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([who]) => who);
  return { commandments, instructions, givers, prayers, prophecies, byLinkNo, joinedCount: prophecies.filter((p) => p.joined).length };
}

/** Which prophecy links the list shows: all, only joined ones, or only ones still waiting for a half. */
export type ProphecyFilter = 'all' | 'joined' | 'waiting';

/** The links that match the picked filter. */
export function filterProphecies(cards: readonly ProphecyCard[], filter: ProphecyFilter): readonly ProphecyCard[] {
  if (filter === 'all') return cards;
  return cards.filter((c) => (filter === 'joined' ? c.joined : !c.joined));
}
