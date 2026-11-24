// Colors and sizes for the badges on the Profile page: the placeholder medals, earned and not yet earned.

/** The badge medals' colors. */
export const badgeColors = {
  /** An earned medal's warm gold fill and its brighter rim. */
  earnedFill: 'rgba(255,207,122,0.22)',
  earnedRim: '#ffcf7a',
  /** A medal not earned yet: a soft dark fill and a faint rim. */
  lockedFill: 'rgba(255,255,255,0.05)',
  lockedRim: 'rgba(255,255,255,0.18)',
  /** How see-through a not-earned medal's picture is (0 to 1). */
  lockedArtOpacity: 0.28,
  /** A not-earned badge's name. */
  lockedName: 'rgba(255,255,255,0.5)',
} as const;

/** The badge medals' sizes. */
export const badgeSizes = {
  /** A medal on the shelf. */
  medal: 58,
  /** The emoji inside a shelf medal. */
  art: 26,
  /** The big medal on a badge's card. */
  bigMedal: 112,
  /** The emoji inside the big medal. */
  bigArt: 52,
  /** The rim's width. */
  rim: 2,
} as const;
