// The shape of badges: what each badge is, its levels, and how far the person has gone.

/** The id of one badge level, like "bakers-dozen". The server records levels by these ids. */
export type BadgeLevelId = string;

/** One level of a badge. */
export type BadgeLevel = {
  /** Its id. */
  id: BadgeLevelId;
  /** The number on the medal at this level, like "13". Empty for a badge with no numbers. */
  mark: string;
  /** What reaching it takes, to finish "You earned Baker by …", like "finishing 13 lessons". The server's rule. */
  deed: string;
  /** For a counting badge, the count this level needs, like 13. */
  goal?: number;
};

/** What a counting badge counts. */
export type CountKind = 'lessons' | 'streak' | 'people' | 'places' | 'prophecyLinks' | 'weeklyWords' | 'prayers' | 'instructions';

/** One badge the app offers. A badge with several levels is one medal that levels up, like Duolingo's. */
export type Badge = {
  /** Its id, like "baker". */
  id: string;
  /** Its name, like "Baker". */
  name: string;
  /** The placeholder picture: one emoji on a round medal, until the real art is made. */
  art: string;
  /** What it counts, for a badge whose levels are counts, like Traveler counting places. */
  counts?: CountKind;
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
