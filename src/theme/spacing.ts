// Spacing, corner rounding and the fixed sizes used across the app, taken from the Constellations design.

/** Space between the screen edge and content. */
export const gutter = 16;

/** Corner rounding sizes. */
export const radius = {
  /** Fully round ends, for pills and tabs. */
  pill: 999,
  /** Big buttons. */
  button: 16,
  /** Dock buttons. */
  dockButton: 18,
  /** List cards. */
  card: 24,
  /** A constellation's book tiles. */
  tile: 18,
  /** The dock and bottom sheets. */
  sheet: 26,
  /** The Star Map card. */
  mapCard: 28,
  /** The map square inside the Star Map card. */
  map: 20,
} as const;

/** Fixed sizes of the home screen's floating controls. */
export const chrome = {
  /** Distance of the HUD pills from the top safe edge. */
  hudTop: 12,
  /** Distance of the knob tabs from the top safe edge (they sit under the HUD). */
  tabsTop: 62,
  /** Height of one HUD pill. */
  hudPillHeight: 38,
  /** Width and height of a tab that is not selected. */
  tabKnob: { width: 44, height: 40 },
  /** Size of the round map button. */
  mapButton: 84,
  /** How much the map button grows while the sky is moving. */
  mapButtonGrow: 1.42,
  /** Distance of the map button and dock from the bottom safe edge. */
  bottom: 18,
  /** Size of one dock button. */
  dockButton: 50,
  /** Size of the picture inside a dock button. */
  dockIcon: 40,
} as const;
