// List work shared by the collected-things pages (Characters, Places): the book of a lesson passage, books in Bible
// order for the book chips, and the Newest / A–Z / Z–A order. Plain functions, so they can be timed outside the app.

import { BIBLE_OUTLINE } from '@/data/bibleOutline';

/** Each book's place in the Bible, by name, for putting the book chips in order. */
const BOOK_ORDER = new Map(BIBLE_OUTLINE.map((b) => [b.name, b.order]));

/** The book of a passage like "Judges 3" or "Song of Solomon 2": everything before the chapter number. */
export function bookOf(passage: string): string {
  const space = passage.lastIndexOf(' ');
  const first = passage.charAt(space + 1);
  return space > 0 && first >= '0' && first <= '9' ? passage.slice(0, space) : passage;
}

/** The different books in a list, in Bible order. */
export function booksInOrder(books: Iterable<string>): string[] {
  return [...new Set(books)].sort((a, b) => (BOOK_ORDER.get(a) ?? 99) - (BOOK_ORDER.get(b) ?? 99));
}

/** How a collected grid is ordered: newest collected first, or by name A to Z, or Z to A. */
export type ListOrder = 'newest' | 'az' | 'za';

/** The things in the chosen order. The list is already newest first. */
export function sortByName<T extends { name: string }>(list: readonly T[], order: ListOrder): readonly T[] {
  if (order === 'newest') return list;
  const byName = [...list].sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));
  return order === 'az' ? byName : byName.reverse();
}
