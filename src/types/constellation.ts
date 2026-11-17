// The shape of a constellation in the sky: where it sits, its color, and the dots and lines that draw it.

/** A point as [x, y], measured from the constellation's center before scaling. */
export type ShapePoint = readonly [number, number];

/** A line between two points, given as their two positions in the point list. */
export type ShapeSegment = readonly [number, number];

/** The dots and lines that draw one constellation, like a cookie-cutter outline. */
export type ConstellationShape = {
  /** Every star dot in the drawing. */
  points: readonly ShapePoint[];
  /** The lines that join the dots, in the order they draw in. */
  segments: readonly ShapeSegment[];
};

/** One constellation in the shared sky. Each one stands for a kind of Bible passage. */
export type Constellation = {
  /** Short id, like "letters". */
  id: string;
  /** Name shown under it, like "Letters". */
  name: string;
  /** Its glow color. It also tints every screen opened from it. */
  color: string;
  /** Its center in the sky, left to right. */
  x: number;
  /** Its center in the sky, top to bottom. */
  y: number;
  /** Which dot is drawn extra big, as a position in the point list. */
  bigStar: number;
  /** The dots and lines that draw it. */
  shape: ConstellationShape;
};
