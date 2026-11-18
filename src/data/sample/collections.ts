// Sample data for building the Collections page: what the person has collected so far. Fake data for the UI only.
// The real lists will come from the server, which is the only place that decides what has been collected.

// Collected characters and places live in collectedCharacters.ts and collectedPlaces.ts, and reach pages through
// src/data/characterSource.ts and src/data/placeSource.ts.

/** Books with verses the person has brought to life, newest first. */
export const sampleVerseBooks: readonly string[] = ['Judges', 'Genesis', 'Psalms', 'John', 'Ruth'];
