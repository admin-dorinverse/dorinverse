// Where the red Clue Book floats in the sky (beside the bakery planet), how it bobs, and what counts as a tap on it.
// The book is a view the phone slides around (see MysteryBook.tsx), so nothing here draws.

/** The book's center, measured from the sky's center like the planet, and its drawn size. */
export const BOOK = { x: 138, y: 172, width: 50, height: 60 } as const;

/** Radius of the red glow behind the book. */
export const BOOK_GLOW = 62;

/** How long one pulse of the glow takes while a clue is waiting (ms). */
export const BOOK_PULSE_MS = 1600;

/** How far up the book floats at this moment, in points. It bobs 8 points and back every 5 seconds. */
export function bookFloat(seconds: number, reduceMotion: boolean): number {
  'worklet';
  return reduceMotion ? 0 : -4 + 4 * Math.cos((2 * Math.PI * seconds) / 5);
}

/** True when a tap at a sky spot lands on the book. */
export function hitsMysteryBook(wx: number, wy: number): boolean {
  'worklet';
  return Math.abs(wx - BOOK.x) < 42 && Math.abs(wy - BOOK.y) < 48;
}
