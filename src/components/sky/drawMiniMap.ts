// Draws the small round map inside the map button: constellations, the bakery, the Collections area, the player's things,
// the part of the sky you are looking at, and the rocket.

import { BlurStyle, PaintStyle, Skia, TileMode, type SkCanvas } from '@shopify/react-native-skia';
import type { UniverseSpot } from '@/data/sample/universe';
import { bakery, sky, starMap } from '@/theme/colors';
import type { Constellation } from '@/types/constellation';
import { COLLECTIONS_ZONE } from './collectionsZone';
import { SKY_BOUNDS } from './skyLayout';
import type { SkyState } from './skyState';

/** Draws the mini map into a square of `size` points. */
export function drawMiniMap(
  canvas: SkCanvas,
  s: SkyState,
  size: number,
  constellations: readonly Constellation[],
  spots: readonly UniverseSpot[],
): void {
  'worklet';
  const half = size / 2;
  const bg = Skia.Paint();
  bg.setShader(Skia.Shader.MakeRadialGradient({ x: half, y: half }, half, [Skia.Color(starMap.miniCenter), Skia.Color(starMap.miniEdge)], null, TileMode.Clamp));
  canvas.drawRect(Skia.XYWHRect(0, 0, size, size), bg);

  const sc = (size * 0.84) / (SKY_BOUNDS.right - SKY_BOUNDS.left + 600);
  const mx = (wx: number) => half + wx * sc;
  const my = (wy: number) => half + (wy + 75) * sc;

  const ring = Skia.Paint();
  ring.setStyle(PaintStyle.Stroke);
  ring.setColor(Skia.Color('rgba(255,255,255,0.12)'));
  ring.setStrokeWidth(1);
  canvas.drawCircle(half, half, size * 0.22, ring);
  canvas.drawCircle(half, half, size * 0.36, ring);

  const white = Skia.Paint();
  white.setColor(Skia.Color('#ffffff'));
  for (const c of constellations) {
    const x = mx(c.x);
    const y = my(c.y);
    const glow = Skia.Paint();
    glow.setAlphaf(0.55);
    glow.setShader(Skia.Shader.MakeRadialGradient({ x, y }, 7,
      [Skia.Color('#ffffff'), Skia.Color('#ffffff'), Skia.Color(c.color), Skia.Color('transparent')], [0, 0.12, 0.28, 1], TileMode.Clamp));
    canvas.drawCircle(x, y, 7, glow);
    canvas.drawCircle(x, y, 1.6, white);
  }

  const home = Skia.Paint();
  home.setColor(Skia.Color(bakery.planetGlow));
  canvas.drawCircle(mx(0), my(0), 2.4, home);

  // The Collections area: a small gold square.
  const shelf = Skia.Paint();
  shelf.setColor(Skia.Color(sky.collectionsGlow));
  canvas.drawRect(Skia.XYWHRect(mx(COLLECTIONS_ZONE.x) - 2.2, my(COLLECTIONS_ZONE.y) - 2.2, 4.4, 4.4), shelf);

  for (const spot of spots) {
    const dot = Skia.Paint();
    dot.setColor(Skia.Color(spot.dot));
    dot.setMaskFilter(Skia.MaskFilter.MakeBlur(BlurStyle.Solid, 2, true));
    canvas.drawCircle(mx(spot.x), my(spot.y), 2, dot);
  }

  const view = Skia.Paint();
  view.setStyle(PaintStyle.Stroke);
  view.setColor(Skia.Color('rgba(255,255,255,0.55)'));
  view.setStrokeWidth(1);
  canvas.drawRect(Skia.XYWHRect(mx(s.camera.x - s.width / 2), my(s.camera.y - s.height / 2), s.width * sc, s.height * sc), view);

  canvas.save();
  canvas.translate(mx(s.rocket.x), my(s.rocket.y));
  canvas.rotate(s.rocket.rotation, 0, 0);
  const arrow = Skia.PathBuilder.Make();
  arrow.moveTo(0, -4);
  arrow.lineTo(3, 3);
  arrow.lineTo(-3, 3);
  arrow.close();
  canvas.drawPath(arrow.detach(), white);
  canvas.restore();
}
