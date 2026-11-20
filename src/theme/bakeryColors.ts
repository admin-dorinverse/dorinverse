// Colors for Papa Dorin's Bakery, taken from the Constellations design: the warm kitchen wall behind the conveyor
// belt, the belt itself, the oven's glow, the room's soft colored lights, and the four bright option cards.

/** The kitchen wall and ceiling behind the belt. */
export const kitchen = {
  /** The wall's two stripe colors, 18 points each. */
  stripeA: '#F7E6C8',
  stripeB: '#F3DDBA',
  /** The wooden posts at the wall's two ends, and the thin cream line beside each. */
  post: '#B5733A',
  postLine: '#FFF8EC',
  /** The ceiling beam across the top, and its shadow. */
  ceiling: '#8E4F1F',
  ceilingShadow: '#6E3B14',
  /** The thin dark lines that slide along the belt's top and front. */
  treadTop: 'rgba(55,22,8,0.28)',
  treadFront: 'rgba(30,10,2,0.32)',
  /** The oven mouth's warm glow, bright middle to clear edge. */
  ovenGlow: ['rgba(255,236,170,0.95)', 'rgba(255,170,60,0.55)', 'rgba(255,140,40,0)'],
} as const;

/** The belt's side seen across the screen, top to bottom, as [place down the belt picture (0 to 1), color]. */
export const beltSide: readonly (readonly [number, string])[] = [
  [0, 'rgba(0,0,0,0)'],
  [0.652, 'rgba(0,0,0,0)'],
  [0.6535, '#6e4b2d'],
  [0.655, '#85563c'],
  [0.66, '#874e3a'],
  [0.725, '#8a503c'],
  [0.733, '#854625'],
  [0.741, '#925832'],
  [0.75, '#763b1d'],
  [0.765, '#632a0f'],
  [0.79, '#5e260d'],
  [0.805, '#52220c'],
  [0.8158, '#231001'],
  [0.8187, 'rgba(27,29,5,0.49)'],
  [0.8202, 'rgba(0,0,0,0)'],
  [1, 'rgba(0,0,0,0)'],
];

/** The bakery room under the belt. */
export const bakeryRoom = {
  /** The room's cream floor color. */
  floor: '#FFF8EC',
  /** The four soft colored lights drifting behind everything. */
  lights: ['#ffd68a', '#ffb3a1', '#a8e6c0', '#b9d8ff'],
  /** The tiny motes floating up, and their glow. */
  mote: '#ffffff',
  moteGlow: 'rgba(255,214,140,0.9)',
  /** The top bar: its white, its line, and its title. */
  bar: '#ffffff',
  barLine: '#e5e5e5',
  barTitle: '#3c3c3c',
  /** The back button's brown. */
  back: '#4B3221',
  /** Papa Dorin's speech bubble: its glassy white, edge and words. */
  bubble: 'rgba(255,255,255,0.7)',
  bubbleEdge: 'rgba(255,255,255,0.95)',
  bubbleRing: 'rgba(214,186,140,0.35)',
  ink: '#4B3221',
  /** A card's quieter line. */
  soft: '#8a6a4a',
  /** The shine that sweeps across each card. */
  shine: 'rgba(255,255,255,0.65)',
  /** The open book on the story card: its cover, pages and page edges. */
  bookCover: '#7a3b1e',
  bookPage: '#fffaf0',
  bookEdge: '#c9b48a',
  /** The shadow under Papa Dorin and the cards. */
  shadow: 'rgba(90,58,34,0.45)',
} as const;

/** Each option card's two colors (light and deep), as in the design. */
export const bakeryCards = {
  tv: ['#ffe9b8', '#f6c56a'],
  story: ['#dff6e8', '#8fd8a8'],
  chat: ['#dcefff', '#8cc4f2'],
  ticket: ['#ffe3e1', '#f19a92'],
} as const;
