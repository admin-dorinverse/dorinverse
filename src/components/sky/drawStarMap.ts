// Draws the Star Map's picture when it opens: a dusting of stars, dotted routes from the bakery to each
// constellation, the part of the sky you were looking at, and the rocket.

import { BlurStyle, PaintStyle, Skia, type SkCanvas } from '@shopify/react-native-skia';
import type { Constellation } from '@/types/constellation';
import { seededRandom } from './skyMath';
import type { MapProjection } from './starMapLayout';

/** Where the camera and rocket were when the map opened. */
export type MapSnapshot = { cameraX: number; cameraY: number; screenW: number; screenH: number; rocketX: number; rocketY: number; rocketTurn: number };

/** Draws the Star Map's picture for a `width` by `height` map. */
export function drawStarMap(
  canvas: SkCanvas,
  width: number,
  height: number,
  map: MapProjection,
  snap: MapSnapshot,
  constellations: readonly Constellation[],
): void {
  const random = seededRandom(99);
  const star = Skia.Paint();
  star.setColor(Skia.Color('#ffffff'));
  for (let i = 0; i < 160; i++) {
    star.setAlphaf(0.2 + random() * 0.6);
    const x = random() * width;
    const y = random() * height;
    const z = random() * 1.4 + 0.4;
    canvas.drawRect(Skia.XYWHRect(x, y, z, z), star);
  }

  const routes = Skia.PathBuilder.Make();
  for (const c of constellations) {
    routes.moveTo(map.x(0), map.y(0));
    routes.lineTo(map.x(c.x), map.y(c.y));
  }
  const dashed = Skia.Paint();
  dashed.setStyle(PaintStyle.Stroke);
  dashed.setColor(Skia.Color('rgba(255,255,255,0.18)'));
  dashed.setPathEffect(Skia.PathEffect.MakeDash([3, 5], 0));
  canvas.drawPath(routes.detach(), dashed);

  const view = Skia.Paint();
  view.setStyle(PaintStyle.Stroke);
  view.setColor(Skia.Color('rgba(255,255,255,0.6)'));
  view.setStrokeWidth(1.2);
  canvas.drawRect(
    Skia.XYWHRect(map.x(snap.cameraX - snap.screenW / 2), map.y(snap.cameraY - snap.screenH / 2), snap.screenW * map.scale, snap.screenH * map.scale),
    view,
  );

  canvas.save();
  canvas.translate(map.x(snap.rocketX), map.y(snap.rocketY));
  canvas.rotate(snap.rocketTurn, 0, 0);
  const arrowBuilder = Skia.PathBuilder.Make();
  arrowBuilder.moveTo(0, -7);
  arrowBuilder.lineTo(5, 6);
  arrowBuilder.lineTo(-5, 6);
  arrowBuilder.close();
  const arrow = arrowBuilder.detach();
  const glow = Skia.Paint();
  glow.setColor(Skia.Color('#ffd25a'));
  glow.setMaskFilter(Skia.MaskFilter.MakeBlur(BlurStyle.Normal, 4, false));
  canvas.drawPath(arrow, glow);
  const white = Skia.Paint();
  white.setColor(Skia.Color('#ffffff'));
  canvas.drawPath(arrow, white);
  canvas.restore();
}
