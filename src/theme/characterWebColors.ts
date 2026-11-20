// Colors for Character Connections, taken from the owner's Bible Character Web artifact: one warm cream look with
// square cream cards, and a color for each kind of link. The sky's glowing light blue web is here too.

/** The web page's cream look. */
export const webPage = {
  /** The page and the web's background. */
  background: '#FBF8ED',
  /** Thin lines between rows, and the edge of the search box and buttons. */
  line: '#e6dac2',
  /** Main words. */
  ink: '#2b2118',
  /** Quieter words, like counts and tags. */
  muted: '#86634A',
  /** The picked checkbox and the focus ring. */
  accent: '#5A3A22',
  /** A card's light top corner and darker bottom corner. */
  cardTop: '#FFFDF6',
  cardBottom: '#F1E2C6',
  /** The soft shadow under a card. */
  cardShadow: 'rgba(60,35,10,0.22)',
  /** A card's name and its edge. */
  cardInk: '#4A3322',
  cardEdge: '#8a5a2b',
  /** A card for someone not collected yet: paler face, soft edge and faint name. */
  lockedTop: '#F7F2E6',
  lockedBottom: '#EEE6D6',
  lockedEdge: '#d3c6ad',
  lockedInk: '#b9a88e',
  /** The box behind a quoted passage. */
  quote: '#F4EEDD',
  /** Words on a link's colored pill. */
  pillText: '#ffffff',
} as const;

/** Each kind of link's color, by its type. */
export const linkColors: Readonly<Record<string, string>> = {
  family: '#c2410c',
  married: '#d6336c',
  loved: '#a21caf',
  helped: '#1f9d55',
  worked_together: '#0d9488',
  counseled: '#2563eb',
  apostle: '#4338ca',
  followed: '#0284c7',
  served: '#7c3aed',
  anointed: '#b7791f',
  blessed: '#ca8a04',
  rebuked: '#9a3412',
  enemies: '#dc2626',
  betrayed: '#881337',
  rivals: '#ea580c',
  healed: '#4d7c0f',
  friends: '#16a34a',
  covenant: '#0f766e',
  judged: '#475569',
  put_to_death: '#7f1d1d',
  saved: '#0369a1',
  deceived: '#a16207',
  prophesied: '#155e75',
  prophecy: '#0e8f9c',
  crossed_paths: '#64748b',
};

/** The sky's Character Connections web: glowing light blue lines and dots, like a constellation. */
export const skyWeb = {
  /** The lines and dots. */
  line: '#9fdcff',
  /** The wide soft glow around the lines. */
  glow: 'rgba(159,220,255,0.22)',
  /** A dot's bright middle. */
  core: '#ffffff',
} as const;
