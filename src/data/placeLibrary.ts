// The Places pages' data work that needs no screen: building the in-memory library, filtering the grid, naming
// the collected characters linked to a place (and only counting the rest), and the words of a photo's credit.
// Plain functions, so the same code can be timed outside the app.

import { bookOf, booksInOrder } from '@/data/collectedLists';
import type { CharacterLibrary, MetCharacter } from '@/types/character';
import type { CollectedPlaceEntry, FoundPlace, PhotoCredit, PlaceCard, PlaceLibrary, PlaceLookup } from '@/types/place';

/** The sign shown for each kind of place where there is no photo, and on the Collections map pins. */
const KIND_SIGNS: Readonly<Record<string, string>> = {
  City: '🏛️',
  Region: '🗺️',
  Mountain: '⛰️',
  Landmark: '🪨',
  Water: '🌊',
  Island: '🏝️',
  Valley: '🏞️',
  Path: '🛤️',
};

/** The sign for a kind of place, or a pin when the kind is not known. */
export function kindSign(kind: string | null): string {
  return (kind && KIND_SIGNS[kind]) || '📍';
}

/** Builds the in-memory library from the collected list (oldest first) and the saved cards. */
export function makePlaceLibrary(list: readonly CollectedPlaceEntry[], cards: Readonly<Record<PlaceLookup, PlaceCard>>): PlaceLibrary {
  const places: FoundPlace[] = [];
  for (let i = list.length - 1; i >= 0; i--) {
    const card = cards[list[i].lookup];
    if (card) places.push({ ...card, foundIn: list[i].foundIn, book: bookOf(list[i].foundIn) });
  }
  const byLookup: Record<PlaceLookup, FoundPlace> = {};
  const byPlaceId: Record<string, FoundPlace> = {};
  for (const p of places) {
    byLookup[p.lookup] = p;
    for (const id of p.placeIds) byPlaceId[id] = p;
  }
  return { places, byLookup, byPlaceId, books: booksInOrder(places.map((p) => p.book)) };
}

/** True when two collected lists hold the same places found in the same passages, in the same order. */
export function samePlaceList(a: readonly CollectedPlaceEntry[], b: readonly CollectedPlaceEntry[]): boolean {
  return a.length === b.length && a.every((e, i) => e.lookup === b[i].lookup && e.foundIn === b[i].foundIn);
}

/** The collected places whose name holds the search and that were found in the book, if one is picked. */
export function filterPlaces(places: readonly FoundPlace[], query: string, book: string | null): readonly FoundPlace[] {
  const low = query.trim().toLowerCase();
  if (!low && !book) return places;
  return places.filter((p) => (!book || p.book === book) && (!low || p.name.toLowerCase().includes(low)));
}

/** A collected character linked to a place, and how many verses name both. */
export type PlaceCharacterRow = { character: MetCharacter; verseCount: number };

/**
 * The characters linked to a place: the collected ones by name (most verses first), and how many others are
 * not collected yet. Those are only counted, never named.
 */
export function placeCharacters(characters: CharacterLibrary | undefined, place: PlaceCard): { rows: PlaceCharacterRow[]; hidden: number } {
  const rows: PlaceCharacterRow[] = [];
  for (const link of place.characters) {
    const character = characters?.byId[link.id];
    if (character) rows.push({ character, verseCount: link.verseCount });
  }
  return { rows, hidden: place.characters.length - rows.length };
}

/** How each license is written in the credit line. Anything else is shown as stored. */
const LICENSE_NAMES: Readonly<Record<string, string>> = { PD: 'Public domain', 'CC-Zero': 'CC0', FAL: 'Free Art License', attribution: 'Attribution' };

/** A photo's credit as one short line, like "Photo: Zairon · CC BY-SA 4.0". */
export function creditLine(credit: PhotoCredit): string {
  const license = credit.license ? (LICENSE_NAMES[credit.license] ?? credit.license.replace(/^CC-/, 'CC ').replace(/-(\d)/, ' $1')) : null;
  return license ? `Photo: ${credit.by} · ${license}` : `Photo: ${credit.by}`;
}
