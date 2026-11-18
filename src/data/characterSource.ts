// Where the Characters pages' data comes from. This is the one file that changes at hookup: pages never ask
// the database or the sample data directly, only through these functions.
//
// How it will work at hookup:
// - The server decides who is collected. When a lesson collects a character, the server's reply carries that
//   character's card, and its links to characters the person already has (an uncollected one comes as its id only,
//   never its name or why sentence). The phone saves the card; nothing else is downloaded.
// - A new phone (or a reinstall) gets every collected card in the one compressed download right after sign-in.
//
// Today (development): the collected list is sample data, and fetchCards below stands in for both of the above by
// asking the database directly, in one round of requests sent together.

import { database } from '@/data/database';
import { sampleCollectedCharacters } from '@/data/sample/collectedCharacters';
import type { CharacterCard, CharacterLink, CharacterLookup, CollectedEntry, KeyMoment } from '@/types/character';
import type { VerseRef } from '@/types/bible';

/** How many cards one request asks for: short enough for the web address, small enough for a quick reply. */
const CARDS_PER_ASK = 25;

/** The most rows the database sends in one reply, also for each card's verse list. */
const ROW_CAP = 1000;

/**
 * A card as downloaded: everything but the split of its links. `links` holds every link the server sent; the
 * sync keeps only those to collected characters and counts the rest.
 */
export type DownloadedCard = Omit<CharacterCard, 'links' | 'hiddenIds'> & { links: CharacterLink[] };

/** What the cards request asks for: the card, its lookup, its verses, places and links both ways. */
const CARD_COLUMNS =
  'bible_character_id, name, name_tag, also_known_as, summary, key_moments, verse_count, who:bible_character!inner(lookup), ' +
  'verses:character_card_verse(verse(osis_ref)), places:character_card_place(verses_naming_both, place(id, name)), ' +
  'linksFrom:character_connection!from_card_id(to_card_id, type, why), linksTo:character_connection!to_card_id(from_card_id, type, why)';

/** A key moment as stored: its place is an id. */
type MomentRow = { title: string; description: string; passage: string; place_id?: string | null };

/** One card row from the database, with everything it carries. */
type CardRow = {
  bible_character_id: string;
  name: string;
  name_tag: string | null;
  also_known_as: string[] | null;
  summary: string;
  key_moments: MomentRow[];
  verse_count: number;
  who: { lookup: string };
  verses: { verse: { osis_ref: string } }[];
  places: { verses_naming_both: number; place: { id: string; name: string } }[];
  linksFrom: { to_card_id: string; type: string; why: string }[];
  linksTo: { from_card_id: string; type: string; why: string }[];
};

/** Who the person has collected, oldest first. Development: the sample list. Hookup: the server. */
export async function fetchCollected(): Promise<CollectedEntry[]> {
  return sampleCollectedCharacters.map((entry) => ({ ...entry }));
}

/**
 * Downloads the cards of the given characters, all requests sent at once. A card whose verse list was cut off at
 * the reply cap (only the very few characters named in over 1,000 verses, like Jesus and Jacob) gets the rest of
 * its verses in a second quick round.
 *
 * DEVELOPMENT ONLY: links to characters not collected arrive with their why sentence here, which the sync throws
 * away. At hookup the server sends those as ids only.
 */
export async function fetchCards(lookups: readonly CharacterLookup[]): Promise<DownloadedCard[]> {
  const asks: CharacterLookup[][] = [];
  for (let i = 0; i < lookups.length; i += CARDS_PER_ASK) asks.push(lookups.slice(i, i + CARDS_PER_ASK));
  const replies = await Promise.all(
    asks.map((ask) => database.from('character_card').select(CARD_COLUMNS).eq('status', 'published').in('who.lookup', ask)),
  );
  const cards: DownloadedCard[] = [];
  for (const reply of replies) {
    if (reply.error) throw reply.error;
    for (const row of reply.data as unknown as CardRow[]) cards.push(toCard(row));
  }
  const cutOff = cards.filter((card) => card.verseRefs.length < card.verseCount);
  await Promise.all(cutOff.map(async (card) => (card.verseRefs = await fetchAllVerseRefs(card.id, card.verseCount))));
  return cards;
}

/** Downloads every verse label naming one character, in pages of 1,000 asked for together. */
async function fetchAllVerseRefs(id: string, count: number): Promise<VerseRef[]> {
  const pages = Array.from({ length: Math.ceil(count / ROW_CAP) }, (_, i) => i * ROW_CAP);
  const replies = await Promise.all(
    pages.map((from) =>
      database.from('character_card_verse').select('verse_id, verse(osis_ref)').eq('bible_character_id', id).order('verse_id').range(from, from + ROW_CAP - 1),
    ),
  );
  const refs: VerseRef[] = [];
  for (const reply of replies) {
    if (reply.error) throw reply.error;
    for (const row of reply.data as unknown as { verse: { osis_ref: string } }[]) refs.push(row.verse.osis_ref);
  }
  return refs;
}

/** Turns a database row into a card: place names filled into key moments, places most often named first. */
function toCard(row: CardRow): DownloadedCard {
  const placeNames = new Map(row.places.map((p) => [p.place.id, p.place.name]));
  const keyMoments: KeyMoment[] = row.key_moments.map((m) => {
    const place = m.place_id ? placeNames.get(m.place_id) : undefined;
    return { title: m.title, description: m.description, passage: m.passage, ...(place ? { place } : {}) };
  });
  const places = row.places
    .map((p) => ({ id: p.place.id, name: p.place.name, verseCount: p.verses_naming_both }))
    .sort((a, b) => b.verseCount - a.verseCount || a.name.localeCompare(b.name));
  const links: CharacterLink[] = [
    ...row.linksFrom.map((l) => ({ otherId: l.to_card_id, type: l.type, why: l.why })),
    ...row.linksTo.map((l) => ({ otherId: l.from_card_id, type: l.type, why: l.why })),
  ];
  return {
    id: row.bible_character_id,
    lookup: row.who.lookup,
    name: row.name,
    nameTag: row.name_tag,
    alsoKnownAs: row.also_known_as ?? [],
    summary: row.summary,
    keyMoments,
    verseCount: row.verse_count,
    places,
    verseRefs: row.verses.map((v) => v.verse.osis_ref),
    links,
  };
}
