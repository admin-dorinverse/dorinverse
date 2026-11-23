// Colors for a friend's code page and a friend's universe, in the Constellations look: the small number tiles on
// the universe page and the soft line words under the buttons. Avatars and the bell keep their colors in
// friendsColors.ts.

/** The friend code and universe pages' colors. */
export const friendPage = {
  /** A number tile's fill and edge, a little brighter than the glass card it sits on. */
  tileFill: 'rgba(255,255,255,0.07)',
  tileEdge: 'rgba(255,255,255,0.14)',
  /** A line saying what went wrong after a tap, like "Can't reach Dorinverse right now". */
  problem: '#ffb4a8',
} as const;
