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
  /** Dark veil laid over the sky behind the Collections and Keep it fresh tabs. */
  tabVeil: 'rgba(6,7,24,0.45)',
  /** Dimmed backdrop behind an open panel. */
  backdrop: 'rgba(5,6,20,0.45)',
  /** Fill of the Star Map card. */
  mapCard: 'rgba(18,20,58,0.62)',
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
