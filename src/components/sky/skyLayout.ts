// Fixed numbers that lay out the sky: its edges, the star layers, the dust and the nebula clouds. Copied from Constellations.

import { sky } from '@/theme/colors';
import { lerp, seededRandom } from './skyMath';

/** How far the sky can be dragged. Past these edges it springs back. */
export const SKY_BOUNDS = { left: -3100, right: 3100, top: -2900, bottom: 2750 } as const;

/** Where the camera rests on the bakery planet (slightly below its center). */
export const HOME_Y = 70;

/** How much bigger constellation outlines are drawn than their stored shapes. */
export const CONSTELLATION_SCALE = 1.55;

/** One repeating layer of cross stars. Nearer layers move more when the sky is dragged. */
export type StarLayer = {
  /** Width of one repeating tile. */
  width: number;
  /** Height of one repeating tile. */
  height: number;
  /** Seconds for the layer's slow drift to repeat. */
  driftSeconds: number;
  /** Seconds for one twinkle. */
  twinkleSeconds: number;
  /** Twinkle head start in seconds, so layers twinkle out of step. */
  twinkleOffset: number;
  /** How much the layer moves with the camera (parallax). */
  parallax: number;
  /** The two stars in each tile: x, y, size and color. */
  stars: readonly (readonly [number, number, number, string])[];
};

/** The three star layers, far to near. */
export const STAR_LAYERS: readonly StarLayer[] = [
  { width: 180, height: 170, driftSeconds: 100, twinkleSeconds: 6, twinkleOffset: 0, parallax: 0.35,
    stars: [[22, 34, 8, sky.starGold], [120, 90, 6.5, sky.starWhite]] },
  { width: 180, height: 170, driftSeconds: 72, twinkleSeconds: 8.5, twinkleOffset: 3, parallax: 0.55,
    stars: [[70, 150, 9.5, sky.starGold], [160, 20, 6.5, sky.starLilac]] },
  { width: 240, height: 230, driftSeconds: 140, twinkleSeconds: 11, twinkleOffset: 5, parallax: 0.8,
    stars: [[40, 110, 7.5, sky.starWhite], [190, 200, 6, sky.starBlue]] },
];

/** One faint dust dot inside the repeating dust tile. */
export type DustDot = {
  /** Position across the tile. */
  x: number;
  /** Position down the tile. */
  y: number;
  /** Dot radius. */
  radius: number;
  /** Dot color. */
  color: string;
  /** Dot opacity. */
  alpha: number;
};

/** Size of the repeating dust tile. */
export const DUST_TILE = 900;

/** How much the dust moves with the camera. */
export const DUST_PARALLAX = 0.18;

/** The 140 faint dust dots, always placed the same way. */
export const DUST_DOTS: readonly DustDot[] = (() => {
  const random = seededRandom(77);
  const colors = [sky.starGold, sky.starWhite, sky.starLilac, sky.starWhite];
  return Array.from({ length: 140 }, () => ({
    x: random() * DUST_TILE,
    y: random() * DUST_TILE,
    radius: 0.6 + random() * 1.1,
    color: colors[Math.floor(random() * colors.length)],
    alpha: 0.35 + random() * 0.5,
  }));
})();

/** One soft nebula cloud far behind the stars. */
export type NebulaCloud = {
  /** Sky position across. */
  x: number;
  /** Sky position down. */
  y: number;
  /** Cloud radius before the far-layer shrink. */
  radius: number;
  /** Cloud color. */
  color: string;
  /** Cloud opacity. */
  alpha: number;
};

/** How much the nebula moves with the camera. */
export const NEBULA_PARALLAX = 0.15;

/** The 14 nebula clouds, spread across the whole sky. */
export const NEBULA_CLOUDS: readonly NebulaCloud[] = (() => {
  const random = seededRandom(4242);
  return Array.from({ length: 14 }, (_, i) => {
    const tint = sky.nebula[i % 3];
    return {
      x: lerp(-3600, 3600, random()),
      y: lerp(-3300, 3200, random()),
      radius: 700 + random() * 900,
      color: tint.color,
      alpha: tint.alpha,
    };
  });
})();
