// The shape of the Bible as the reader sees it: the outline of books and chapters, which verses a person
// has revealed, and the verses on one chapter page (words for revealed verses, word lengths for covered ones).

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

/** A verse still covered by crumbs: only the length of each word is known, so the page can fake its shape. */
export type CoveredVerse = { kind: 'covered'; number: number; wordLengths: number[] };

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
