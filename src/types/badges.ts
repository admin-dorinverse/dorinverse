// The shape of badges: what each badge is, how it is earned, and whether the person has it.

/** A badge's id, like "first-batch". */
export type BadgeId = string;

/** The kind of thing a badge is for. */
export type BadgeGroup = 'Lessons' | 'Streak' | 'Collections' | 'Verse Memory' | 'Trivia and calls' | 'Papa Dorin and guests' | 'Weekly Mystery' | 'Friends';

/** One badge the app offers. */
export type Badge = {
  /** Its id. */
  id: BadgeId;
  /** Its name, like "First Batch". */
  name: string;
  /** How to earn it, like "Finish your first lesson." */
  howToEarn: string;
  /** The kind of thing it is for. */
  group: BadgeGroup;
  /** The placeholder picture: one emoji on a round medal, until the real art is made. */
  art: string;
};

/** A badge as the pages show it: the badge and whether the person has earned it. */
export type ShownBadge = Badge & {
  /** True when the person has earned it. */
  earned: boolean;
};
