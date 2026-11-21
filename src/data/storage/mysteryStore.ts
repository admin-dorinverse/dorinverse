// DEVELOPMENT ONLY: saves the pretend server's record of the person's Weekly Word on the phone (expo-sqlite's
// key-value store): clues collected, guesses used and whether the word was guessed. At hookup the server keeps
// this and this file goes away.

import Storage from 'expo-sqlite/kv-store';

/** Where the record is saved. */
const KEY = 'mystery.record';

/** What the pretend server remembers about one person's week. */
export type MysteryRecord = {
  /** When the test week began (milliseconds), or null on the real week. */
  testStart: number | null;
  /** The week this record is for. A different week means the record starts over. */
  weekId: string;
  /** The days whose clues were collected. */
  collected: number[];
  /** Guesses used on each day, by day number. */
  tries: Record<number, number>;
  /** The day the word was guessed, or null. */
  solvedOn: number | null;
  /** True once the person has seen this week's reveal. */
  revealSeen: boolean;
  /** The week before: the clues collected and the day the word was guessed. Null or missing when there was none. */
  last?: { collected: number[]; solvedOn: number | null } | null;
};

/** The saved record, or null when there is none. */
export function readMysteryRecord(): MysteryRecord | null {
  try {
    const saved = Storage.getItemSync(KEY);
    return saved ? (JSON.parse(saved) as MysteryRecord) : null;
  } catch {
    return null;
  }
}

/** Saves the record. */
export function saveMysteryRecord(record: MysteryRecord): void {
  Storage.setItemSync(KEY, JSON.stringify(record));
}
