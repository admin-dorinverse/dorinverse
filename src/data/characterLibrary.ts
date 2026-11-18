// The Characters pages' data work that needs no screen: building the in-memory library, sorting downloaded links
// into ones to show and ones only counted, filtering the grid, and grouping a character's links into rows.
// Plain functions, so the same code can be timed outside the app.

import { BIBLE_OUTLINE } from '@/data/bibleOutline';
import type { DownloadedCard } from '@/data/characterSource';
import type { CharacterCard, CharacterLibrary, CharacterLookup, CollectedEntry, MetCharacter } from '@/types/character';

/** How each kind of link is shown, from the link standard (scripts/character-web/link-types.md). */
export const LINK_LABELS: Readonly<Record<string, string>> = {
  family: 'Family',
  married: 'Married',
  loved: 'Loved',
  helped: 'Helped',
  worked_together: 'Worked together',
  counseled: 'Counseled',
  apostle: 'Apostle',
  followed: 'Followed',
  served: 'Served',
  anointed: 'Anointed',
  blessed: 'Blessed',
  rebuked: 'Rebuked',
  enemies: 'Enemies',
  betrayed: 'Betrayed',
  rivals: 'Rivals',
  healed: 'Healed',
  friends: 'Friends',
  covenant: 'Covenant',
  judged: 'Judged',
  put_to_death: 'Put to death',
  saved: 'Saved',
  deceived: 'Deceived',
  prophesied: 'Prophesied',
  prophecy: 'Prophecy fulfilled',
  crossed_paths: 'Crossed paths',
};

/** Each book's place in the Bible, by name, for putting the book filter in order. */
const BOOK_ORDER = new Map(BIBLE_OUTLINE.map((b) => [b.name, b.order]));

/** The book of a passage like "Judges 3" or "Song of Solomon 2": everything before the chapter number. */
export function bookOf(passage: string): string {
  const space = passage.lastIndexOf(' ');
  const first = passage.charAt(space + 1);
  return space > 0 && first >= '0' && first <= '9' ? passage.slice(0, space) : passage;
}

/** The letter on a character's round badge. */
export function initialOf(name: string): string {
  return name.charAt(0).toUpperCase();
}

/** Builds the in-memory library from the collected list (oldest first) and the saved cards. */
export function makeCharacterLibrary(list: readonly CollectedEntry[], cards: Readonly<Record<CharacterLookup, CharacterCard>>): CharacterLibrary {
  const characters: MetCharacter[] = [];
  for (let i = list.length - 1; i >= 0; i--) {
    const card = cards[list[i].lookup];
    if (card) characters.push({ ...card, metIn: list[i].metIn, book: bookOf(list[i].metIn) });
  }
  const byLookup: Record<CharacterLookup, MetCharacter> = {};
  const byId: Record<string, MetCharacter> = {};
  for (const c of characters) {
    byLookup[c.lookup] = c;
    byId[c.id] = c;
  }
  const books = [...new Set(characters.map((c) => c.book))].sort((a, b) => (BOOK_ORDER.get(a) ?? 99) - (BOOK_ORDER.get(b) ?? 99));
  return { characters, byLookup, byId, books };
}

/** True when two collected lists hold the same characters met in the same places, in the same order. */
export function sameList(a: readonly CollectedEntry[], b: readonly CollectedEntry[]): boolean {
  return a.length === b.length && a.every((e, i) => e.lookup === b[i].lookup && e.metIn === b[i].metIn);
}

/**
 * Adds newly downloaded cards to the saved ones. Each new card keeps only its links to collected characters and
 * counts the rest by id. A saved card linked to a newly collected character gets those links from the new card,
 * so new pairs show with no extra download. Returns every card, and the ones that need saving.
 */
export function settleLinks(
  list: readonly CollectedEntry[],
  saved: Readonly<Record<CharacterLookup, CharacterCard>>,
  downloaded: readonly DownloadedCard[],
): { cards: Record<CharacterLookup, CharacterCard>; changed: CharacterCard[] } {
  const wanted = new Set(list.map((e) => e.lookup));
  const collectedIds = new Set<string>();
  for (const lookup of wanted) if (saved[lookup]) collectedIds.add(saved[lookup].id);
  for (const card of downloaded) if (wanted.has(card.lookup)) collectedIds.add(card.id);
  const cards: Record<CharacterLookup, CharacterCard> = { ...saved };
  const changed: CharacterCard[] = [];
  const newById = new Map<string, DownloadedCard>();
  for (const card of downloaded) {
    if (!wanted.has(card.lookup)) continue;
    newById.set(card.id, card);
    const links = card.links.filter((l) => collectedIds.has(l.otherId));
    const hiddenIds = [...new Set(card.links.filter((l) => !collectedIds.has(l.otherId)).map((l) => l.otherId))];
    cards[card.lookup] = { ...card, links, hiddenIds };
    changed.push(cards[card.lookup]);
  }
  for (const card of Object.values(saved)) {
    const found = card.hiddenIds.filter((id) => newById.has(id));
    if (found.length === 0) continue;
    const gained = found.flatMap((id) =>
      newById.get(id)!.links.filter((l) => l.otherId === card.id).map((l) => ({ otherId: id, type: l.type, why: l.why })),
    );
    cards[card.lookup] = { ...card, links: [...card.links, ...gained], hiddenIds: card.hiddenIds.filter((id) => !newById.has(id)) };
    changed.push(cards[card.lookup]);
  }
  return { cards, changed };
}

/** The collected characters whose name (or another name) holds the search and who were met in the book, if one is picked. */
export function filterCharacters(characters: readonly MetCharacter[], query: string, book: string | null): readonly MetCharacter[] {
  const low = query.trim().toLowerCase();
  if (!low && !book) return characters;
  return characters.filter(
    (c) => (!book || c.book === book) && (!low || c.name.toLowerCase().includes(low) || c.alsoKnownAs.some((n) => n.toLowerCase().includes(low))),
  );
}

/** One row under Key relationships: the other character, the kinds of link, and the why sentence of each. */
export type LinkRow = { other: MetCharacter; labels: string[]; whys: string[] };

/**
 * A character's links grouped by the other person, plus how many linked people are not collected yet.
 * Only collected characters are named; the rest are just counted.
 */
export function linkRows(library: CharacterLibrary, character: CharacterCard): { rows: LinkRow[]; hidden: number } {
  const rows = new Map<string, LinkRow>();
  // A linked character no longer in the collected list is counted, never named.
  const gone = new Set<string>();
  for (const link of character.links) {
    const other = library.byId[link.otherId];
    if (!other) {
      gone.add(link.otherId);
      continue;
    }
    const row = rows.get(other.id) ?? { other, labels: [], whys: [] };
    row.labels.push(LINK_LABELS[link.type] ?? link.type);
    if (!row.whys.includes(link.why)) row.whys.push(link.why);
    rows.set(other.id, row);
  }
  return { rows: [...rows.values()], hidden: character.hiddenIds.length + gone.size };
}
