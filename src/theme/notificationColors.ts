// Colors for the Notifications page, in the Constellations look: quiet glass rows over the still sky, a light gold
// wash on news that came in since the page was last opened, and the Approve and Reject buttons.

import { account } from './accountColors';
import { text } from './colors';

/** The Notifications page's colors. */
export const notifications = {
  /** A row's fill and thin edge. */
  rowFill: 'rgba(255,255,255,0.07)',
  rowEdge: 'rgba(255,255,255,0.14)',
  /** A new row's light gold wash and edge, shown while the page is open. */
  newFill: 'rgba(255,217,138,0.13)',
  newEdge: 'rgba(255,217,138,0.5)',
  /** A row's words, the person's name in them, and the "5 min ago" line. */
  line: text.onDarkSoft,
  name: text.onDark,
  when: 'rgba(255,255,255,0.55)',
  /** The Approve button: the app's gold, its dark words and the darker gold under it. */
  approve: account.button,
  approveInk: account.buttonInk,
  approveShadow: account.buttonShadow,
  /** The Reject button: quiet glass with white words. */
  rejectFill: account.quietFill,
  rejectEdge: account.quietEdge,
  rejectInk: text.onDark,
  /** "You're friends now" after an Approve, and "Request turned down" after a Reject. */
  friendsNow: account.good,
  turnedDown: 'rgba(255,255,255,0.6)',
  /** A line saying what went wrong. */
  problem: account.problem,
  /** The gentle note shown when the server can't be reached. */
  noteFill: 'rgba(255,255,255,0.06)',
  noteEdge: 'rgba(255,255,255,0.16)',
} as const;
