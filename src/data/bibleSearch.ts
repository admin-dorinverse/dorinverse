// Finds words in the person's revealed verses and in the Bible's book names. Covered verses are never
// searched: their words are not on the phone.

import { bookRevealedCount } from '@/data/bibleLibrary';
import type { BibleBook, BibleOutline, RevealedCounts, VerseRef } from '@/types/bible';

/** A verse that matched, with where it is. */
export type VerseHit = { ref: VerseRef; label: string; text: string; book: number; chapter: number; verse: number };

/** A book that matched, and whether it has anything revealed. */
export type BookHit = { book: BibleBook; open: boolean };

/** Revealed verses whose words or reference contain the search, in Bible order. */
export function findVerses(outline: BibleOutline, texts: Record<VerseRef, string>, query: string): VerseHit[] {
  const low = query.toLowerCase();
  const byCode = new Map(outline.map((b) => [b.code, b]));
  const hits: VerseHit[] = [];
  for (const [ref, words] of Object.entries(texts)) {
    const [code, chapter, verse] = ref.split('.');
    const book = byCode.get(code);
    if (!book) continue;
    const label = `${book.name} ${chapter}:${verse}`;
    if (words.toLowerCase().includes(low) || label.toLowerCase().includes(low)) {
      hits.push({ ref, label, text: words, book: book.order, chapter: Number(chapter), verse: Number(verse) });
    }
  }
  return hits.sort((a, b) => a.book - b.book || a.chapter - b.chapter || a.verse - b.verse);
}

/** Books whose names contain the search. */
export function findBooks(outline: BibleOutline, counts: RevealedCounts, query: string): BookHit[] {
  const low = query.toLowerCase();
  return outline.filter((b) => b.name.toLowerCase().includes(low)).map((book) => ({ book, open: bookRevealedCount(counts, book.code) > 0 }));
}
