// The six cookie-cutter outlines the constellations are drawn with, copied point for point from the Constellations design.

import type { ConstellationShape, ShapePoint, ShapeSegment } from '@/types/constellation';

/** One outline piece: its points, and whether the last point joins back to the first. */
type Outline = readonly [readonly ShapePoint[], boolean];

/** Joins outline pieces and loose dots into one shape, linking each piece's points in order. */
function buildShape(outlines: readonly Outline[], looseDots: readonly ShapePoint[] = []): ConstellationShape {
  const points: ShapePoint[] = [];
  const segments: ShapeSegment[] = [];
  for (const [list, closed] of outlines) {
    const start = points.length;
    points.push(...list);
    for (let i = 0; i < list.length - 1; i++) segments.push([start + i, start + i + 1]);
    if (closed) segments.push([start + list.length - 1, start]);
  }
  points.push(...looseDots);
  return { points, segments };
}

/** Makes `count` points around a circle, letting `place` turn each angle into a point. */
function around(count: number, place: (angle: number, index: number) => ShapePoint): ShapePoint[] {
  return Array.from({ length: count }, (_, i) => place((i / count) * Math.PI * 2, i));
}

/** A dove in flight, for Letters. */
const dove = buildShape([
  [[[104, -30], [80, -52], [58, -36], [22, -116], [-4, -40], [-74, -34], [-86, 8], [-22, 24], [52, 12], [86, -8]], true],
  [[[42, -34], [-26, -104], [-4, -40]], false],
  [[[104, -30], [130, -6]], false],
  [[[118, -18], [134, -34]], false],
]);

/** A gingerbread person, for Stories. */
const gingerbread = buildShape(
  [[[[0, -96], [22, -86], [27, -64], [14, -48], [58, -44], [64, -26], [24, -20], [26, 22], [46, 82], [26, 92], [0, 44],
    [-26, 92], [-46, 82], [-26, 22], [-24, -20], [-64, -26], [-58, -44], [-14, -48], [-27, -64], [-22, -86]], true]],
  [[0, -24], [0, 0]],
);

/** A bell, for Sermons. */
const bell = buildShape([
  [[[0, -80], [26, -74], [36, -40], [44, 16], [72, 48], [-72, 48], [-44, 16], [-36, -40], [-26, -74]], true],
  [[[0, -80], [0, -98]], false],
  [[[0, 48], [0, 74]], false],
]);

/** A five-petal flower with a round middle, for Parables. */
const flower = (() => {
  const petals: ShapePoint[] = [];
  for (let k = 0; k < 5; k++) {
    const a = -Math.PI / 2 + (k * Math.PI * 2) / 5;
    const d = Math.PI / 5;
    petals.push(
      [Math.cos(a - d) * 34, Math.sin(a - d) * 34],
      [Math.cos(a - d * 0.55) * 78, Math.sin(a - d * 0.55) * 78],
      [Math.cos(a) * 92, Math.sin(a) * 92],
      [Math.cos(a + d * 0.55) * 78, Math.sin(a + d * 0.55) * 78],
    );
  }
  const middle = around(6, (a) => [Math.cos(a) * 16, Math.sin(a) * 16]);
  return buildShape([[petals, true], [middle, true]]);
})();

/** A five-point star, for Prophecies. */
const star = buildShape([
  [around(10, (a, i) => {
    const r = i % 2 ? 40 : 96;
    const b = -Math.PI / 2 + a;
    return [Math.cos(b) * r, Math.sin(b) * r];
  }), true],
]);

/** A heart, for Poems & Wisdom. */
const heart = buildShape([
  [around(18, (t) => {
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
    return [x * 5.6, y * 5.6 - 6];
  }), true],
]);

/** Every outline by name. */
export const constellationShapes = { dove, gingerbread, bell, flower, star, heart } as const;
