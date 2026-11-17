// Where Papa Dorin's bakery planet sits in the sky, how it floats and rocks, and how cookie boxes fly out of
// its chimney. The planet is a view the phone slides around (see BakeryPlanet.tsx), so nothing here draws.

import { cubicBezier, lerp } from './skyMath';
import type { ChimneyBox } from './skyState';

/** Drawn width of the planet picture. */
export const PLANET_WIDTH = 250;

/** How far above the sky center the planet picture's top edge sits. */
export const PLANET_TOP = -190;

/** Drawn width of a chimney box. */
export const BOX_WIDTH = 28;

/** The point the planet rocks around, as fractions of its picture: the center, 72% of the way down. */
export const ROCK_ORIGIN = '50% 72%';

/** The warm halo behind the planet: its center as fractions of the planet picture, and its radius. */
export const HALO = { x: 0.5, y: 0.62, radius: 210 } as const;

/** Where the chimney is, as fractions of the planet picture. Boxes start here. */
export const CHIMNEY = { x: 0.74, y: -0.01 } as const;

/** How far up the planet floats at this moment, in points. It floats up 14 points and back every 6 seconds. */
export function planetFloat(seconds: number, reduceMotion: boolean): number {
  'worklet';
  return reduceMotion ? 0 : -7 + 7 * Math.cos((2 * Math.PI * seconds) / 6);
}

/** How far the planet is rocked at this moment, in degrees. It rocks 1.6° each way, over 14 seconds. */
export function planetRock(seconds: number, reduceMotion: boolean): number {
  'worklet';
  return reduceMotion ? 0 : -1.6 * Math.cos((2 * Math.PI * seconds) / 14);
}

/** Where a chimney box is at `t` (0 to 1) of its trip: offset from the chimney, size, spin and how visible it is. */
export function boxPose(b: ChimneyBox, t: number) {
  'worklet';
  const e = cubicBezier(0.25, 0.6, 0.4, 1, t);
  // The trip's four steps: [when, x, y, size, spin, opacity].
  const keys = [
    [0, 0, 8, 0.3, 0, 0],
    [0.15, 0, -14, 0.85, 10, 1],
    [0.7, b.dx * 0.6, b.dy * 0.65, 1, b.spin * 0.6, 1],
    [1, b.dx, b.dy, 1.05, b.spin, 0],
  ];
  let k = 0;
  while (k < keys.length - 2 && e > keys[k + 1][0]) k++;
  const a = keys[k];
  const z = keys[k + 1];
  const f = (e - a[0]) / (z[0] - a[0]);
  return { x: lerp(a[1], z[1], f), y: lerp(a[2], z[2], f), scale: lerp(a[3], z[3], f), spin: lerp(a[4], z[4], f), opacity: lerp(a[5], z[5], f) };
}

/** True when a tap at a sky spot lands on the bakery planet. */
export function hitsBakery(wx: number, wy: number): boolean {
  'worklet';
  return Math.abs(wx) < 120 && wy > -200 && wy < 210;
}
