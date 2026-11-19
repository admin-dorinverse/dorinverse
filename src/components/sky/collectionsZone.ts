// Where the Collections area sits in the sky and how big its cards are drawn there.
// The cards keep the old Collections page's order, shrunk together as one group.

import type { CollectionKind } from '@/types/collection';
import type { CollectionHue } from '@/theme/colors';

/** The Collections area: its center in the sky, and about how far its cards reach each way. */
export const COLLECTIONS_ZONE = { x: -1550, y: 2080, halfW: 170, halfH: 480 } as const;

/** How big the cards show in the sky, compared with their size on a page. */
export const CARD_SCALE = 0.62;

/** One collection as it shows in the sky. */
export type SkyCollection = {
  /** Which list the card opens. */
  kind: CollectionKind;
  /** The card's title. */
  title: string;
  /** One short line under the title. */
  note: string;
  /** The card's accent color. */
  hue: CollectionHue;
  /** Wide (a full card) or narrow (half as wide, beside its partner). */
  layout: 'wide' | 'narrow';
};

/** The six collections, top to bottom. The two narrow ones sit side by side at the end. */
export const SKY_COLLECTIONS: readonly SkyCollection[] = [
  { kind: 'verses', title: 'Bible verses', note: 'The Bible verses you have brought to life.', hue: 'amber', layout: 'wide' },
  { kind: 'characters', title: 'Characters', note: 'The people you have met.', hue: 'berry', layout: 'wide' },
  { kind: 'places', title: 'Places', note: 'Where your latest lessons have taken you.', hue: 'sage', layout: 'wide' },
  { kind: 'prophecy', title: 'Prophecy and Fulfillment of Jesus', note: 'Prophecy and fulfillment of Jesus.', hue: 'blue', layout: 'wide' },
  { kind: 'instructions', title: 'Instructions for Today', note: 'What Scripture tells you to do.', hue: 'cocoa', layout: 'narrow' },
  { kind: 'prayers', title: 'Prayers', note: 'Bible prayers to pray too.', hue: 'lav', layout: 'narrow' },
];

/** A card's box in the sky: its top-left corner and its size. */
export type CardBox = { x: number; y: number; w: number; h: number };

/** True when the Collections area is near enough to the screen that its cards should show and animate. */
export function collectionsOnScreen(cameraX: number, cameraY: number, screenW: number, screenH: number): boolean {
  'worklet';
  const z = COLLECTIONS_ZONE;
  return Math.abs(cameraX - z.x) < z.halfW + screenW / 2 + 100 && Math.abs(cameraY - z.y) < z.halfH + screenH / 2 + 160;
}

/** Returns the index of the card at a sky spot, or -1. `boxes` holds each card's measured box. */
export function collectionCardAt(boxes: readonly CardBox[], wx: number, wy: number): number {
  'worklet';
  for (let i = boxes.length - 1; i >= 0; i--) {
    const b = boxes[i];
    if (b && wx >= b.x && wx <= b.x + b.w && wy >= b.y && wy <= b.y + b.h) return i;
  }
  return -1;
}
