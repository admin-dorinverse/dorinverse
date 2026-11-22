// Colors for signing in and the Account page, in the Constellations look: dark glass boxes over the still sky,
// the app's gold button, soft notes, and a red only for deleting the account.

/** The sign-in and Account pages' colors. */
export const account = {
  /** A text box's fill and edge, and its gold edge while typing in it. */
  fieldFill: 'rgba(255,255,255,0.1)',
  fieldEdge: 'rgba(255,255,255,0.2)',
  fieldFocus: 'rgba(255,198,92,0.75)',
  /** The grey hint in an empty box. */
  hint: 'rgba(255,255,255,0.45)',
  /** The main button: the app's gold, its dark words and the darker gold under it. */
  button: '#ffc65c',
  buttonInk: '#1a1c45',
  buttonShadow: '#c9821f',
  /** A quieter glass button's fill and edge. */
  quietFill: 'rgba(255,255,255,0.1)',
  quietEdge: 'rgba(255,255,255,0.2)',
  /** A line saying what went wrong, and one saying all is well (like "That name is free"). */
  problem: '#ffb4a8',
  good: '#7dffb4',
  /** The thin lines either side of "or". */
  rule: 'rgba(255,255,255,0.18)',
  /** The Google button: white with dark words, as Google asks. */
  googleFill: '#ffffff',
  googleInk: '#1f1f1f',
  /** The Apple button on Android: black with white words, as Apple asks. */
  appleFill: '#000000',
  appleInk: '#ffffff',
  /** Deleting the account: its red button and the red's words. */
  danger: '#e5484d',
  dangerInk: '#ffffff',
} as const;
