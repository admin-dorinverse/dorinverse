// The Bible reader's data work that needs no screen: building the in-memory library from what the phone holds,
// working out which verses are still missing from the phone, building one chapter page, and finding the next
// chapter that can be opened. Plain functions, so the same code can be timed outside the app.

import type { BibleBook, BibleLibrary, BibleOutline, ChapterPage, Footnote, PageVerse, RevealedCounts, VerseRef } from '@/types/bible';

/** A chapter's place: the book's place in the Bible (1 to 66) and the chapter number. */
export type ChapterSpot = { book: number; chapter: number };

/** Verses the phone does not hold yet: revealed ones need their words, covered ones their word lengths. */
export type MissingVerses = { revealed: VerseRef[]; covered: VerseRef[] };

/** Builds the in-memory library from the revealed list and the saved words, word lengths and footnotes. */
export function makeLibrary(
  refs: readonly VerseRef[],
  texts: Readonly<Record<VerseRef, string>>,
  shapes: Readonly<Record<VerseRef, readonly number[]>>,
  notes: Readonly<Record<VerseRef, readonly Footnote[]>>,
): BibleLibrary {
  return { refs: new Set(refs), counts: countRevealed(refs), texts, shapes, notes };
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

/**
 * Which verses the phone still needs. Every chapter with at least one revealed verse is needed in full:
 * revealed verses as words and footnotes, covered verses as word lengths. Chapters with nothing revealed are never
 * needed. A revealed verse whose footnotes are missing is asked for again.
 */
export function missingVerses(
  outline: BibleOutline,
  refs: readonly VerseRef[],
  texts: Readonly<Record<VerseRef, string>>,
  shapes: Readonly<Record<VerseRef, readonly number[]>>,
  notes: Readonly<Record<VerseRef, readonly Footnote[]>>,
): MissingVerses {
  const revealedSet = new Set(refs);
  const byCode = new Map(outline.map((b) => [b.code, b]));
  const missing: MissingVerses = { revealed: [], covered: [] };
  for (const [code, chapters] of Object.entries(countRevealed(refs))) {
    const book = byCode.get(code);
    if (!book) continue;
    for (const chapter of Object.keys(chapters).map(Number)) {
      const count = book.chapterVerses[chapter - 1] ?? 0;
      for (let v = 1; v <= count; v++) {
        const ref = `${code}.${chapter}.${v}`;
        if (revealedSet.has(ref)) {
          if (texts[ref] === undefined || notes[ref] === undefined) missing.revealed.push(ref);
        } else if (shapes[ref] === undefined) missing.covered.push(ref);
      }
    }
  }
  return missing;
}

/** True when two revealed lists hold the same labels. */
export function sameRefs(a: readonly VerseRef[], b: readonly VerseRef[]): boolean {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every((ref) => set.has(ref));
}

/**
 * One chapter page, built from memory: revealed verses with their words, covered verses with their word
 * lengths. A verse the translation leaves out (or the phone does not hold) is left off the page.
 */
export function chapterPage(library: BibleLibrary, book: BibleBook, chapter: number): ChapterPage {
  const count = book.chapterVerses[chapter - 1] ?? 0;
  const verses: PageVerse[] = [];
  for (let v = 1; v <= count; v++) {
    const ref = `${book.code}.${chapter}.${v}`;
    if (library.refs.has(ref)) {
      const text = library.texts[ref];
      if (text) verses.push({ kind: 'revealed', number: v, text, notes: library.notes[ref] ?? [] });
    } else {
      const lengths = library.shapes[ref];
      if (lengths && lengths.length > 0) verses.push({ kind: 'covered', number: v, wordLengths: lengths });
    }
  }
  return { book: book.order, chapter, verses };
}

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

/** The words of every revealed verse that has words, by label, for search. */
export function revealedTexts(library: BibleLibrary): Record<VerseRef, string> {
  const out: Record<VerseRef, string> = {};
  for (const ref of library.refs) if (library.texts[ref]) out[ref] = library.texts[ref];
  return out;
}
