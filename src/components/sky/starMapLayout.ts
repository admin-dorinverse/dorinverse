// Works out where things sit on the Star Map. The map fits every constellation, the bakery and the Collections
// area into the square,
// leaving room around the edges for the pins' names.

import type { Constellation } from '@/types/constellation';
import { COLLECTIONS_ZONE } from './collectionsZone';

/** Turns sky positions into Star Map positions for a map of the given size. */
export type MapProjection = {
  /** Map position across for a sky position across. */
  x: (skyX: number) => number;
  /** Map position down for a sky position down. */
  y: (skyY: number) => number;
  /** How many map points one sky point takes. */
  scale: number;
};

/** Makes the projection for a `width` by `height` map. */
export function makeMapProjection(width: number, height: number, constellations: readonly Constellation[]): MapProjection {
  const xs = constellations.map((c) => c.x).concat(0, COLLECTIONS_ZONE.x);
  const ys = constellations.map((c) => c.y).concat(0, COLLECTIONS_ZONE.y);
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const y0 = Math.min(...ys);
  const y1 = Math.max(...ys);
  const scale = Math.min((width - 84) / (x1 - x0), (height - 96) / (y1 - y0));
  return {
    x: (skyX) => width / 2 + (skyX - (x0 + x1) / 2) * scale,
    y: (skyY) => height / 2 - 6 + (skyY - (y0 + y1) / 2) * scale,
    scale,
  };
}
