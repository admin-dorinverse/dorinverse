// Sample data for building the Collections page: what the person has collected so far. Fake data for the UI only.
// The real lists will come from the server, which is the only place that decides what has been collected.

// Collected characters live in collectedCharacters.ts and reach pages through src/data/characterSource.ts.

import type { CollectedPlace } from '@/types/collection';

/** Books with verses the person has brought to life, newest first. */
export const sampleVerseBooks: readonly string[] = ['Judges', 'Genesis', 'Psalms', 'John', 'Ruth'];

/** Places visited, oldest first. */
export const samplePlaces: readonly CollectedPlace[] = [
  { name: 'Gilgal', book: 'Judges', emoji: '🪨' },
  { name: 'Jericho', book: 'Joshua', emoji: '🏰' },
];
