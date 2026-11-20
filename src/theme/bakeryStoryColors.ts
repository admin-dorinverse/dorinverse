// Colors for Papa Dorin's Story, taken from the Constellations design: the warm light page, the cream story card,
// the handwritten note, the page dots and buttons, and each chapter's little picture.

/** The page, its header, the story card, the dots and the buttons. */
export const storyPage = {
  /** The page's warm glow: light at the top middle, deeper toward the edges. */
  glowTop: '#fff6e2',
  glowEdge: '#f6e3c2',
  /** The header title and the back arrow. */
  ink: '#4B3221',
  /** The back button's glass: its bright middle, its soft middle, its cool edge, its inner light and shade, and its shadow. */
  backShine: 'rgba(255,255,255,0.95)',
  backMid: 'rgba(255,255,255,0.55)',
  backEdge: 'rgba(214,232,250,0.45)',
  backInnerLight: 'rgba(255,255,255,0.9)',
  backInnerShade: 'rgba(120,150,190,0.25)',
  backShadow: 'rgba(60,35,10,0.35)',
  /** The story card's paper, edge, soft shadow, and the faint line down its left side. */
  paper: '#fffaf0',
  edge: '#E6D7BC',
  cardShadow: 'rgba(90,58,34,0.5)',
  margin: 'rgba(201,180,138,0.18)',
  /** "Chapter N" above the title. */
  chapter: '#c98542',
  /** The chapter title. */
  title: '#5A3A22',
  /** The handwritten note: its ink, its white paper, its edge, its blue ruled lines and its shadow. */
  noteInk: '#3a2a1c',
  notePaper: '#ffffff',
  noteEdge: '#e2cfa8',
  noteRule: 'rgba(140,170,220,0.35)',
  noteShadow: 'rgba(90,58,34,0.4)',
  /** A page dot, and the dot for the page that shows. */
  dot: '#e2cfa8',
  dotOn: '#c98542',
  /** The "Next page" button, its shadow edge and its words. */
  button: '#5A3A22',
  buttonShadow: '#3E2A1E',
  buttonText: '#ffffff',
  /** The "Back" button's white fill, its words and its edge. */
  ghost: '#ffffff',
  ghostText: '#5A3A22',
  ghostEdge: '#E6D7BC',
} as const;

/** Each chapter's picture. */
export const storyArt = {
  /** The soft shadow under pictures. */
  shadow: 'rgba(90,58,34,0.3)',
  /** The gold twinkles. */
  sparkle: '#e0a92b',
  /** The 25¢ price sticker: its paper and red. */
  tagPaper: '#fffaf0',
  tagRed: '#c8332b',
  tagShadow: 'rgba(0,0,0,0.15)',
  /** Steam over the warm cookies, and its clear edge. */
  steam: 'rgba(255,255,255,0.95)',
  steamClear: 'rgba(255,255,255,0)',
  /** A cutter's white shine line, and the names under the cutters. */
  cutterShine: '#ffffff',
  kidName: '#5a3a22',
  /** The drawer: its wood (light and dark), the cabinet, the dark inside, its edge, and the gold handle and its edge. */
  woodLight: '#b98252',
  woodDark: '#7a4a26',
  cabinet: '#5a3a22',
  inside: '#2a1a10',
  woodEdge: '#4a2c17',
  handle: '#e0b84f',
  handleEdge: '#8a5a1a',
  /** The kitchen light pouring into the drawer. */
  beam: '#fff6c8',
  /** The junk's shadow. */
  junkShadow: 'rgba(0,0,0,0.25)',
  /** "Hey, friend.": its bubble, edge and words. */
  bubble: '#ffffff',
  bubbleEdge: '#E6D7BC',
  bubbleText: '#5a3a22',
  /** The warm glow behind the angel and behind Papa Dorin at the end: its middle, its warm ring and its clear edge. */
  glowMiddle: '#fff8d6',
  glowRing: 'rgba(255,220,140,0.5)',
  glowClear: 'rgba(255,220,140,0)',
  /** The halo behind the cookie boxes. */
  halo: '#fff3c4',
  /** The angel's light (white, pale gold, gold) and wings. */
  angelWhite: '#ffffff',
  angelPale: '#fff6c8',
  angelGold: '#ffd27a',
  wing: '#fffaf0',
  /** The shine that sweeps over Papa Dorin when he is made new. */
  shine: '#ffffff',
  /** The takeout menu: its paper, edge, red heading, gray lines and shadow. */
  menuPaper: '#fffaf0',
  menuEdge: '#d9c49c',
  menuRed: '#c8332b',
  menuLine: '#eadbbf',
  menuShadow: 'rgba(90,58,34,0.5)',
  /** The stubby pencil: its yellow body, wood tip, pink eraser and outline. */
  pencil: '#f2c14e',
  pencilTip: '#e8d2a8',
  eraser: '#e57b7b',
  pencilEdge: '#8a5a1a',
  /** The open Bible: its cover, pages and page edge. */
  bookCover: '#7a3b1e',
  bookPage: '#fffaf0',
  bookEdge: '#c9b48a',
  /** The see-through gray-brown laid over Papa Dorin when he is worn down. */
  wornTint: '#8a7a68',
} as const;
