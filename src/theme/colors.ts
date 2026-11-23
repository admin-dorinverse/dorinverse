// The app's colors, taken from the Constellations design. Every screen uses these names instead of typing colors by hand.

/** Night sky colors: the background gradient and the star tints. */
export const sky = {
  /** Top of the sky gradient. */
  top: '#1B1A38',
  /** Middle of the sky gradient (70% down). */
  middle: '#2B2550',
  /** Bottom of the sky gradient. */
  bottom: '#4A3A66',
  /** Warm gold star. */
  starGold: '#FFE2A3',
  /** Plain white star. */
  starWhite: '#ffffff',
  /** Soft lilac star. */
  starLilac: '#B6ADC9',
  /** Pale blue star. */
  starBlue: '#CFE3FF',
  /** The three nebula cloud colors with how strongly each shows. */
  nebula: [
    { color: '#3b2a7a', alpha: 0.22 },
    { color: '#7a1f3d', alpha: 0.14 },
    { color: '#1d6a6a', alpha: 0.12 },
  ],
} as const;

/** Warm bakery colors used on cards, the kitchen and Papa Dorin's things. */
export const bakery = {
  /** Dark body text on light cards. */
  ink: '#3c3c3c',
  /** Cream page background. */
  cream: '#fdf8ec',
  /** Thin line on cream cards. */
  creamLine: '#e8d9b0',
  /** Chocolate brown for titles on cream. */
  brown: '#5A3A22',
  /** The app's main gold. */
  gold: '#ffc65c',
  /** Warm glow around the bakery planet and its map pin. */
  planetGlow: '#ffcf7a',
  /** Soft lavender for small notes on dark screens. */
  mist: '#c9cbef',
  /** Warm white for text on dark screens. */
  white: '#fffaf0',
} as const;

/** Frosted glass surfaces that float over the sky. */
export const glass = {
  /**
   * The dark tint under every glass surface. It stands in for blurring the sky, which costs the phone a lot
   * while the sky moves. Over the night sky the two look nearly the same.
   */
  still: 'rgba(36,32,74,0.74)',
  /** Fill of a plain glass surface. */
  fill: 'rgba(255,255,255,0.08)',
  /** Thin border of a glass surface. */
  border: 'rgba(255,255,255,0.16)',
  /** Brighter top edge that makes glass look lit from above. */
  borderTop: 'rgba(255,255,255,0.3)',
  /** Top of the glass pill gradient (HUD pills, dock). */
  pillTop: 'rgba(255,255,255,0.16)',
  /** Bottom of the glass pill gradient. */
  pillBottom: 'rgba(255,255,255,0.06)',
  /** Dark veil laid over the sky behind the Collections and Bible Crew tabs. */
  tabVeil: 'rgba(6,7,24,0.45)',
  /** Dimmed backdrop behind an open panel. */
  backdrop: 'rgba(5,6,20,0.45)',
  /** Fill of the Star Map card. */
  mapCard: 'rgba(18,20,58,0.62)',
  /** Light dark base under the tinted hero cards, standing in for the design's blur. */
  cardBase: 'rgba(16,15,44,0.32)',
  /** Bottom of a hero card's gradient. */
  cardBottom: 'rgba(10,10,35,0.25)',
  /** Soft white used for small round buttons on glass. */
  button: 'rgba(255,255,255,0.12)',
} as const;

/** The knob tabs at the top of the screen. */
export const tabs = {
  /** Icon and label color of a tab that is not selected. */
  idle: '#e9e9ff',
  /** Background of the selected tab. */
  selectedFill: 'rgba(255,255,255,0.92)',
  /** Icon and label color of the selected tab. */
  selectedInk: '#1a1c45',
} as const;

/** Text colors. */
export const text = {
  /** Plain white text on dark glass. */
  onDark: '#ffffff',
  /** Softer white for secondary lines on dark glass. */
  onDarkSoft: 'rgba(255,255,255,0.82)',
  /** Gold for small headings on dark screens. */
  goldNote: '#ffd98a',
} as const;

/** The Collections cards' accent colors, one per collection, from the Constellations design. */
export const collectionHues = {
  /** Bible verses. */
  amber: '#ffc65c',
  /** Characters. */
  berry: '#ff7d9c',
  /** Places. */
  sage: '#7dffb4',
  /** Prophecy and Fulfillment of Jesus. */
  blue: '#8fd8ff',
  /** Instructions for Today. */
  cocoa: '#e0a46a',
  /** Prayers. */
  lav: '#c9a8ff',
} as const;

/** One of the Collections accent colors. */
export type CollectionHue = keyof typeof collectionHues;

/** The Collections art's fixed colors: book spines, character cards, the candle and the compass. */
export const collectionArt = {
  /** Book spine colors as [middle, edge] pairs; each book picks one from its name. */
  spines: [
    ['#ffc65c', '#f2a93b'],
    ['#ff9d6c', '#e0774a'],
    ['#ffe39a', '#f2c96a'],
    ['#f2a93b', '#c9821f'],
  ],
  /** Spine of a placeholder book, shown until enough books are collected. */
  blankSpine: ['#b98a52', '#8a6236'],
  /** Title and band color on a book spine. */
  spineInk: '#3a2606',
  /** The wooden shelf, top to bottom. */
  shelfTop: '#d9a35a',
  shelfBottom: '#8a5a26',
  /** A character card's gradient, top-left to bottom-right. */
  cardFront: ['#ff9fb6', '#d4507a', '#6e1f45'],
  /** A "Who's next?" card's gradient. */
  cardBack: ['#3a2140', '#1d1230'],
  /** Dark text on the card's light pills. */
  cardInk: '#2a0a14',
  /** The NEW badge on the newest character. */
  newBadge: '#ffe39a',
  /** Inside of a place pin. */
  pinInside: '#123a2a',
  /** The compass needle's north and south halves, and its middle. */
  needleNorth: '#ff7a5c',
  needleSouth: '#f4e6d2',
  compassHub: '#3a2414',
  /** The prayer candle, its top, wick, and flame outer and inner. */
  candle: '#f6ead7',
  candleTop: '#fff8ec',
  wick: '#3a2a1c',
  flameOuter: '#ffb347',
  flameInner: '#fff3b0',
} as const;

/** The Bible reader and book list, in the dark glass look. */
export const reader = {
  /** Background of the reader and its pages. */
  page: '#141533',
  /** Revealed verse words. */
  text: 'rgba(255,255,255,0.92)',
  /** Every verse's number, revealed or covered. */
  verseNumber: '#ffc65c',
  /** The big chapter number at the top of the page. */
  chapterNumber: 'rgba(255,255,255,0.26)',
  /** Fill of a row, a tile or a control on the dark page. */
  surface: 'rgba(255,255,255,0.07)',
  /** Thin edge of a row, a tile or a control. */
  edge: 'rgba(255,255,255,0.14)',
  /** A book or chapter that can't be opened yet. */
  locked: 'rgba(255,255,255,0.32)',
  /** A chapter with some verses revealed: its tile edge. */
  someEdge: '#ff9d6c',
  /** A fully revealed chapter: its tile fill and edge. */
  fullFill: 'rgba(255,198,92,0.22)',
  fullEdge: '#ffc65c',
  /** Search words found inside a verse. */
  highlight: 'rgba(255,198,92,0.35)',
  /**
   * Covered words, drawn as soft clouds of stardust in the Stardust font. Each word takes the next of the six
   * constellation colors (blue, orange, yellow, green, purple, pink), slightly softened, so covered verses never
   * look like the white revealed words.
   */
  stardust: [
    'rgba(143,216,255,0.85)',
    'rgba(255,180,94,0.85)',
    'rgba(255,224,102,0.85)',
    'rgba(125,255,180,0.85)',
    'rgba(195,155,255,0.85)',
    'rgba(255,125,156,0.85)',
  ],
} as const;

/** The Characters pages, in the dark glass look; their accent is the Characters card's berry. */
export const characters = {
  /** The accent: the big count, verse counts and the selected book chip. */
  accent: collectionHues.berry,
  /** The big count's glow (the accent, 70% strength). */
  glow: 'rgba(255,125,156,0.7)',
  /** A round letter badge's gradient, top-left (berry mixed 85% with white) to bottom-right (berry 50% with black). */
  badgeLight: '#ff91ab',
  badgeDark: '#803f4e',
  /** Fill of the selected book chip and the current recently viewed chip. */
  chipOn: 'rgba(255,125,156,0.22)',
  /** Small grey labels, like "Judges 3" under a name. */
  soft: 'rgba(255,255,255,0.7)',
} as const;

/** The Places pages, in the same dark glass look; their accent is the Places card's sage. */
export const places = {
  /** The accent: the big count, verse counts and the selected book chip. */
  accent: collectionHues.sage,
  /** The big count's glow (the accent, 70% strength). */
  glow: 'rgba(125,255,180,0.7)',
  /** The no-photo look's gradient, top-left (sage mixed 85% with white) to bottom-right (sage 50% with black). */
  badgeLight: '#91ffbf',
  badgeDark: '#3f805a',
  /** Fill of the selected book chip. */
  chipOn: 'rgba(125,255,180,0.2)',
  /** Small grey labels, like "Joshua 6" under a name. */
  soft: 'rgba(255,255,255,0.7)',
} as const;

/** The Prophecy and Fulfillment page, in the same dark glass look; its accent is the Prophecy card's blue. */
export const prophecy = {
  /** The accent: the big count, the promise and fulfillment stars and the selected chip. */
  accent: collectionHues.blue,
  /** The big count's glow (the accent, 70% strength). */
  glow: 'rgba(143,216,255,0.7)',
  /** Fill of the selected chip. */
  chipOn: 'rgba(143,216,255,0.2)',
  /** Small grey labels, like a reference. */
  soft: 'rgba(255,255,255,0.7)',
  /** A joined link's card: its edge and its soft, still glow. */
  joinedEdge: 'rgba(143,216,255,0.75)',
  joinedGlow: '0 0 18px rgba(143,216,255,0.45)',
  /** Fill of a joined link's card. */
  joinedFill: 'rgba(143,216,255,0.08)',
} as const;

/** The Instructions for Today page, in the same dark glass look; its accent is the Instructions card's cocoa. */
export const instructions = {
  /** The accent: the big count, the commandment numbers and the selected chip. */
  accent: collectionHues.cocoa,
  /** The big count's glow (the accent, 70% strength). */
  glow: 'rgba(224,164,106,0.7)',
  /** Fill of the selected chip and the Ten Commandments pack. */
  chipOn: 'rgba(224,164,106,0.2)',
  /** Small grey labels, like a reference. */
  soft: 'rgba(255,255,255,0.7)',
} as const;

/** The Prayers page, in the same dark glass look; its accent is the Prayers card's lavender. */
export const prayers = {
  /** The accent: the big count, who prayed and the selected chip. */
  accent: collectionHues.lav,
  /** The big count's glow (the accent, 70% strength). */
  glow: 'rgba(201,168,255,0.7)',
  /** Fill of the selected chip. */
  chipOn: 'rgba(201,168,255,0.2)',
  /** Small grey labels, like a reference. */
  soft: 'rgba(255,255,255,0.7)',
} as const;

/** Deep navy used for dark text on bright buttons and pills. */
export const navy = '#1a1c45';

/** The Star Map's inside colors. */
export const starMap = {
  /** Middle of the big map's radial background. */
  center: '#1d2160',
  /** Edge of the big map's radial background. */
  edge: '#080920',
  /** Middle of the small round map button. */
  miniCenter: '#202468',
  /** Edge of the small round map button. */
  miniEdge: '#0a0b26',
} as const;

/** A QR code's colors: the app's deep navy squares on white, the strong contrast phone cameras need to read it. */
export const qr = {
  /** The dark squares. */
  dark: '#1a1c45',
  /** The light background and the quiet border around the code. */
  light: '#ffffff',
} as const;
