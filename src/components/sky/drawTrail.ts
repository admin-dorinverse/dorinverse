// Draws the glowing trail of particles the rocket leaves behind. The rocket itself is a view (see RocketView.tsx).

import { Skia, type SkCanvas } from '@shopify/react-native-skia';
import type { SkyState } from './skyState';

/** Draws the trail particles. `alpha` fades them on other tabs. */
export function drawTrail(canvas: SkCanvas, s: SkyState, alpha: number): void {
  'worklet';
  if (alpha <= 0 || s.trail.length === 0) return;
  const paint = Skia.Paint();
  const ox = -s.camera.x + s.width / 2;
  const oy = -s.camera.y + s.height / 2;
  for (const p of s.trail) {
    const a = p.life / p.maxLife;
    paint.setColor(Skia.Color(p.color));
    paint.setAlphaf(a * 0.9 * alpha);
    canvas.drawCircle(p.x + ox, p.y + oy, p.radius * (1.4 - a * 0.4), paint);
  }
}
