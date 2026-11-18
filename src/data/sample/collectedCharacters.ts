// Sample data for building the Characters pages: which characters the person has collected, oldest first, and
// where they met each one. Fake data for the UI only: the real list comes from the server, which is the only place
// that decides what has been collected. Lookups only; every card's words come from the database.

import type { CollectedEntry } from '@/types/character';

/** Collected characters by database lookup, with the lesson passage they were met in. Oldest first. */
export const sampleCollectedCharacters: CollectedEntry[] = [
  { lookup: 'ehud_1039', metIn: 'Judges 3' },
  { lookup: 'eglon_1037', metIn: 'Judges 3' },
  { lookup: 'othniel_2259', metIn: 'Judges 3' },
  { lookup: 'deborah_997', metIn: 'Judges 4' },
  { lookup: 'barak_401', metIn: 'Judges 4' },
  { lookup: 'jael_689', metIn: 'Judges 4' },
  { lookup: 'sisera_2757', metIn: 'Judges 4' },
  { lookup: 'david_994', metIn: 'Psalms 23' },
  { lookup: 'nicodemus_2204', metIn: 'John 3' },
];
