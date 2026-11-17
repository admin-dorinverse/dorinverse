// Draws one background star. Each star is a small cross that shrinks into a round dot, rests, then grows back
// into a cross, on its own 7-second rhythm. This is the Constellations "dvCross" star, point for point.

import type { SkPathBuilder } from '@shopify/react-native-skia';
import { smoothStep } from './skyMath';

/** Seconds for one full cross-to-dot-and-back cycle. */
const CYCLE_SECONDS = 7;

/**
 * Adds one star to `path` at (x, y). `size` is the cross height, `phase` (0 to 1) puts each star out of step,
 * and `nowSeconds` is the current time.
 */
export function addStarCross(path: SkPathBuilder, x: number, y: number, size: number, phase: number, nowSeconds: number): void {
  'worklet';
  const u = ((((nowSeconds / CYCLE_SECONDS + phase) % 1) + 1) % 1);
  const p = u < 0.4 ? 0 : u < 0.55 ? smoothStep((u - 0.4) / 0.15) : u < 0.8 ? 1 : u < 0.95 ? 1 - smoothStep((u - 0.8) / 0.15) : 0;
  const dotRadius = Math.max(1.1, size * 0.22) * smoothStep(Math.min(1, p * 1.5));
  const k = 1 - p;
  if (k > 0.06) {
    const h = size * k;
    const t = Math.max(0.9 * Math.min(1, k * 1.4), h * 0.2);
    const w = h * 0.64;
    const a = -h / 2;
    const b = a + h * 0.27;
    path.moveTo(x - t / 2, y + a);
    path.lineTo(x + t / 2, y + a);
    path.lineTo(x + t / 2, y + b);
    path.lineTo(x + w / 2, y + b);
    path.lineTo(x + w / 2, y + b + t);
    path.lineTo(x + t / 2, y + b + t);
    path.lineTo(x + t / 2, y - a);
    path.lineTo(x - t / 2, y - a);
    path.lineTo(x - t / 2, y + b + t);
    path.lineTo(x - w / 2, y + b + t);
    path.lineTo(x - w / 2, y + b);
    path.lineTo(x - t / 2, y + b);
    path.close();
  }
  if (dotRadius > 0.05) path.addCircle(x, y, dotRadius);
}
