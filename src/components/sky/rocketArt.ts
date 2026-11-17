// The rocket's drawing, copied from the Constellations rocket picture (60 wide, 124 tall), and how to draw it
// with its flickering flame and glowing trail. The shapes are made once; drawing them each frame is cheap.

import { PaintStyle, StrokeCap, Skia, TileMode, type SkCanvas, type SkPaint, type SkPath } from '@shopify/react-native-skia';
import type { SkyState } from './skyState';

/** One filled shape of the rocket, with an optional dark outline. */
type RocketPiece = { path: SkPath; fill: SkPaint; outline: SkPaint | null };

/** Everything needed to draw the rocket, made once. */
export type RocketArt = { pieces: RocketPiece[]; flame: RocketPiece[]; details: RocketPiece[] };

/** Makes a horizontal gradient paint across a shape, like the design's left-to-right shading. */
function across(path: SkPath, colors: string[], positions: number[]): SkPaint {
  const b = path.computeTightBounds();
  const paint = Skia.Paint();
  paint.setShader(Skia.Shader.MakeLinearGradient({ x: b.x, y: 0 }, { x: b.x + b.width, y: 0 }, colors.map((c) => Skia.Color(c)), positions, TileMode.Clamp));
  return paint;
}

/** Makes a plain color paint. `alpha` sets how see-through it is. */
function solid(color: string, alpha = 1): SkPaint {
  const paint = Skia.Paint();
  paint.setColor(Skia.Color(color));
  paint.setAlphaf(alpha);
  return paint;
}

/** Makes the dark brown outline paint the rocket uses. */
function outline(width: number, alpha = 1): SkPaint {
  const paint = solid('#4a2c17', alpha);
  paint.setStyle(PaintStyle.Stroke);
  paint.setStrokeWidth(width);
  paint.setStrokeCap(StrokeCap.Round);
  return paint;
}

/** Turns SVG path text into a shape. */
function shape(d: string): SkPath {
  const p = Skia.Path.MakeFromSVGString(d);
  if (!p) throw new Error(`Bad rocket path: ${d}`);
  return p;
}

/** Builds the rocket's shapes and paints in the classic cream and red colors. */
export function makeRocketArt(): RocketArt {
  const body = shape('M30 3 C45 17 50 42 47 82 L13 82 C10 42 15 17 30 3 Z');
  const nose = shape('M30 3 C38 10 42 18 44 25 L16 25 C18 18 22 10 30 3 Z');
  const band = shape('M13.6 62 L46.4 62 L46.8 70 L13.2 70 Z');
  const finL = shape('M13 60 L1 90 L4 93 L15 84 Z');
  const finR = shape('M47 60 L59 90 L56 93 L45 84 Z');
  const nozzle = shape('M23 78 h14 a3 3 0 0 1 3 3 v3 a3 3 0 0 1 -3 3 h-14 a3 3 0 0 1 -3 -3 v-3 a3 3 0 0 1 3 -3 Z');
  const rim = Skia.PathBuilder.Make().addCircle(30, 42, 10.5).detach();
  const window = Skia.PathBuilder.Make().addCircle(30, 42, 7.6).detach();
  const windowPaint = Skia.Paint();
  windowPaint.setShader(Skia.Shader.MakeRadialGradient({ x: 27.72, y: 39.72 }, 7.6,
    ['#d8f4ff', '#5fb8e8', '#1f5d8a'].map((c) => Skia.Color(c)), [0, 0.6, 1], TileMode.Clamp));
  const finPaint = (p: SkPath) => across(p, ['#6b3f22', '#a0643a'], [0, 1]);
  const rivetBuilder = Skia.PathBuilder.Make();
  [20, 30, 40].forEach((x) => rivetBuilder.addCircle(x, 66, 1.5));
  const rivets = rivetBuilder.detach();

  const outerFlame = shape('M19 86 C17 100 24 112 30 124 C36 112 43 100 41 86 Z');
  const flamePaint = Skia.Paint();
  flamePaint.setShader(Skia.Shader.MakeRadialGradient({ x: 30, y: 89.8 }, 34.2,
    ['#fff6c8', '#ffd25a', '#ff8a2a', 'rgba(255,90,26,0)'].map((c) => Skia.Color(c)), [0, 0.35, 0.75, 1], TileMode.Clamp,
    Skia.Matrix().translate(30, 89.8).scale(0.6, 1).translate(-30, -89.8)));

  const shine = shape('M24.5 37.5 q3-3 6.5-2.8');
  const shinePaint = solid('#ffffff', 0.8);
  shinePaint.setStyle(PaintStyle.Stroke);
  shinePaint.setStrokeWidth(1.4);
  shinePaint.setStrokeCap(StrokeCap.Round);
  const gleam = shape('M19 30 C18 45 18 58 19 60');
  const gleamPaint = solid('#ffffff', 0.55);
  gleamPaint.setStyle(PaintStyle.Stroke);
  gleamPaint.setStrokeWidth(2);
  gleamPaint.setStrokeCap(StrokeCap.Round);

  return {
    flame: [
      { path: outerFlame, fill: flamePaint, outline: null },
      { path: shape('M24 86 C23 96 27 104 30 112 C33 104 37 96 36 86 Z'), fill: solid('#fffbe6', 0.9), outline: null },
    ],
    pieces: [
      { path: finL, fill: finPaint(finL), outline: outline(1.4) },
      { path: finR, fill: finPaint(finR), outline: outline(1.4) },
      { path: nozzle, fill: solid('#7d6a5a'), outline: outline(1.4) },
      { path: body, fill: across(body, ['#e9dcc0', '#fffaf0', '#d8c49c'], [0, 0.45, 1]), outline: outline(1.6) },
      { path: nose, fill: across(nose, ['#b8432f', '#e5624a', '#9b3424'], [0, 0.5, 1]), outline: outline(1.4) },
      { path: band, fill: across(band, ['#b8432f', '#e5624a', '#9b3424'], [0, 0.5, 1]), outline: outline(1.2) },
      { path: rivets, fill: solid('#fffaf0'), outline: null },
      { path: rim, fill: solid('#d9a441'), outline: outline(1.4) },
      { path: window, fill: windowPaint, outline: null },
    ],
    details: [
      { path: shine, fill: shinePaint, outline: null },
      { path: shape('M30 70 L30 82'), fill: outline(1.2, 0.5), outline: null },
      { path: gleam, fill: gleamPaint, outline: null },
    ],
  };
}

/** Draws a list of rocket pieces: fill first, then outline. */
function drawPieces(canvas: SkCanvas, pieces: RocketPiece[]): void {
  'worklet';
  for (const p of pieces) {
    canvas.drawPath(p.path, p.fill);
    if (p.outline) canvas.drawPath(p.path, p.outline);
  }
}

/** Draws the glowing trail particles behind the rocket. */
export function drawTrail(canvas: SkCanvas, s: SkyState, alpha: number): void {
  'worklet';
  const paint = Skia.Paint();
  for (const p of s.trail) {
    const a = p.life / p.maxLife;
    paint.setColor(Skia.Color(p.color));
    paint.setAlphaf(a * 0.9 * alpha);
    canvas.drawCircle(p.x - s.camera.x + s.width / 2, p.y - s.camera.y + s.height / 2, p.radius * (1.4 - a * 0.4), paint);
  }
}

/** Draws the rocket where it is now. Its flame flickers and grows with speed. */
export function drawRocket(canvas: SkCanvas, s: SkyState, now: number, art: RocketArt, alpha: number): void {
  'worklet';
  if (alpha <= 0) return;
  const rk = s.rocket;
  const x = rk.x - s.camera.x + s.width / 2;
  const y = rk.y + rk.bob - s.camera.y + s.height / 2;
  const layer = Skia.Paint();
  layer.setAlphaf(alpha);
  canvas.saveLayer(layer);
  canvas.translate(x, y);
  canvas.rotate(rk.rotation, 0, 0);
  canvas.translate(-30, -62);

  // The flame flickers fast and grows longer as the rocket speeds up. It never shrinks below full size,
  // so it always touches the nozzle.
  const flicker = s.reduceMotion ? 0 : (Math.sin((now / 90) * Math.PI) + 1) / 2;
  const grow = Math.min(1.9, 1 + rk.speed / 900);
  const widen = Math.min(1.2, 1 + rk.speed / 2500);
  canvas.save();
  canvas.translate(30, 100);
  canvas.scale(widen * (1 - 0.08 * flicker), grow * (1 + 0.12 * flicker));
  canvas.translate(-30, -100);
  drawPieces(canvas, art.flame);
  canvas.restore();

  drawPieces(canvas, art.pieces);
  drawPieces(canvas, art.details);
  canvas.restore();
}
