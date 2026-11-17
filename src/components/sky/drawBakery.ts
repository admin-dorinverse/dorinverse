// Draws Papa Dorin's bakery planet at the center of the sky: a warm halo, the planet floating and gently rocking,
// and cookie boxes puffing out of its chimney and drifting off into space.

import { FilterMode, MipmapMode, Skia, TileMode, type SkCanvas, type SkImage } from '@shopify/react-native-skia';
import type { PlanetSprite } from './planetSprite';
import { cubicBezier, lerp } from './skyMath';
import type { ChimneyBox, SkyState } from './skyState';

/** Drawn width of the planet picture. */
export const PLANET_WIDTH = 250;

/** How far above the sky center the planet picture's top edge sits. */
const PLANET_TOP = -190;

/** Drawn width of a chimney box. */
const BOX_WIDTH = 28;

/** The four steps of a chimney box's flight, as fractions of its trip: [when, x, y, size, spin, opacity]. */
function boxPose(b: ChimneyBox, t: number) {
  'worklet';
  const e = cubicBezier(0.25, 0.6, 0.4, 1, t);
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

/** Draws the bakery planet and its chimney boxes. `alpha` fades it on other tabs. */
export function drawBakery(
  canvas: SkCanvas,
  s: SkyState,
  now: number,
  planet: PlanetSprite | null,
  boxes: readonly (SkImage | null)[],
  alpha: number,
): void {
  'worklet';
  if (alpha <= 0 || !planet) return;
  const ox = -s.camera.x + s.width / 2;
  const oy = -s.camera.y + s.height / 2;
  const planetHeight = planet.height + planet.top * 2;
  const left = ox - PLANET_WIDTH / 2;
  const top = oy + PLANET_TOP;
  if (left > s.width + 300 || left + PLANET_WIDTH < -300 || top > s.height + 300 || top + planetHeight < -300) return;

  // Warm halo behind the planet.
  const haloX = ox;
  const haloY = top + planetHeight * 0.62;
  const halo = Skia.Paint();
  halo.setAlphaf(alpha);
  halo.setShader(Skia.Shader.MakeRadialGradient({ x: haloX, y: haloY }, 210,
    [Skia.Color('rgba(255,200,120,0.16)'), Skia.Color('rgba(255,200,120,0)')], [0, 0.62], TileMode.Clamp));
  canvas.drawCircle(haloX, haloY, 210, halo);

  // The planet floats up and down every 6 seconds and rocks side to side every 14.
  const seconds = now / 1000;
  const float = s.reduceMotion ? 0 : -7 + 7 * Math.cos((2 * Math.PI * seconds) / 6);
  const rock = s.reduceMotion ? 0 : -1.6 * Math.cos((2 * Math.PI * seconds) / 14);
  canvas.save();
  canvas.translate(0, float);
  canvas.rotate(rock, ox, top + planetHeight * 0.72);

  // Cookie boxes rise out of the chimney, near the planet's top right. They are drawn before the planet
  // so they start hidden behind the chimney and come up out of it.
  const chimneyX = left + PLANET_WIDTH * 0.74;
  const chimneyTop = top - planetHeight * 0.01;
  const boxPaint = Skia.Paint();
  for (const b of s.chimneyBoxes) {
    const img = boxes[b.image];
    if (!img) continue;
    const pose = boxPose(b, Math.min(1, (now - b.startedAt) / b.duration));
    const h = (BOX_WIDTH * img.height()) / img.width();
    boxPaint.setAlphaf(pose.opacity * alpha);
    canvas.save();
    canvas.translate(chimneyX + pose.x, chimneyTop + h / 2 + pose.y);
    canvas.rotate(pose.spin, 0, 0);
    canvas.scale(pose.scale, pose.scale);
    canvas.drawImageRectOptions(img, Skia.XYWHRect(0, 0, img.width(), img.height()), Skia.XYWHRect(-BOX_WIDTH / 2, -h / 2, BOX_WIDTH, h), FilterMode.Linear, MipmapMode.Linear, boxPaint);
    canvas.restore();
  }

  // The planet and its glow were drawn once ahead of time (see planetSprite.ts), so here we only place them.
  const picture = Skia.Paint();
  picture.setAlphaf(alpha);
  const img = planet.image;
  canvas.drawImageRectOptions(img, Skia.XYWHRect(0, 0, img.width(), img.height()), Skia.XYWHRect(left + planet.left, top + planet.top, planet.width, planet.height), FilterMode.Linear, MipmapMode.None, picture);
  canvas.restore();
}

/** True when a tap at a sky spot lands on the bakery planet. */
export function hitsBakery(wx: number, wy: number): boolean {
  'worklet';
  return Math.abs(wx) < 120 && wy > -200 && wy < 210;
}
