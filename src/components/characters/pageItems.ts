// Turns a character's card into the rows of their page, in order: key moments, key relationships (with the
// "more to discover" line), then places. One flat list, so the page draws only the rows on screen, even for a
// character like David with over a hundred places.

import { linkRows, type LinkRow } from '@/data/queries/characters';
import type { CharacterLibrary, CharacterPlace, KeyMoment, MetCharacter } from '@/types/character';

/** One row on a character's page; `key` is unique on the page. */
export type PageItem =
  | { kind: 'heading'; key: string; title: string }
  | { kind: 'moment'; key: string; moment: KeyMoment }
  | { kind: 'link'; key: string; link: LinkRow }
  | { kind: 'discover'; key: string; count: number }
  | { kind: 'place'; key: string; place: CharacterPlace };

/** The rows of a character's page, made once per character. */
export function characterPageItems(library: CharacterLibrary, character: MetCharacter): PageItem[] {
  const items: PageItem[] = [];
  if (character.keyMoments.length > 0) {
    items.push({ kind: 'heading', key: 'h-moments', title: 'KEY MOMENTS' });
    character.keyMoments.forEach((moment, i) => items.push({ kind: 'moment', key: `m-${i}`, moment }));
  }
  const { rows, hidden } = linkRows(library, character);
  if (rows.length > 0 || hidden > 0) {
    items.push({ kind: 'heading', key: 'h-links', title: 'KEY RELATIONSHIPS' });
    for (const link of rows) items.push({ kind: 'link', key: `l-${link.other.id}`, link });
    if (hidden > 0) items.push({ kind: 'discover', key: 'discover', count: hidden });
  }
  if (character.places.length > 0) {
    items.push({ kind: 'heading', key: 'h-places', title: 'PLACES' });
    character.places.forEach((place, i) => items.push({ kind: 'place', key: `p-${i}`, place }));
  }
  return items;
}
