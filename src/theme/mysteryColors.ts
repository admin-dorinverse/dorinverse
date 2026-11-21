// Colors for the Weekly Word: the red Clue Book that glows in the sky, and the Clue Book page (cream clue pages
// with a red ribbon on the dark glass look).

/** The Weekly Word's colors. */
export const mystery = {
  /** The book's red cover: light corner, middle, dark corner, and its outline. */
  cover: ['#ff6a55', '#d9342b', '#8f1f1a'],
  coverEdge: '#6e1612',
  /** The gold trim and question mark on the cover, and gold words on the page. */
  gold: '#ffd98a',
  /** The book's page edges. */
  pages: '#fff5dc',
  pagesEdge: '#c9b48a',
  /** The red glow behind the book in the sky: its middle, fading to nothing. */
  glow: 'rgba(255,82,62,0.75)',
  glowFade: 'rgba(255,82,62,0)',
  /** The accent on the page: ribbons, the day strip and the tries. */
  accent: '#ff6a55',
  accentSoft: 'rgba(255,106,85,0.22)',
  /** A clue page: its paper, edge, heading and words. */
  paper: '#fffdf6',
  paperEdge: '#eadfc6',
  heading: '#b0392f',
  ink: '#3f3526',
  /** The NEW badge on a clue just collected: its fill and words. */
  newFill: '#ffd98a',
  newInk: '#3a2606',
  /** A missed clue's dashed edge, and quiet lines on the dark page. */
  missedEdge: 'rgba(255,255,255,0.22)',
  soft: 'rgba(255,255,255,0.7)',
  /** A day not reached yet on the day strip. */
  later: 'rgba(255,255,255,0.14)',
  /** The guess box: its edge, fill and hint, like the chat's text box. */
  inputEdge: 'rgba(255,255,255,0.25)',
  inputFill: 'rgba(255,255,255,0.1)',
  inputHint: 'rgba(255,255,255,0.55)',
  /** The Guess button's dark words. */
  buttonInk: '#1a1c45',
  /** A right guess: its fill, edge and words. */
  rightFill: 'rgba(140,199,90,0.2)',
  rightEdge: '#8cc75a',
  rightInk: '#c9f0a4',
} as const;
