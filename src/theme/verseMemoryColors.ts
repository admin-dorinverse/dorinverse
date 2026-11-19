// Colors for the Verse Memory pages: the list look (dark glass with the Verse Memory card's cocoa) and the cream
// index card the verse is practiced on, taken from the prototype.

import { collectionHues } from './colors';

/** The Verse Memory lists, in the dark glass look; the accent is the Verse Memory card's cocoa. */
export const verseMemory = {
  /** The accent: the big count, the picked chip and the picked mode. */
  accent: collectionHues.cocoa,
  /** The big count's glow (the accent, 70% strength). */
  glow: 'rgba(224,164,106,0.7)',
  /** Fill of the picked chip. */
  chipOn: 'rgba(224,164,106,0.2)',
  /** Small grey labels, like a hint under a control. */
  soft: 'rgba(255,255,255,0.7)',
  /** The "Memorized" label on a verse card: its fill and words. */
  memorizedFill: 'rgba(140,199,90,0.22)',
  memorizedText: '#b8e68f',
  /** A wrong pick in the word bank: its fill and edge. */
  wrongFill: 'rgba(235,122,114,0.35)',
  wrongEdge: '#eb7a72',
  /** The Record button while recording. */
  recording: '#d9534f',
} as const;

/** The cream index card a verse is practiced on. */
export const indexCard = {
  /** The card's paper and its thin edge. */
  paper: '#fffdf6',
  edge: '#eadfc6',
  /** The red line under the card's heading. */
  headLine: '#e7a3a3',
  /** The verse reference in the heading, and the translation beside it. */
  reference: '#6b3a2e',
  translation: '#b0906a',
  /** The verse's words. */
  ink: '#3f3526',
  /** A hidden word's block, and how it looks while "Hold to reveal" is held. */
  hidden: '#3c3c3c',
  peekFill: '#fff1c2',
  peekText: '#8a6a00',
  /** A word's blank letters, and the underscores after its first letter. */
  blank: '#b09040',
  blankTail: '#c9ae5f',
  /** A word put in place correctly. */
  done: '#3f7420',
  /** The soft reference shown when nothing else is on the card. */
  faint: '#d5c48d',
} as const;

/** The Recall mode's knobs, drawn like the prototype's oven dials. */
export const knob = {
  /** The dial behind the knob, light in the middle and grey at the edge. */
  dialLight: '#fafafa',
  dialEdge: '#e2e2e2',
  /** The knob itself. */
  faceLight: '#ffffff',
  faceEdge: '#d8d8d8',
  /** The two small marks on the dial. */
  mark: '#c5c5c5',
  /** The pointer while off, and while on. */
  pointer: '#b09040',
  pointerOn: '#ff8c1a',
  /** The orange glow around a knob that is on. */
  glow: 'rgba(255,150,40,0.5)',
  glowInside: 'rgba(255,120,20,0.35)',
} as const;
