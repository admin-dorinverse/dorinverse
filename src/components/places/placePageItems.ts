// Turns a place's card into the rows of its page, in order: characters linked to it (collected ones by name, then
// the "more to discover" line), then key moments. One flat list, so the page draws only the rows on screen.

import { placeCharacters, type PlaceCharacterRow } from '@/data/queries/places';
import type { CharacterLibrary, KeyMoment } from '@/types/character';
import type { FoundPlace } from '@/types/place';

/** One row on a place's page; `key` is unique on the page. */
export type PlacePageItem =
  | { kind: 'heading'; key: string; title: string }
  | { kind: 'character'; key: string; row: PlaceCharacterRow }
  | { kind: 'more'; key: string; count: number }
  | { kind: 'moment'; key: string; moment: KeyMoment };

/** The rows of a place's page, made once per place (and again when the collected characters change). */
export function placePageItems(characters: CharacterLibrary | undefined, place: FoundPlace): PlacePageItem[] {
  const items: PlacePageItem[] = [];
  const { rows, hidden } = placeCharacters(characters, place);
  if (rows.length > 0 || hidden > 0) {
    items.push({ kind: 'heading', key: 'h-characters', title: 'CHARACTERS' });
    for (const row of rows) items.push({ kind: 'character', key: `c-${row.character.id}`, row });
    if (hidden > 0) items.push({ kind: 'more', key: 'more', count: hidden });
  }
  if (place.moments.length > 0) {
    items.push({ kind: 'heading', key: 'h-moments', title: 'KEY MOMENTS' });
    // Shown with the Characters pages' moment row, which calls the text a description.
    place.moments.forEach((m, i) => items.push({ kind: 'moment', key: `m-${i}`, moment: { title: m.title, description: m.text, passage: m.passage } }));
  }
  return items;
}
