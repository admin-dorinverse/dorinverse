// Word work for the practice modes, copied from the prototype: shuffling, how many more words "Hide more" covers,
// a word's first-letter hint, and the five choices the word bank offers. Plain functions with no screen.

/** Spare words the word bank uses when a verse has too few different words. */
const SPARE_WORDS = ['grace', 'light', 'truth', 'spirit'];

/** A verse's words, split at spaces as the prototype does. */
export function verseWords(text: string): string[] {
  return text.split(' ').filter(Boolean);
}

/** A shuffled copy of a list. */
export function shuffled<T>(list: readonly T[]): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** How many words are hidden after one more "Hide more": at least 2 more, or a sixth of the verse. */
export function hideStep(hidden: number, total: number): number {
  return Math.min(total, hidden + Math.max(2, Math.ceil(total / 6)));
}

/** How many letters a word has, leaving out marks like commas. */
export function letterCount(word: string): number {
  return word.replace(/[^A-Za-z]/g, '').length;
}

/** A word up to and including its first letter, like `"I` for `"In`. */
export function firstLetterPart(word: string): string {
  const at = word.search(/[A-Za-z]/);
  return at >= 0 ? word.slice(0, at + 1) : word.charAt(0);
}

/** The word bank's five choices for the next word: the right one and up to four other words, in random order. */
export function bankChoices(words: readonly string[], index: number): string[] {
  const right = words[index];
  const others = shuffled([...new Set(words.filter((w) => w !== right))]).slice(0, 4);
  while (others.length < 4) others.push(SPARE_WORDS[others.length]);
  return shuffled([right, ...others]);
}
