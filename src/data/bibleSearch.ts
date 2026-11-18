// Search over what the person has revealed: book names (matched from their start, so "h" finds Hebrews but
// never Jonah), chapter and verse references like "heb 10:24", and the words of revealed verses. Covered verses
// are never searched: their words are not on the phone. Verse matches are found 25 at a time, and the search
// stops as soon as it has enough, so it stays instant however much of the Bible is revealed.

import type { BibleBook, BibleLibrary, BibleOutline, RevealedCounts, VerseRef } from '@/types/bible';

/** How many verse matches one page of results holds. */
export const RESULTS_PAGE = 25;

/** One revealed verse, ready to search: its place, its reference and its words (also lowercased once). */
type IndexedVerse = { ref: VerseRef; book: number; chapter: number; verse: number; label: string; text: string; low: string };

/** Every revealed verse in Bible order, prepared once when the library loads. */
export type SearchIndex = readonly IndexedVerse[];

/** A verse that matched, with where it is. */
export type VerseHit = Omit<IndexedVerse, 'low'>;

/** A book whose name starts with the search, with the chapters that can be opened. */
export type BookMatch = { book: BibleBook; chapters: number[] };

/** A chapter or verse reference that matches the search, like "Hebrews 10:24". */
export type ReferenceMatch = { label: string; book: number; chapter: number; verse?: number };

/** A page of verse matches, and where the next page starts (null when there are no more). */
export type VersePage = { hits: VerseHit[]; next: number | null };

/** Prepares the revealed verses for searching, in Bible order. Done once per library, never per keystroke. */
export function makeSearchIndex(outline: BibleOutline, library: BibleLibrary): SearchIndex {
  const index: IndexedVerse[] = [];
  for (const book of outline) {
    const chapters = library.counts[book.code];
    if (!chapters) continue;
    for (const chapter of Object.keys(chapters).map(Number).sort((a, b) => a - b)) {
      for (let verse = 1; verse <= (book.chapterVerses[chapter - 1] ?? 0); verse++) {
        const ref = `${book.code}.${chapter}.${verse}`;
        const text = library.refs.has(ref) ? library.texts[ref] : undefined;
        if (text) index.push({ ref, book: book.order, chapter, verse, label: `${book.name} ${chapter}:${verse}`, text, low: text.toLowerCase() });
      }
    }
  }
  return index;
}

/** True when a book's name starts with the typed words, ignoring capitals and extra spaces ("1 sam" finds 1 Samuel). */
function nameStartsWith(book: BibleBook, typed: string): boolean {
  return book.name.toLowerCase().startsWith(typed.toLowerCase().replace(/\s+/g, ' '));
}

/** The chapters of a book that have at least one revealed verse. */
function openChapters(book: BibleBook, counts: RevealedCounts): number[] {
  return Object.keys(counts[book.code] ?? {}).map(Number).sort((a, b) => a - b);
}

/** Books with something revealed whose names start with the search, each with its chapters that can be opened. */
export function matchBooks(outline: BibleOutline, counts: RevealedCounts, query: string): BookMatch[] {
  const typed = query.trim();
  if (!typed) return [];
  return outline.filter((b) => nameStartsWith(b, typed) && counts[b.code]).map((book) => ({ book, chapters: openChapters(book, counts) }));
}

/**
 * References that match the search: "heb" gives Hebrews' open chapters, "heb 10" gives Hebrews 10 and its revealed
 * verses, "heb 10:24" gives that verse. Only chapters that can be opened and revealed verses are given.
 */
export function matchReferences(outline: BibleOutline, library: BibleLibrary, query: string, limit: number): ReferenceMatch[] {
  const found = query.trim().match(/^(.*?[a-z].*?)\s*(\d+)?(?:\s*[:.]\s*(\d+))?$/i);
  if (!found) return [];
  const [, name, chapterText, verseText] = found;
  const out: ReferenceMatch[] = [];
  for (const book of outline) {
    if (!nameStartsWith(book, name.trim()) || !library.counts[book.code]) continue;
    const chapters = chapterText ? [Number(chapterText)] : openChapters(book, library.counts);
    for (const chapter of chapters) {
      if (!library.counts[book.code][chapter]) continue;
      if (!verseText) out.push({ label: `${book.name} ${chapter}`, book: book.order, chapter });
      if (chapterText) {
        for (let verse = 1; verse <= (book.chapterVerses[chapter - 1] ?? 0); verse++) {
          if (verseText && !String(verse).startsWith(verseText)) continue;
          if (library.refs.has(`${book.code}.${chapter}.${verse}`)) out.push({ label: `${book.name} ${chapter}:${verse}`, book: book.order, chapter, verse });
          if (out.length >= limit) return out;
        }
      }
      if (out.length >= limit) return out;
    }
  }
  return out;
}

/** Finds the next `size` revealed verses whose words contain the search, starting at `from` in the index. */
export function versePage(index: SearchIndex, query: string, from = 0, size = RESULTS_PAGE): VersePage {
  const low = query.trim().toLowerCase();
  const hits: VerseHit[] = [];
  if (!low) return { hits, next: null };
  for (let i = from; i < index.length; i++) {
    const entry = index[i];
    if (!entry.low.includes(low)) continue;
    hits.push({ ref: entry.ref, book: entry.book, chapter: entry.chapter, verse: entry.verse, label: entry.label, text: entry.text });
    if (hits.length === size) return { hits, next: i + 1 < index.length ? i + 1 : null };
  }
  return { hits, next: null };
}

/** Searches from a list (recent or suggested) that start with what was typed, ignoring capitals. */
export function matchSuggestions(list: readonly string[], query: string, limit: number): string[] {
  const low = query.trim().toLowerCase();
  if (!low) return [];
  return list.filter((s) => s.toLowerCase().startsWith(low) && s.toLowerCase() !== low).slice(0, limit);
}
