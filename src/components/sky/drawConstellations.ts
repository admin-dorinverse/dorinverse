// Draws the constellations for one frame: glowing lines that draw in segment by segment, twinkling star dots,
// and each constellation's glowing name underneath.

import { BlurStyle, PaintStyle, StrokeCap, Skia, TileMode, type SkCanvas, type SkFont } from '@shopify/react-native-skia';
import type { Constellation } from '@/types/constellation';
import { CONSTELLATION_SCALE } from './skyLayout';
import { clamp, lerp } from './skyMath';
import type { SkyState } from './skyState';
import { constellationOnScreen } from './stepScenery';

/** Draws one glowing star dot: a soft colored halo with a small white center. */
function drawGlowDot(canvas: SkCanvas, x: number, y: number, radius: number, color: string): void {
  'worklet';
  const halo = Skia.Paint();
  halo.setAlphaf(0.95);
  halo.setShader(
    Skia.Shader.MakeRadialGradient({ x, y }, radius,
      [Skia.Color('#ffffff'), Skia.Color('#ffffff'), Skia.Color(color), Skia.Color('transparent')], [0, 0.12, 0.28, 1], TileMode.Clamp),
  );
  canvas.drawCircle(x, y, radius, halo);
}

/** Draws a constellation's name centered under it, with a colored glow like the design's text shadow. */
function drawLabel(canvas: SkCanvas, c: Constellation, x: number, top: number, alpha: number, font: SkFont, width: number): void {
  'worklet';
  if (alpha <= 0) return;
  const baseline = top - font.getMetrics().ascent;
  const left = x - width / 2;
  const glow = Skia.Paint();
  glow.setColor(Skia.Color(c.color));
  glow.setAlphaf(alpha);
  glow.setMaskFilter(Skia.MaskFilter.MakeBlur(BlurStyle.Normal, 13, true));
  canvas.drawText(c.name, left, baseline, glow, font);
  glow.setMaskFilter(Skia.MaskFilter.MakeBlur(BlurStyle.Normal, 6, true));
  canvas.drawText(c.name, left, baseline, glow, font);
  const rim = Skia.Paint();
  rim.setColor(Skia.Color('#ffffff'));
  rim.setAlphaf(alpha);
  rim.setMaskFilter(Skia.MaskFilter.MakeBlur(BlurStyle.Normal, 1, true));
  canvas.drawText(c.name, left, baseline, rim, font);
  const text = Skia.Paint();
  text.setColor(Skia.Color('#ffffff'));
  text.setAlphaf(alpha);
  canvas.drawText(c.name, left, baseline, text, font);
}

/** Draws every constellation that is near the screen. Names are drawn too once a font is ready. */
export function drawConstellations(
  canvas: SkCanvas,
  s: SkyState,
  now: number,
  constellations: readonly Constellation[],
  font: SkFont | null,
  labelWidths: readonly number[],
): void {
  'worklet';
  if (!s.atHome) return;
  const { width: W, height: H, camera: cam } = s;
  for (let i = 0; i < constellations.length; i++) {
    const c = constellations[i];
    const progress = s.drawnIn[i];
    if (!constellationOnScreen(s, c) || progress <= 0) continue;
    const sx = c.x - cam.x + W / 2;
    const sy = c.y - cam.y + H / 2;
    const { points, segments } = c.shape;
    const P = points.map((p) => [sx + p[0] * CONSTELLATION_SCALE, sy + p[1] * CONSTELLATION_SCALE]);
    const shown = progress * segments.length;

    // Lines: a wide faint glow, then a thin bright line on top.
    const builder = Skia.PathBuilder.Make();
    for (let k = 0; k < segments.length; k++) {
      if (k > shown) break;
      const [a, b] = segments[k];
      const f = Math.min(1, shown - k);
      builder.moveTo(P[a][0], P[a][1]);
      builder.lineTo(lerp(P[a][0], P[b][0], f), lerp(P[a][1], P[b][1], f));
    }
    const path = builder.detach();
    const stroke = Skia.Paint();
    stroke.setStyle(PaintStyle.Stroke);
    stroke.setStrokeCap(StrokeCap.Round);
    stroke.setColor(Skia.Color(c.color));
    stroke.setAlphaf(0.22);
    stroke.setStrokeWidth(9);
    canvas.drawPath(path, stroke);
    stroke.setAlphaf(0.75);
    stroke.setStrokeWidth(2.2);
    canvas.drawPath(path, stroke);

    // Star dots appear one after another and twinkle. The constellation's big star is drawn larger.
    const seed = i * 97 + 13;
    const white = Skia.Paint();
    white.setColor(Skia.Color('#ffffff'));
    for (let k = 0; k < points.length; k++) {
      const appear = clamp(progress * 1.4 - (k / points.length) * 0.9, 0, 1);
      if (!appear) continue;
      const twinkle = 0.8 + 0.2 * Math.sin(now / 700 + k * 1.7 + seed);
      const big = k === c.bigStar ? 1.8 : 1;
      const r = (16 + ((k * 7 + seed) % 3) * 4) * big * twinkle * appear;
      drawGlowDot(canvas, P[k][0], P[k][1], r, c.color);
      canvas.drawCircle(P[k][0], P[k][1], 2.6 * big * appear, white);
    }

    if (font) drawLabel(canvas, c, sx, sy + CONSTELLATION_SCALE * 112, s.labelShown[i], font, labelWidths[i]);
  }
}
