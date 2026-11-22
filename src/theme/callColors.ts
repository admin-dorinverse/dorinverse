// Colors for the get-together call, taken from the call mockups: the gold ring around whoever is talking, the
// avatars' colors, Papa Dorin's cream circle and gold card, the page's soft purple glow, and the red Leave button.

/** The call's colors. */
export const call = {
  /** The page: a soft purple glow at the top fading to the night blue (top, middle, bottom). */
  pageGlow: ['#2B2550', '#1B1A38', '#141533'],
  /** The asking and answering pages' glow, a little brighter behind Papa Dorin. */
  dorinGlow: '#3a2f63',
  /** The gold ring and glow around whoever is talking, and the sound-bars badge. */
  talking: '#ffc65c',
  talkingGlow: 'rgba(255,198,92,0.55)',
  /** Dark ink on the bright avatar colors and on gold. */
  ink: '#1a1c45',
  /** The avatars' colors, picked by name so each person keeps theirs. */
  avatars: ['#ff7d9c', '#7dffb4', '#c9a8ff', '#8fd8ff', '#e0a46a', '#ffc65c'],
  /** Papa Dorin's cream circle, its white edge on the card, and the blue ring and box while he listens. */
  dorinBack: '#fff5dc',
  dorinFaceEdge: 'rgba(255,255,255,0.7)',
  listening: '#8fd8ff',
  listeningGlow: 'rgba(143,216,255,0.45)',
  listeningFill: 'rgba(143,216,255,0.08)',
  listeningEdge: 'rgba(143,216,255,0.35)',
  /** Papa Dorin's pinned card: a gold-tinted glass (top and bottom) with a gold edge. */
  dorinCardTop: 'rgba(255,198,92,0.14)',
  dorinCardBottom: 'rgba(255,198,92,0.04)',
  dorinCardEdge: 'rgba(255,198,92,0.35)',
  /** The box with his words while he talks, and its gold edge. */
  wordsEdge: 'rgba(255,198,92,0.35)',
  /** Words he already said, softer than the part he's saying now. */
  saidBefore: 'rgba(255,255,255,0.55)',
  /** Status chips: one not reached yet, its words, and the current one. */
  chipIdle: 'rgba(255,255,255,0.06)',
  chipIdleInk: 'rgba(255,255,255,0.6)',
  /** Glass buttons and boxes on the dark page: fill and edge. */
  glassFill: 'rgba(255,255,255,0.1)',
  glassFillSoft: 'rgba(255,255,255,0.06)',
  glassEdge: 'rgba(255,255,255,0.2)',
  /** The muted badge on an avatar, and the "+3" circle. */
  mutedBadge: '#3a3466',
  more: 'rgba(255,255,255,0.14)',
  /** The red Leave button. */
  leave: '#e5484d',
  /** The edge between an avatar and its badge, the page's own dark. */
  page: '#141533',
  /** The mic check's bars: lit and unlit. */
  meterOn: '#7dffb4',
  meterOff: 'rgba(255,255,255,0.18)',
  /** The host's tools: Show a verse (gold), Do a lesson (green), Trivia (pink): icon, fill and edge. */
  toolVerse: '#ffd98a',
  toolVerseFill: 'rgba(255,198,92,0.12)',
  toolVerseEdge: 'rgba(255,198,92,0.45)',
  toolLesson: '#7dffb4',
  toolLessonFill: 'rgba(125,255,180,0.1)',
  toolLessonEdge: 'rgba(125,255,180,0.45)',
  toolTrivia: '#ff7d9c',
  toolTriviaFill: 'rgba(255,125,156,0.1)',
  toolTriviaEdge: 'rgba(255,125,156,0.45)',
  /** The pink small heading on the joining screen ("YOU'RE INVITED"). */
  kicker: '#ff7d9c',
  /** The Join button's shadow edge. */
  joinShadow: '#8c6a2c',
} as const;

/** The call's shown verse and lesson screens, from the call mockups (a verse on screen, a lesson together). */
export const callShowColors = {
  /** The chapter card: its cream, edge, deep shadow, and the soft red line under its heading. */
  verseCard: '#fffdf6',
  verseEdge: '#eadfc6',
  verseShadow: 'rgba(0,0,0,0.65)',
  verseHeadLine: '#e7a3a3',
  /** The chapter's name, the small "BSB" and verse numbers, and the verse words. */
  verseTitle: '#6b3a2e',
  verseSoft: '#b0906a',
  verseInk: '#3f3526',
  /** The verse lit up: its pale gold fill and its darker gold number (its ring is the talking gold). */
  verseLit: '#fff1c2',
  verseLitNumber: '#8a6a00',
  /** The bar under the chapter, and its white round button. */
  verseBar: '#fbf4e2',
  verseButton: '#ffffff',
  /** The thin line between Papa Dorin and everyone in the people strip, and his soft gold ring there. */
  stripLine: 'rgba(255,255,255,0.16)',
  dorinRing: 'rgba(255,198,92,0.8)',
  /** The "+3 Everyone" circle in the strip: fill and edge. */
  moreFill: 'rgba(255,255,255,0.12)',
  moreEdge: 'rgba(255,255,255,0.25)',
  /** The gold box docked at the bottom with Papa Dorin's answer: its glass (top and bottom), edge and glow. */
  answerTop: 'rgba(255,198,92,0.16)',
  answerBottom: 'rgba(255,198,92,0.05)',
  answerEdge: 'rgba(255,198,92,0.55)',
  answerGlow: 'rgba(255,198,92,0.18)',
  /** The page's middle dark, the ring that keeps a small avatar apart from what's behind it. */
  ringDark: '#1B1A38',
  /** The "Hold to ask Papa Dorin" pill: its dark glass, gold edge, gold glow and drop shadow. */
  pillFill: 'rgba(27,26,56,0.92)',
  pillEdge: 'rgba(255,198,92,0.7)',
  pillGlow: 'rgba(255,198,92,0.3)',
  dropShadow: 'rgba(0,0,0,0.6)',
  /** The explanation he reads: the sentence he's saying, lit gold, and the part he already read, softer. */
  readingNow: 'rgba(255,198,92,0.45)',
  readingDone: 'rgba(74,51,34,0.6)',
  /** The soft shadow under a lesson question's cream card, and the dark edge under an answer not picked. */
  cardShadow: 'rgba(0,0,0,0.3)',
  answerShadow: 'rgba(0,0,0,0.25)',
} as const;

/** The call's trivia screens, from the call mockups (question, results, explaining, winner). */
export const callTriviaColors = {
  /** The four answer tiles (A blue triangle, B gold diamond, C pink circle, D green square) and their edges. */
  tiles: ['#8fd8ff', '#ffc65c', '#ff7d9c', '#7dffb4'],
  tileEdges: ['#4f7a92', '#8c6a2c', '#94485b', '#3f8a60'],
  /** The bars on the results, in each answer's color, see-through. */
  bars: ['rgba(143,216,255,0.55)', 'rgba(255,198,92,0.75)', 'rgba(255,125,156,0.55)', 'rgba(125,255,180,0.55)'],
  /** The white ring and gold glow around your pick (the glow also rings the winner). */
  pickRing: '#ffffff',
  pickGlow: 'rgba(255,198,92,0.5)',
  /** The right answer: green line, its soft green box. */
  right: '#7dffb4',
  rightFill: 'rgba(125,255,180,0.14)',
  /** The question card and its edge, a bar's empty track, and the clock ring's empty track. */
  card: 'rgba(255,255,255,0.08)',
  cardEdge: 'rgba(255,255,255,0.16)',
  track: 'rgba(255,255,255,0.08)',
  ringTrack: 'rgba(255,255,255,0.15)',
  /** Softer white words (small headings, notes, an answer nobody picked). */
  soft: 'rgba(255,255,255,0.7)',
  softer: 'rgba(255,255,255,0.75)',
  /** The winner page's glow in the middle, and the podium's 2nd and 3rd steps. */
  winnerGlow: '#4a3a66',
  podiumSecond: 'rgba(255,255,255,0.14)',
  podiumThird: 'rgba(255,255,255,0.1)',
  /** The explaining page's verse card and its words. */
  verseFill: 'rgba(255,255,255,0.05)',
  verseWords: 'rgba(255,255,255,0.9)',
} as const;
