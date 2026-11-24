// The shape of badges: what each badge is, its levels, and how far the person has gone.

/** The id of one badge level, like "bakers-dozen". The server records levels by these ids. */
export type BadgeLevelId = string;

/** One level of a badge. */
export type BadgeLevel = {
  /** Its id. */
  id: BadgeLevelId;
  /** The number on the medal at this level, like "13" or "All". Empty for a badge with one level. */
  mark: string;
  /** How to reach it, like "Finish 13 lessons." The server's rule for it. */
  howToEarn: string;
};

/** One badge the app offers. A badge with several levels is one medal that levels up, like Duolingo's. */
export type Badge = {
  /** Its id, like "baker". */
  id: string;
  /** Its name, like "Baker". */
  name: string;
  /** The placeholder picture: one emoji on a round medal, until the real art is made. */
  art: string;
  /** Its levels, lowest first. A one-time badge has just one. */
  levels: BadgeLevel[];
  /** True when the levels can be reached in any order, like the six constellations. Otherwise they go in order. */
  anyOrder?: boolean;
};

/** A badge as the pages show it: the badge and how many of its levels the person has reached. */
export type ShownBadge = Badge & {
  /** Levels reached: 0 when not earned yet. */
  level: number;
};
