// Draws the sky's backdrop for one frame: nebula clouds, faint dust, three layers of cross stars and shooting stars.
// The clouds, dust and star shapes are drawn ahead of time; each frame only places them, making nothing new.

import { FilterMode, MipmapMode, PaintStyle, Skia, TileMode, type SkCanvas, type SkRSXform, type SkRect } from '@shopify/react-native-skia';
import type { DustField } from './dustField';
import type { NebulaPicture } from './nebulaPicture';
import { cellHash } from './skyMath';
import { DUST_PARALLAX, NEBULA_PARALLAX, STAR_LAYERS } from './skyLayout';
import type { SkyState } from './skyState';
import { starMorph } from './starCross';
import type { StarSheet } from './starSheet';

/** The ready-made pictures the backdrop places each frame. */
export type BackdropArt = {
  /** The dust, drawn once across the whole sky. */
  dust: DustField;
  /** Every star shape, drawn once. */
  stars: StarSheet | null;
  /** The nebula clouds, painted once. */
  nebula: NebulaPicture | null;
};

/** Where each star sits, remembered the first time it is seen so no star is placed twice. Lives on the animation thread. */
export type StarSpots = Record<number, SkRSXform>;

/** Smooth sampling for placing ready-made pictures between whole pixels. */
const SMOOTH = { filter: FilterMode.Linear, mipmap: MipmapMode.None };

/** Draws the nebula clouds far behind everything. */
function drawNebula(canvas: SkCanvas, s: SkyState, nebula: NebulaPicture): void {
  'worklet';
  const x = nebula.left - s.camera.x * NEBULA_PARALLAX + s.width / 2;
  const y = nebula.top - s.camera.y * NEBULA_PARALLAX + s.height / 2;
  canvas.drawImageRectOptions(nebula.image, nebula.src, Skia.XYWHRect(x, y, nebula.width, nebula.height), FilterMode.Linear, MipmapMode.None, Skia.Paint());
}

/** Slides the dust field with the camera. */
function drawDust(canvas: SkCanvas, s: SkyState, dust: DustField): void {
  'worklet';
  canvas.save();
  canvas.translate(dust.left - s.camera.x * DUST_PARALLAX + s.width / 2, dust.top - s.camera.y * DUST_PARALLAX + s.height / 2);
  canvas.drawPicture(dust.picture);
  canvas.restore();
}

/** A single number that names one star: its layer and kind, and its grid cell. */
function starKey(kind: number, cc: number, rr: number): number {
  'worklet';
  return (kind * 4096 + (cc + 2048)) * 4096 + (rr + 2048);
}

/** Draws the three layers of cross stars. When the sky moves fast they stretch into streaks. */
function drawStars(canvas: SkCanvas, s: SkyState, now: number, sheet: StarSheet, spots: StarSpots): void {
  'worklet';
  const { width: W, height: H, camera: cam } = s;
  const seconds = (now - s.startedAt) / 1000;
  const nowSeconds = now / 1000;
  const speed = Math.hypot(cam.vx, cam.vy);
  const streak = speed > 700 ? Math.min(1, (speed - 700) / 1600) : 0;
  const fill = Skia.Paint();
  const shrink = 1 / sheet.pixelRatio;
  const half = sheet.cell / 2;
  const line = Skia.Paint();
  line.setStyle(PaintStyle.Stroke);
  line.setStrokeWidth(1.6);
  for (let li = 0; li < STAR_LAYERS.length; li++) {
    const L = STAR_LAYERS[li];
    const drift = seconds / L.driftSeconds;
    const ox = -2 * L.width * drift - cam.x * L.parallax + W / 2;
    const oy = L.height * drift - L.height - cam.y * L.parallax + H / 2;
    const alpha = 0.75 + 0.25 * Math.cos((2 * Math.PI * (seconds + L.twinkleOffset)) / L.twinkleSeconds);
    const c0 = Math.floor(-ox / L.width) - 1;
    const c1 = Math.ceil((W - ox) / L.width);
    const r0 = Math.floor(-oy / L.height) - 1;
    const r1 = Math.ceil((H - oy) / L.height);
    for (let si = 0; si < L.stars.length; si++) {
      const [sx, sy, , color] = L.stars[si];
      const kind = sheet.firstKind[li] + si;
      const shapes = sheet.rects[kind];
      const path = Skia.PathBuilder.Make();
      const srcs: SkRect[] = [];
      const places: SkRSXform[] = [];
      for (let cc = c0; cc <= c1; cc++) {
        for (let rr = r0; rr <= r1; rr++) {
          const jx = (cellHash(cc, rr, li * 7 + si) - 0.5) * L.width * 0.7;
          const jy = (cellHash(rr, cc, li * 5 + si + 3) - 0.5) * L.height * 0.7;
          const x = cc * L.width + sx + ox + jx;
          const y = rr * L.height + sy + oy + jy;
          if (x < -10 || x > W + 10 || y < -10 || y > H + 10) continue;
          if (streak) {
            const k = streak * L.parallax * 0.05;
            path.moveTo(x, y);
            path.lineTo(x + cam.vx * k, y + cam.vy * k);
          } else {
            const morph = starMorph(cellHash(cc, rr, li * 2 + si), nowSeconds);
            srcs.push(shapes[Math.round(morph * (sheet.steps - 1))]);
            const key = starKey(kind, cc, rr);
            let spot = spots[key];
            if (!spot) {
              // Remembered without the camera and drift, which the canvas adds below.
              spot = Skia.RSXform(shrink, 0, cc * L.width + sx + jx - half, rr * L.height + sy + jy - half);
              spots[key] = spot;
            }
            places.push(spot);
          }
        }
      }
      if (streak) {
        line.setColor(Skia.Color(color));
        line.setAlphaf(alpha);
        canvas.drawPath(path.detach(), line);
      } else if (srcs.length) {
        fill.setAlphaf(alpha);
        canvas.save();
        canvas.translate(ox, oy);
        canvas.drawAtlas(sheet.image, srcs, places, fill, undefined, undefined, SMOOTH);
        canvas.restore();
      }
    }
  }
}

/** Draws the shooting stars as fading white streaks. */
function drawShootingStars(canvas: SkCanvas, s: SkyState): void {
  'worklet';
  if (s.shootingStars.length === 0) return;
  const paint = Skia.Paint();
  paint.setStyle(PaintStyle.Stroke);
  paint.setStrokeWidth(2);
  for (const st of s.shootingStars) {
    const alpha = Math.max(0, Math.sin(Math.min(1, st.life / 0.9) * Math.PI));
    const tailX = st.x - st.vx * 0.12;
    const tailY = st.y - st.vy * 0.12;
    paint.setShader(
      Skia.Shader.MakeLinearGradient({ x: st.x, y: st.y }, { x: tailX, y: tailY },
        [Skia.Color(`rgba(255,255,255,${alpha})`), Skia.Color('rgba(255,255,255,0)')], null, TileMode.Clamp),
    );
    const path = Skia.PathBuilder.Make();
    path.moveTo(st.x, st.y);
    path.lineTo(tailX, tailY);
    canvas.drawPath(path.detach(), paint);
  }
}

/** Draws the whole backdrop. The sky gradient itself is drawn underneath by the canvas component. */
export function drawBackdrop(canvas: SkCanvas, s: SkyState, now: number, art: BackdropArt, spots: StarSpots): void {
  'worklet';
  if (art.nebula) drawNebula(canvas, s, art.nebula);
  drawDust(canvas, s, art.dust);
  if (art.stars) drawStars(canvas, s, now, art.stars, spots);
  drawShootingStars(canvas, s);
}
