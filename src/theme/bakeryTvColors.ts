// Colors and fixed sizes for two bakery pages, taken from the Constellations design: Bakery TV (the wooden TV,
// its screen and the guide rows on dark glass) and the paper Order Ticket with its red RUSH stamp.

import { bakery } from './colors';

/** The Bakery TV page: the TV set, its screen and the guide under it. */
export const bakeryTv = {
  /** The page's accent: the playing row's edge and a reminder that is set. */
  accent: bakery.gold,
  /** The TV's wooden frame, and the lighter wood ring around it. */
  frame: '#6b3f22',
  frameRing: '#a0643a',
  /** The warm glow around the whole TV. */
  frameGlow: 'rgba(255,200,90,0.3)',
  /** The screen's soft light from above, and its faint lines. */
  screenShine: 'rgba(255,255,255,0.25)',
  scanLine: 'rgba(0,0,0,0.08)',
  /** Shadow behind the big program title on the screen. */
  titleShadow: 'rgba(0,0,0,0.35)',
  /** The screen behind the video while it loads. */
  screenOff: '#000000',
  /** Words on the screen. */
  screenText: '#ffffff',
  /** A guide row: its fill and thin edge. */
  rowFill: 'rgba(255,255,255,0.06)',
  rowEdge: 'rgba(255,255,255,0.1)',
  /** The playing row's gold edge and glow. */
  nowEdge: 'rgba(255,200,90,0.6)',
  nowGlow: '0 0 14px rgba(255,200,90,0.25)',
  /** A guide row's start time, and the small line under a program's name. */
  time: 'rgba(255,255,255,0.75)',
  note: 'rgba(255,255,255,0.65)',
  /** The "Remind me" button: its edge and fill, and the dark words once it is set. */
  remindEdge: 'rgba(255,255,255,0.25)',
  remindFill: 'rgba(255,255,255,0.08)',
  remindSetText: '#1a1c45',
} as const;

/** Color pairs for videos: the screen's gradient between videos (top-left, bottom-right) and the guide row's strip. */
export const bakeryTvShowColors: readonly (readonly [string, string])[] = [
  ['#1d5c4f', '#4fb39a'],
  ['#5b3a8a', '#a77fe0'],
  ['#8a3b1f', '#e08a4f'],
  ['#7a5a12', '#e0b84f'],
  ['#2a4f8a', '#6fa0e8'],
  ['#6e1f3a', '#d46a8e'],
  ['#245a2a', '#7cc485'],
  ['#123f5a', '#4fa3d4'],
];

/** Fixed sizes of the Bakery TV page. */
export const bakeryTvSize = {
  /** The screen's width divided by its height. */
  screenAspect: 16 / 10,
  /** Thickness of the wooden frame and of the ring around it. */
  frame: 6,
  frameRing: 3,
  /** Corner rounding of the screen. */
  screenRadius: 22,
  /** Size of the big title on the screen between videos, and of the small line under it. */
  title: 28,
  line: 14,
  /** A guide row's color strip, and the width of its start time. */
  swatch: { width: 10, height: 34 },
  timeWidth: 62,
} as const;

/** The paper Order Ticket from Papa Dorin. */
export const orderTicket = {
  /** The dim layer over the bakery behind the ticket. */
  backdrop: 'rgba(0,0,0,0.45)',
  /** The paper and its shadow. */
  paper: bakery.white,
  shadow: '0 18px 40px rgba(0,0,0,0.5)',
  /** Plain dark words on the paper. */
  ink: '#2a1d14',
  /** Small brown labels: the bakery's name, row names, the reference. */
  label: '#a0643a',
  /** The red title and the RUSH stamp. */
  red: '#c8332b',
  /** Dotted lines between a row's name and value, and the dashed tear lines. */
  dots: '#d9c49c',
  /** The verse's words. */
  quote: '#5a3a22',
  /** The baker's round badge: its gradient and letter. */
  badgeLight: '#ffd27a',
  badgeDark: '#e08a3a',
  badgeInk: '#3a2606',
  /** The Close button under the ticket, and its pressed-in edge. */
  close: bakery.brown,
  closeEdge: '#3E2A1E',
  /** Words on the Close button. */
  closeText: '#ffffff',
} as const;
