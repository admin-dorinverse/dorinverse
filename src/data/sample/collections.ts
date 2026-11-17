// Sample data for building the Collections page: what the person has collected so far. Fake data for the UI only.
// The real lists will come from the server, which is the only place that decides what has been collected.

import type { CollectedCharacter, CollectedPlace } from '@/types/collection';

/** Books with verses the person has brought to life, newest first. */
export const sampleVerseBooks: readonly string[] = ['Judges', 'Genesis', 'Psalms', 'John', 'Ruth'];

/** Characters met, oldest first. */
export const sampleCharacters: readonly CollectedCharacter[] = [
  { name: 'Ehud', reference: 'Judges 3', initial: 'E', mentions: '9' },
  { name: 'Eglon', reference: 'Judges 3', initial: 'E', mentions: '8' },
];

/** Places visited, oldest first. */
export const samplePlaces: readonly CollectedPlace[] = [
  { name: 'Gilgal', book: 'Judges', emoji: '🪨' },
  { name: 'Jericho', book: 'Joshua', emoji: '🏰' },
];
