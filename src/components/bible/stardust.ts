// Turns a covered verse's word lengths into placeholder letters for the Stardust font, like "Abcg Hi" for
// words of 4 and 2 letters. Each letter in that font is a smudge of dust, so the verse shows as stardust in the
// real shape of its words. The letter sets match scripts/app/make-stardust-font.mjs.

/** Letters that start a word (soft left edge), fill its middle, end it (soft right edge), or stand alone. */
const START = 'ABCDEF';
const MIDDLE = 'abcdefghijkl';
const END = 'GHIJKL';
const ALONE = 'MNOP';

/** Picks a letter from a set by a running number, so neighbouring letters rarely repeat. */
function pick(set: string, n: number): string {
  return set[(n * 7 + (n >> 3)) % set.length];
}

/** The Stardust placeholder words for one covered verse, one per real word. The same verse always gets the same letters. */
export function stardustWords(wordLengths: readonly number[], seed: number): string[] {
  let n = seed * 13;
  const words = wordLengths.map((length) => {
    n += 1;
    if (length <= 1) return pick(ALONE, n);
    let word = pick(START, n);
    for (let i = 0; i < length - 2; i++) word += pick(MIDDLE, ++n);
    return word + pick(END, ++n);
  });
  return words;
}
