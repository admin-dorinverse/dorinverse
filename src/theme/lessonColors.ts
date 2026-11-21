// The lessons' colors, taken from the Constellations design: the lesson list and orbit view's veils, the player's
// cream cards, answer buttons, result sheets and explain page, the oven bar, the pop-up sheets, the Quality Check and
// the cookie box's label.

/** The lesson list and the orbit view, over the sky. */
export const lessonSky = {
  /** The veil over the sky behind the lesson list (top, middle, bottom). */
  listVeil: ['rgba(6,7,24,0.55)', 'rgba(6,7,24,0.25)', 'rgba(6,7,24,0.55)'],
  /** The veil over the sky behind the orbit view (left to right). */
  orbitVeil: ['rgba(6,7,24,0.7)', 'rgba(6,7,24,0.35)'],
  /** The player's dark tint. It stands in for the design's blur, which would cost the phone a lot. */
  player: 'rgba(10,11,34,0.94)',
  /** The dotted path between unbaked stops. */
  path: 'rgba(255,255,255,0.35)',
  /** The gold path between baked stops. */
  bakedPath: '#ffc65c',
  /** The white the star's inner rays are drawn in, and that colors are mixed toward for light labels. */
  white: '#ffffff',
  /** The black colors are mixed toward for a button's shadow edge. */
  black: '#000000',
} as const;

/** Cream cards in the player: Papa Dorin's speech bubble, the question card and the pop-up sheets. */
export const cream = {
  /** The bubble and question card. */
  card: 'rgba(255,255,255,0.96)',
  /** Behind a place photo while it shows, and behind a collection's little scene in a quick look. */
  photoBack: '#eadfc6',
  sceneBack: '#1d2152',
  /** Dark brown words on cream. */
  ink: '#2a1d14',
  /** The verse reference under a story. */
  cite: '#8a6a4a',
  /** An explained word: its letters and dotted underline. */
  word: '#7a2e9c',
  wordLine: '#b06ad0',
  /** The pop-up sheets' cream and their small heading. */
  sheet: '#fffaf0',
  kind: '#a0643a',
  /** The sheets' green button and its shadow. */
  button: '#5c9a2e',
  buttonShadow: '#3f7420',
} as const;

/** The answer buttons, the Check button and the result sheets. */
export const answerColors = {
  /** An answer not picked: glass. */
  idleFill: 'rgba(255,255,255,0.1)',
  idleEdge: 'rgba(255,255,255,0.25)',
  /** The picked answer before Check. */
  pickFill: '#DDF4FF',
  pickEdge: '#84D8FF',
  pickInk: '#1899D6',
  /** A right answer after Check. */
  goodFill: '#D7FFB8',
  goodEdge: '#A5ED6E',
  goodInk: '#58A700',
  /** A missed answer after Check. */
  badFill: '#FFDFE0',
  badEdge: '#FFB2B2',
  badInk: '#EA2B2B',
  /** The Check button and the right sheet's round mark and button. */
  check: '#58CC02',
  checkShadow: '#58A700',
  /** The missed sheet's button. */
  missButton: '#FF4B4B',
} as const;

/** The "Explain the answer" page. */
export const explainColors = {
  /** The page's cream. */
  page: '#FFF8EC',
  /** The card holding the explanation, and its edge. */
  card: '#FBF3E2',
  edge: '#E8D6B4',
  /** The heading and the explanation's words. */
  ink: '#4A3322',
  /** The back arrow. */
  back: '#9C7F62',
  /** A thumb, and a thumb once tapped. */
  thumb: '#B9A78C',
  thumbOn: '#1CB0F6',
  /** The "Continue lesson" button and its shadow. */
  button: '#1CB0F6',
  buttonShadow: '#1899D6',
} as const;

/** The oven progress bar. */
export const ovenColors = {
  /** Its edge and the shadow under it. */
  edge: '#E3CFA8',
  shadow: '#D8BF92',
  /** Its cream inside, top to bottom. */
  inside: ['#FFFDF6', '#F7E8C8'],
  /** The heat fill, from its start to its hot end. */
  heat: ['#FFD36B', '#FF8A1F', '#E8430C'],
  /** The shine across the top. */
  shine: 'rgba(255,255,255,0.75)',
} as const;

/** A collectible cookie's name in Papa Dorin's words: amber words on a soft gold tint, with a twinkling sparkle. */
export const cookieWord = {
  /** The name's words. */
  text: '#8a4f08',
  /** The soft gold behind the name. */
  tint: 'rgba(255,198,92,0.38)',
  /** Its thin gold edge. */
  edge: 'rgba(224,160,42,0.7)',
  /** The sparkle after the name. */
  spark: '#e0a02a',
} as const;

/** The Quality Check (Burnt Cookies), from the design's Kitchen, on dark glass. */
export const qualityColors = {
  /** The Burnt button and its shadow. */
  burnt: '#c24a42',
  burntShadow: '#8f322c',
  /** A burnt cookie: a dark copy cut to the cookie's own shape lies over it, this much see-through. */
  char: '#1c0e06',
  charStrength: 0.72,
  /** The black smoke over a burnt cookie, and the white steam over a fresh one. */
  smoke: 'rgba(96,86,82,0.95)',
  steam: 'rgba(255,255,255,0.85)',
  /** The warm glow behind a fresh cookie. */
  glow: 'rgba(255,214,120,0.6)',
  /** The answer line: called it right, or not quite. */
  calledIt: '#b7f08a',
  missed: '#ffb4a8',
  /** A fix: the wrong words struck through, and the true words. */
  wrongWords: '#ff9a92',
  rightWords: '#b7f08a',
} as const;

/** Signing the cookie box: its cream label, the words on it, and the signature line. */
export const boxLabel = {
  /** The label's cream and its edge. */
  card: '#fffaf0',
  edge: '#e8d6b4',
  /** The small "Baked by" heading. */
  label: '#a0643a',
  /** The baker's name and their signature's ink. */
  ink: '#2a1d14',
  /** The line to sign on, and the "Sign here" hint. */
  line: '#c9b48a',
  hint: '#b39b78',
} as const;
