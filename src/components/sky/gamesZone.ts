// Where the Games area sits in the sky (lower right) and where its two cards are: Cookie Box Trivia and the verse
// games. The cards never move, so their boxes are worked out once here.

import type { CollectionHue } from '@/theme/colors';
import type { CardBox } from './collectionsZone';

/** The Games area's center in the sky. */
export const GAMES_ZONE = { x: 1900, y: 1650 } as const;

/** One game card's size, the space between the two, and the space inside the dotted frame. */
export const GAME_CARD = { w: 170, h: 214 } as const;
const GAP = 14;
export const GAMES_PAD = 22;

/** A game in the sky. */
export type SkyGame = {
  /** Which page the card opens. */
  game: 'trivia' | 'verses';
  /** The card's title. */
  title: string;
  /** One short line under the title. */
  note: string;
  /** The card's accent color. */
  hue: CollectionHue;
};

/** The two games, left to right. */
export const SKY_GAMES: readonly SkyGame[] = [
  { game: 'trivia', title: 'Cookie Box Trivia', note: 'Questions from every lesson you’ve finished.', hue: 'berry' },
  { game: 'verses', title: 'Verse Games', note: 'Build verses word by word, alone or with friends.', hue: 'amber' },
];

/** Each game card's box in the sky, left to right. */
export const GAME_BOXES: readonly CardBox[] = SKY_GAMES.map((_, i) => ({
  x: GAMES_ZONE.x - GAME_CARD.w - GAP / 2 + i * (GAME_CARD.w + GAP),
  y: GAMES_ZONE.y - GAME_CARD.h / 2,
  w: GAME_CARD.w,
  h: GAME_CARD.h,
}));

/** The dotted frame around both cards. */
export const GAMES_FRAME: CardBox = {
  x: GAME_BOXES[0].x - GAMES_PAD,
  y: GAME_BOXES[0].y - GAMES_PAD,
  w: GAME_CARD.w * 2 + GAP + GAMES_PAD * 2,
  h: GAME_CARD.h + GAMES_PAD * 2,
};

/** True when the Games area is near enough to the screen to show. */
export function gamesOnScreen(cameraX: number, cameraY: number, screenW: number, screenH: number): boolean {
  'worklet';
  return Math.abs(cameraX - GAMES_ZONE.x) < GAMES_FRAME.w / 2 + screenW / 2 + 60 && Math.abs(cameraY - GAMES_ZONE.y) < GAMES_FRAME.h / 2 + screenH / 2 + 120;
}
