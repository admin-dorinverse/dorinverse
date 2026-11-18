// Works out where each footnote's gold star goes in a verse: right after the words the note follows.
// Done once per verse when a chapter is built, never while drawing.

import type { Footnote } from '@/types/bible';

/** A piece of a verse: plain words, or the star for the footnote at that place in the verse's list. */
export type VersePiece = { kind: 'words'; text: string } | { kind: 'star'; note: number };

/** Splits a verse into words and stars. A note whose words can't be found gets its star at the end of the verse. */
export function placeStars(text: string, notes: readonly Footnote[]): VersePiece[] {
  if (notes.length === 0) return [{ kind: 'words', text }];
  const pieces: VersePiece[] = [];
  let from = 0;
  const atEnd: number[] = [];
  notes.forEach((note, i) => {
    // Notes come in verse order, so each one is searched for after the one before.
    let found = text.indexOf(note.after, from);
    let length = note.after.length;
    if (found < 0) {
      const bare = note.after.replace(/[\s.,;:!?’”'")]+$/u, '');
      found = bare ? text.indexOf(bare, from) : -1;
      length = bare.length;
    }
    if (found < 0) {
      atEnd.push(i);
      return;
    }
    const end = found + length;
    pieces.push({ kind: 'words', text: text.slice(from, end) }, { kind: 'star', note: i });
    from = end;
  });
  if (from < text.length) pieces.push({ kind: 'words', text: text.slice(from) });
  for (const i of atEnd) pieces.push({ kind: 'star', note: i });
  return pieces;
}
