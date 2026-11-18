// Sample data for building the Bible reader: which verses the person has revealed. Labels only, never words;
// the words come from the database. Fake data for the UI only: the real list comes from the server.
// It covers every case: a fully revealed chapter, partly covered chapters, a very long mostly covered chapter
// (Psalm 119, 176 verses, to test speed), and books with nothing revealed.

import type { VerseRef } from '@/types/bible';

/** Revealed verses as [book code, chapter, first verse, last verse]. */
const RANGES: readonly (readonly [string, number, number, number])[] = [
  ['Gen', 1, 1, 5],
  ['Judg', 3, 12, 30],
  ['Judg', 4, 4, 9],
  ['Ps', 23, 1, 6],
  ['Ps', 119, 105, 112],
  ['John', 3, 16, 17],
];

/** Every revealed verse label, like "Judg.3.15". */
export const sampleRevealedVerses: readonly VerseRef[] = RANGES.flatMap(([code, chapter, from, to]) =>
  Array.from({ length: to - from + 1 }, (_, i) => `${code}.${chapter}.${from + i}`),
);
