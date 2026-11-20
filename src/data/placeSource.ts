// Where the Places pages' data comes from. This is the one file that changes at hookup: pages, the sync and the
// store never ask the database, the photo storage or the sample data directly, only through these functions.
//
// How it will work at hookup:
// - The server decides which places are collected. When a lesson collects a place, the server's reply carries that
//   place's card; the phone saves it and fetches its two small photos. Nothing else is downloaded.
// - A new phone (or a reinstall) gets every collected card in the one compressed download right after sign-in.
//
// Today (development): the collected list is the sample list plus the places collected in lessons
// (progressSource), and fetchPlaceCards below stands in for both of the
// above by asking the database directly, in one request per 25 cards, sent together.

import { database } from '@/data/database';
import { earnedPlaces } from '@/data/progressSource';
import { sampleCollectedPlaces } from '@/data/sample/collectedPlaces';
import type { VerseRef } from '@/types/bible';
import type { CollectedPlaceEntry, PhotoCredit, PlaceCard, PlaceCharacterLink, PlaceLookup, PlacePhoto } from '@/types/place';

/** How many cards one request asks for: short enough for the web address, small enough for a quick reply. */
const CARDS_PER_ASK = 25;

/** Where the place photos are stored: the public "place-images" bucket. */
const PHOTO_BASE = `${process.env.EXPO_PUBLIC_SUPABASE_URL ?? ''}/storage/v1/object/public/place-images`;

/**
 * What the cards request asks for: the card, its photo credit, its key moments, and for each place it stands for,
 * the verses naming it and the characters linked to it. Jerusalem, the biggest, is about 760 verses.
 */
const CARD_COLUMNS =
  'lookup, name, kind, line, image_path, image_author, image_credit, image_credit_url, image_license, ' +
  'moments:place_card_moment(position, title, text, passage), ' +
  'ids:place_card_place(place_id, place(verses:verse_place(verse(osis_ref)), people:character_card_place(bible_character_id, verses_naming_both)))';

/** One card row from the database, with everything it carries. */
type CardRow = {
  lookup: string;
  name: string;
  kind: string | null;
  line: string;
  image_path: string | null;
  image_author: string | null;
  image_credit: string | null;
  image_credit_url: string | null;
  image_license: string | null;
  moments: { position: number; title: string; text: string; passage: string }[];
  ids: {
    place_id: string;
    place: { verses: { verse: { osis_ref: string } }[]; people: { bible_character_id: string; verses_naming_both: number }[] } | null;
  }[];
};

/**
 * Which places the person has collected, oldest first. Development: the sample list, then the places collected in
 * lessons (kept by progressSource). Hookup: the server.
 */
export async function fetchCollectedPlaces(): Promise<CollectedPlaceEntry[]> {
  const sample = sampleCollectedPlaces.map((entry) => ({ ...entry }));
  const have = new Set(sample.map((e) => e.lookup));
  return [...sample, ...(await earnedPlaces()).filter((e) => !have.has(e.lookup))];
}

/** Downloads the cards of the given places, all requests sent at once. */
export async function fetchPlaceCards(lookups: readonly PlaceLookup[]): Promise<PlaceCard[]> {
  const asks: PlaceLookup[][] = [];
  for (let i = 0; i < lookups.length; i += CARDS_PER_ASK) asks.push(lookups.slice(i, i + CARDS_PER_ASK));
  const replies = await Promise.all(asks.map((ask) => database.from('place_card').select(CARD_COLUMNS).in('lookup', ask)));
  const cards: PlaceCard[] = [];
  for (const reply of replies) {
    if (reply.error) throw reply.error;
    for (const row of reply.data as unknown as CardRow[]) cards.push(toCard(row));
  }
  return cards;
}

/** Turns a database row into a card: verses with no repeats, characters most verses first. */
function toCard(row: CardRow): PlaceCard {
  const refs = new Map<VerseRef, true>();
  const people = new Map<string, number>();
  for (const id of row.ids) {
    for (const v of id.place?.verses ?? []) refs.set(v.verse.osis_ref, true);
    for (const p of id.place?.people ?? []) people.set(p.bible_character_id, (people.get(p.bible_character_id) ?? 0) + p.verses_naming_both);
  }
  const characters: PlaceCharacterLink[] = [...people].map(([id, verseCount]) => ({ id, verseCount })).sort((a, b) => b.verseCount - a.verseCount);
  return {
    lookup: row.lookup,
    name: row.name,
    kind: row.kind,
    line: row.line,
    placeIds: row.ids.map((i) => i.place_id),
    photo: toPhoto(row),
    moments: [...row.moments].sort((a, b) => a.position - b.position).map((m) => ({ title: m.title, text: m.text, passage: m.passage })),
    verseRefs: [...refs.keys()],
    characters,
  };
}

/** The web address of a place's photo: the small square copy or the page-header copy. */
export function placePhotoAddress(lookup: string, size: 'small' | 'header'): string {
  return `${PHOTO_BASE}/${size}/${encodeURIComponent(lookup)}.webp`;
}

/** The card's two small WebP copies (made by scripts/app/make-place-photos.mjs) and their credit; null with no photo. */
function toPhoto(row: CardRow): PlacePhoto | null {
  if (!row.image_path) return null;
  // "sentinel" marks satellite pictures whose credit line already says everything; it is not a license name.
  const license = row.image_license && row.image_license !== 'sentinel' ? row.image_license : null;
  const credit: PhotoCredit = { by: row.image_author ?? row.image_credit ?? 'Unknown', license, link: row.image_credit_url };
  return { small: placePhotoAddress(row.lookup, 'small'), header: placePhotoAddress(row.lookup, 'header'), credit };
}
