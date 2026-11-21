// Sample data for building screens: one Weekly Word with its seven clues. A stand-in only, written to test the
// Clue Book. The real words and clues come from the server, which never sends the word before it is guessed or revealed.

/** A sample mystery: the word, and one clue for each day, Monday first. */
export const sampleMysteryWeek = {
  /** The word to guess. */
  word: 'manna',
  /** The seven clues, each with where the Bible says it (shown only once the word is revealed). */
  clues: [
    { text: 'It showed up in the morning, when the dew was gone.', reference: 'Exodus 16:13-14' },
    { text: 'Nobody knew what it was. Its name comes from the question they asked.', reference: 'Exodus 16:15, 31' },
    { text: 'It was white, like coriander seed.', reference: 'Exodus 16:31' },
    { text: 'It tasted like wafers made with honey.', reference: 'Exodus 16:31' },
    { text: 'Kept overnight, it bred worms and smelled. On one day of the week it stayed fresh.', reference: 'Exodus 16:20, 24' },
    { text: 'A jar of it was kept for the generations to come.', reference: 'Exodus 16:33' },
    { text: 'The Israelites ate it for forty years.', reference: 'Exodus 16:35' },
  ],
} as const;
