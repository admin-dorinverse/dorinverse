// The shape of the Weekly Word: one mystery word a week, a clue each day, and the person's Clue Book.

/**
 * Where one day's clue stands: collected (in the Clue Book), waiting (today's, not picked up yet), missed (its day
 * passed without it being collected), or later (its day hasn't come).
 */
export type ClueStatus = 'collected' | 'waiting' | 'missed' | 'later';

/** One day's page in the Clue Book. */
export type ClueSlot = {
  /** The day of the week, 1 (Monday) to 7 (Sunday). */
  day: number;
  /** Where the clue stands. */
  status: ClueStatus;
  /** The clue's words. Until the word is revealed only a collected clue has them; after, every clue does. */
  text: string | null;
  /** Where the Bible says it. Known only once the word is revealed. */
  reference: string | null;
};

/** A finished week's results: the word, all seven clues (the missed ones marked), and the day it was guessed. */
export type PastMystery = {
  /** The week's word. */
  word: string;
  /** All seven clues with their words and references. */
  clues: readonly ClueSlot[];
  /** The day the person guessed the word, or null if they didn't. */
  solvedOn: number | null;
};

/** This week's mystery, as the person sees it right now. */
export type MysteryWeek = {
  /** Which week this is. A new id means a new word and an empty Clue Book. */
  id: string;
  /** Today, 1 (Monday) to 7 (Sunday). */
  today: number;
  /** All seven days' pages, Monday first. */
  clues: readonly ClueSlot[];
  /** The day whose clue was collected since the app opened (it wears a NEW badge), or null. */
  newClue: number | null;
  /** Guesses left today, out of 3. */
  triesLeft: number;
  /** The day the person guessed the word, or null if they haven't. */
  solvedOn: number | null;
  /** True from the Sunday evening reveal until the week ends. Guessing is closed then. */
  revealed: boolean;
  /** The word, known only once the person has guessed it or it has been revealed. */
  word: string | null;
  /** True when the book has something new to show: today's clue is waiting, or the reveal hasn't been seen. */
  hasNews: boolean;
  /** Last week's results, or null when there was no last week. */
  lastWeek: PastMystery | null;
  /** When this next changes by itself (a new day, the reveal, or a new week), in milliseconds. */
  changesAt: number;
};

/** What comes back from a guess. */
export type GuessResult = {
  /** How it went: right, wrong, or not counted (no tries left, or guessing is closed). */
  outcome: 'right' | 'wrong' | 'closed';
  /** Guesses left today. */
  triesLeft: number;
};
