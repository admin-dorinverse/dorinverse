// Colors and sizes for badges: the placeholder medals on the Profile page, earned and not yet earned, and the
// reward pop-up that shows a newly earned badge.

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
  /** The dark veil behind the reward pop-up. */
  popupDim: 'rgba(5,6,20,0.86)',
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
  /** The medal on the reward pop-up. */
  rewardMedal: 150,
  /** The emoji inside the reward pop-up's medal. */
  rewardArt: 72,
  /** The rim's width. */
  rim: 2,
} as const;
