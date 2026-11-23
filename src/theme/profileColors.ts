// Colors and sizes for the Profile page (src/app/profile.tsx), in the Constellations look: the friend card that pops
// up from the QR button, the soft square that stands in for the QR code until the code is known, and the page's sizes.

/** The Profile page's colors. */
export const profile = {
  /** The soft fill and dashed edge of the square shown where the QR code goes, until the code is known. */
  qrWaitingFill: 'rgba(255,255,255,0.06)',
  qrWaitingEdge: 'rgba(255,255,255,0.28)',
  /** The little arrow at the end of a friend's row. */
  rowArrow: 'rgba(255,255,255,0.55)',
  /** The dark veil over the page while the friend card is open. */
  cardDim: 'rgba(5,6,20,0.72)',
  /** The friend card's deep glass fill, nearly solid so the page behind doesn't show through. */
  cardFill: 'rgba(24,24,66,0.97)',
  /** The soft panel behind the avatar on the friend card: a light top fading down. */
  panelTop: 'rgba(255,255,255,0.12)',
  panelBottom: 'rgba(255,255,255,0.03)',
  /** How strongly the person's avatar color glows on that panel (0 to 1). */
  panelGlow: 0.4,
} as const;

/** The Profile page's sizes. */
export const profileSizes = {
  /** The big avatar at the top. */
  bigAvatar: 104,
  /** A friend's avatar in the list. */
  friendAvatar: 44,
  /** The QR code's width and height. */
  qr: 208,
  /** The rounding of the QR code's corners. */
  qrRadius: 18,
  /** The avatar inside the HUD's round avatar button, which is a HUD pill high. */
  hudAvatar: 30,
  /** The height of the Account pill and the QR button beside it; the QR button is this wide too. */
  topButton: 34,
  /** The rounding of the QR button's corners. */
  topButtonRadius: 11,
  /** The QR picture inside the QR button. */
  qrIcon: 19,
  /** The friend card's widest width. */
  cardWidth: 340,
  /** The avatar on the friend card. */
  cardAvatar: 88,
  /** The height of the soft panel behind that avatar. */
  cardPanel: 120,
  /** The rounding of that panel's corners. */
  cardPanelRadius: 20,
  /** The small still sparkles on that panel. */
  cardSparkle: 14,
  /** The round close button on the friend card. */
  cardClose: 32,
} as const;
