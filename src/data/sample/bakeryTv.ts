// Sample data for building the Bakery TV page: the channel's programs, copied from the Constellations design.
// Fake data for the UI only. The real programs are in the database (tv_program, aired in order from tv_schedule),
// which the app does not load yet; the real ones have no colors, so these colors are the design's.

/** One program on the channel. */
export type TvProgram = {
  /** The program's name. */
  title: string;
  /** How long it runs, in seconds. */
  seconds: number;
  /** The screen's gradient while it plays, top-left then bottom-right. Its second color also marks its guide row. */
  colors: readonly [string, string];
};

/** The moment the channel started: the list plays back to back, over and over, from here. */
export const SAMPLE_TV_EPOCH = Date.UTC(2026, 0, 1);

/** The channel's programs, in the order they air. */
export const sampleTvPrograms: readonly TvProgram[] = [
  { title: 'Genesis 1–11', seconds: 442, colors: ['#1d5c4f', '#4fb39a'] },
  { title: 'Genesis 12–50', seconds: 468, colors: ['#5b3a8a', '#a77fe0'] },
  { title: 'Exodus 1–18', seconds: 420, colors: ['#8a3b1f', '#e08a4f'] },
  { title: 'Judges', seconds: 396, colors: ['#7a5a12', '#e0b84f'] },
  { title: 'Ruth', seconds: 378, colors: ['#2a4f8a', '#6fa0e8'] },
  { title: '1 Samuel', seconds: 450, colors: ['#6e1f3a', '#d46a8e'] },
  { title: 'Psalms', seconds: 414, colors: ['#245a2a', '#7cc485'] },
  { title: 'Jonah', seconds: 402, colors: ['#123f5a', '#4fa3d4'] },
];
