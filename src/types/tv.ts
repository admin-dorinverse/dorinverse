// The shape of Bakery TV's data: the videos the channel plays and the showings on its schedule.

/** One video on the channel. */
export type TvProgram = {
  /** The YouTube video's id, like "GQI72THyO5I". */
  videoId: string;
  /** The video's name, like "Book of Genesis Summary: A Complete Animated Overview (Part 1)". */
  title: string;
  /** How long the video runs, in seconds. */
  seconds: number;
};

/** One showing on the schedule: a video and when it airs. */
export type TvShowing = {
  /** The showing's id in the database. Reminders will hang off it. */
  id: string;
  /** The video. */
  program: TvProgram;
  /** When it starts (milliseconds since 1970). */
  startsAt: number;
  /** When its slot ends (milliseconds since 1970). Slots are whole minutes, so a video can end a little early. */
  endsAt: number;
};
