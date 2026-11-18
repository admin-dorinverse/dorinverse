// The Bible reader's data for pages, through TanStack Query. Each piece is read from the phone first;
// only what is missing is downloaded (through bibleSource.ts) and then saved on the phone.

import { useQuery } from '@tanstack/react-query';
import { fetchCoveredShapes, fetchOutline, fetchRevealedRefs, fetchVerseTexts } from '@/data/bibleSource';
import { getSavedOutline, getSavedRevealed, getSavedShapes, getSavedTexts, saveOutline, saveRevealed, saveShapes, saveTexts } from '@/data/storage/bibleStore';
import type { BibleBook, BibleOutline, ChapterPage, PageVerse, VerseRef } from '@/types/bible';

/** How many verses are revealed, per book code and then per chapter number. */
export type RevealedCounts = Record<string, Record<number, number>>;

/** The revealed list, ready for pages: the labels, and how many are revealed in each book and chapter. */
export type RevealedSummary = { refs: ReadonlySet<VerseRef>; counts: RevealedCounts };

/** The Bible's outline. Downloaded once, then always read from the phone. */
export function useBibleOutline() {
  return useQuery({
    queryKey: ['bible', 'outline'],
    staleTime: Infinity,
    queryFn: async (): Promise<BibleOutline> => {
      const saved = await getSavedOutline();
      if (saved) return saved;
      const outline = await fetchOutline();
      await saveOutline(outline);
      return outline;
    },
  });
}

/** Which verses the person has revealed. Asked for fresh each time the app opens; the saved list is used offline. */
export function useRevealedVerses() {
  return useQuery({
    queryKey: ['bible', 'revealed'],
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<RevealedSummary> => {
      let refs: VerseRef[];
      try {
        refs = await fetchRevealedRefs();
        await saveRevealed(refs);
      } catch (error) {
        const saved = await getSavedRevealed();
        if (!saved) throw error;
        refs = saved;
      }
      return { refs: new Set(refs), counts: countRevealed(refs) };
    },
  });
}

/** Counts revealed verses per book code and chapter. */
export function countRevealed(refs: readonly VerseRef[]): RevealedCounts {
  const counts: RevealedCounts = {};
  for (const ref of refs) {
    const [code, chapter] = ref.split('.');
    const book = (counts[code] ??= {});
    book[Number(chapter)] = (book[Number(chapter)] ?? 0) + 1;
  }
  return counts;
}

/** How many verses are revealed in a whole book. */
export function bookRevealedCount(counts: RevealedCounts, code: string): number {
  return Object.values(counts[code] ?? {}).reduce((a, b) => a + b, 0);
}

/** One chapter page: revealed verses with their words, covered verses with their word lengths only. */
export function useChapterPage(book: BibleBook | undefined, chapter: number, revealed: RevealedSummary | undefined) {
  return useQuery({
    queryKey: ['bible', 'chapter', book?.code, chapter, revealed ? revealed.counts[book?.code ?? '']?.[chapter] ?? 0 : -1],
    enabled: !!book && !!revealed && chapter >= 1 && chapter <= book.chapterVerses.length,
    staleTime: Infinity,
    queryFn: async (): Promise<ChapterPage> => {
      const b = book as BibleBook;
      const r = revealed as RevealedSummary;
      const count = b.chapterVerses[chapter - 1];
      const numbers = Array.from({ length: count }, (_, i) => i + 1);
      const refOf = (v: number) => `${b.code}.${chapter}.${v}`;
      const shown = numbers.filter((v) => r.refs.has(refOf(v)));
      const covered = numbers.filter((v) => !r.refs.has(refOf(v)));

      // Revealed words: from the phone, then download only the missing ones.
      const texts = await getSavedTexts(shown.map(refOf));
      const missingTexts = shown.map(refOf).filter((ref) => !(ref in texts));
      if (missingTexts.length) {
        const fetched = await fetchVerseTexts(missingTexts);
        await saveTexts(fetched);
        Object.assign(texts, fetched);
      }
      // Covered verses' shapes: the same, but only word lengths are ever kept.
      const shapes = await getSavedShapes(covered.map(refOf));
      const missingShapes = covered.filter((v) => !(refOf(v) in shapes));
      if (missingShapes.length) {
        const fetched = await fetchCoveredShapes(b.code, chapter, missingShapes);
        const byRef = Object.fromEntries(Object.entries(fetched).map(([v, lengths]) => [refOf(Number(v)), lengths]));
        await saveShapes(byRef);
        Object.assign(shapes, byRef);
      }

      // A verse the translation leaves out (no words and no shape) is left off the page.
      const verses: PageVerse[] = [];
      for (const v of numbers) {
        const ref = refOf(v);
        if (r.refs.has(ref) && texts[ref] !== undefined) verses.push({ kind: 'revealed', number: v, text: texts[ref] });
        else if (!r.refs.has(ref) && shapes[ref]) verses.push({ kind: 'covered', number: v, wordLengths: shapes[ref] });
      }
      return { book: b.order, chapter, verses };
    },
  });
}

/** A chapter's place: the book's place in the Bible (1 to 66) and the chapter number. */
export type ChapterSpot = { book: number; chapter: number };

/**
 * The nearest chapter before (`step` -1) or after (`step` 1) the given one that has at least one revealed verse,
 * crossing into other books if needed. Returns null when there is none.
 */
export function nearbyOpenChapter(outline: BibleOutline, counts: RevealedCounts, from: ChapterSpot, step: 1 | -1): ChapterSpot | null {
  let book = from.book;
  let chapter = from.chapter + step;
  while (book >= 1 && book <= outline.length) {
    const b = outline[book - 1];
    if (chapter < 1) {
      book -= 1;
      chapter = outline[book - 1]?.chapterVerses.length ?? 0;
      continue;
    }
    if (chapter > b.chapterVerses.length) {
      book += 1;
      chapter = 1;
      continue;
    }
    if ((counts[b.code]?.[chapter] ?? 0) > 0) return { book, chapter };
    chapter += step;
  }
  return null;
}

/** The words of every revealed verse, by label, for search. Read from the phone; only missing words download. */
export function useRevealedTexts(revealed: RevealedSummary | undefined) {
  return useQuery({
    queryKey: ['bible', 'revealed-texts', revealed?.refs.size ?? -1],
    enabled: !!revealed,
    staleTime: Infinity,
    queryFn: async (): Promise<Record<VerseRef, string>> => {
      const refs = [...(revealed as RevealedSummary).refs];
      const texts = await getSavedTexts(refs);
      const missing = refs.filter((ref) => !(ref in texts));
      if (missing.length) {
        const fetched = await fetchVerseTexts(missing);
        await saveTexts(fetched);
        Object.assign(texts, fetched);
      }
      return texts;
    },
  });
}
