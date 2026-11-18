// The shape of the Bible as the reader sees it: the outline of books and chapters, which verses a person
// has revealed, what the phone holds about them, and the verses on one chapter page (words for revealed
// verses, word lengths for covered ones).

/** One book in the Bible's outline. No words, only its name and size. */
export type BibleBook = {
  /** Its place in the Bible, 1 (Genesis) to 66 (Revelation). */
  order: number;
  /** Its full name, like "Judges". */
  name: string;
  /** Its short code in verse labels, like "Judg" in "Judg.3.15". */
  code: string;
  /** Old or New Testament. */
  testament: 'OT' | 'NT';
  /** How many verses each chapter has: the first number is chapter 1. */
  chapterVerses: number[];
};

/** The whole Bible's outline: every book, in order. */
export type BibleOutline = BibleBook[];

/** A verse label, like "Judg.3.15" for Judges 3:15. */
export type VerseRef = string;

/** A verse the person has revealed: its words show on the page. */
export type RevealedVerse = { kind: 'revealed'; number: number; text: string };

/** A verse still covered in stardust: only the length of each word is known, so the page can draw its shape. */
export type CoveredVerse = { kind: 'covered'; number: number; wordLengths: readonly number[] };

/** One verse on a chapter page. */
export type PageVerse = RevealedVerse | CoveredVerse;

/** One chapter page in the reader. */
export type ChapterPage = {
  /** The book's place in the Bible, 1 to 66. */
  book: number;
  /** The chapter number. */
  chapter: number;
  /** Every verse in the chapter, in order. */
  verses: PageVerse[];
};

/** How many verses are revealed, per book code and then per chapter number. */
export type RevealedCounts = Record<string, Record<number, number>>;

/**
 * Everything the reader needs that is not in the outline, held in memory once loaded from the phone.
 * Only chapters with at least one revealed verse are in it.
 */
export type BibleLibrary = {
  /** The labels of every revealed verse. */
  refs: ReadonlySet<VerseRef>;
  /** How many verses are revealed in each book and chapter. */
  counts: RevealedCounts;
  /** Revealed verses' words, by label. An empty string means the translation leaves the verse out. */
  texts: Readonly<Record<VerseRef, string>>;
  /** Covered verses' word lengths, by label. An empty list means the translation leaves the verse out. */
  shapes: Readonly<Record<VerseRef, readonly number[]>>;
};
