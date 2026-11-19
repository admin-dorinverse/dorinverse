// Where the Collections area sits in the sky, and where each collection's card lands inside it.
// The cards get new random spots each time the app starts, never overlapping.

import type { CollectionKind } from '@/types/collection';
import type { CollectionHue } from '@/theme/colors';

/** The Collections area: its center in the sky, and how far it reaches each way. */
export const COLLECTIONS_ZONE = { x: -1550, y: 2080, halfW: 820, halfH: 760 } as const;

/** Where the area's name sits, above its top edge. */
export const COLLECTIONS_TITLE_Y = COLLECTIONS_ZONE.y - COLLECTIONS_ZONE.halfH - 40;

/** Space kept clear between two cards. */
const CARD_GAP = 60;

/** Guessed card heights, used only to keep cards apart. Real heights are measured once they show. */
const WIDE_HEIGHT = 300;
const NARROW_HEIGHT = 230;

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
  /** Wide (a full card) or narrow (half as wide). */
  layout: 'wide' | 'narrow';
};

/** The six collections, in the order their cards come in. */
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

/**
 * Picks a random spot for every card inside the area, so no two cards touch.
 * `wideW` is a wide card's width; a narrow card is half that. Runs once when the sky starts.
 */
export function placeCollectionCards(wideW: number): CardBox[] {
  const narrowW = (wideW - 12) / 2;
  const z = COLLECTIONS_ZONE;
  const boxes: CardBox[] = [];
  for (const item of SKY_COLLECTIONS) {
    const w = item.layout === 'wide' ? wideW : narrowW;
    const h = item.layout === 'wide' ? WIDE_HEIGHT : NARROW_HEIGHT;
    let best: CardBox | null = null;
    // Try random spots until one is clear. If none is, keep the one that overlaps least.
    let bestOverlap = Infinity;
    for (let tries = 0; tries < 400 && bestOverlap > 0; tries++) {
      const box = { x: z.x - z.halfW + Math.random() * (z.halfW * 2 - w), y: z.y - z.halfH + Math.random() * (z.halfH * 2 - h), w, h };
      const overlap = boxes.reduce((sum, b) => sum + overlapArea(box, b), 0);
      if (overlap < bestOverlap) {
        best = box;
        bestOverlap = overlap;
      }
    }
    boxes.push(best as CardBox);
  }
  return boxes;
}

/** How much two cards overlap, counting the gap kept between them. 0 when they are apart. */
function overlapArea(a: CardBox, b: CardBox): number {
  const w = Math.min(a.x + a.w, b.x + b.w) + CARD_GAP - Math.max(a.x, b.x);
  const h = Math.min(a.y + a.h, b.y + b.h) + CARD_GAP - Math.max(a.y, b.y);
  return w > 0 && h > 0 ? w * h : 0;
}

/** True when the Collections area is near enough to the screen that its cards should animate. */
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
    if (wx >= b.x && wx <= b.x + b.w && wy >= b.y && wy <= b.y + b.h) return i;
  }
  return -1;
}
