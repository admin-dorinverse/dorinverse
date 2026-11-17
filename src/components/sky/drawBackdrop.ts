// Draws the sky's backdrop for one frame: nebula clouds, faint dust, three layers of cross stars and shooting stars.

import { BlurStyle, PaintStyle, Skia, TileMode, type SkCanvas, type SkPicture } from '@shopify/react-native-skia';
import { cellHash } from './skyMath';
import { DUST_PARALLAX, DUST_TILE, NEBULA_CLOUDS, NEBULA_PARALLAX, STAR_LAYERS } from './skyLayout';
import type { SkyState } from './skyState';
import { addStarCross } from './starCross';

/** Draws the nebula clouds far behind everything. */
function drawNebula(canvas: SkCanvas, s: SkyState): void {
  'worklet';
  const { width: W, height: H, camera: cam } = s;
  const paint = Skia.Paint();
  for (const n of NEBULA_CLOUDS) {
    const x = n.x * NEBULA_PARALLAX - cam.x * NEBULA_PARALLAX + W / 2;
    const y = n.y * NEBULA_PARALLAX - cam.y * NEBULA_PARALLAX + H / 2;
    const r = n.radius * 0.6;
    if (x < -r || x > W + r || y < -r || y > H + r) continue;
    paint.setShader(Skia.Shader.MakeRadialGradient({ x, y }, r, [Skia.Color(n.color), Skia.Color('transparent')], null, TileMode.Clamp));
    paint.setAlphaf(n.alpha);
    canvas.drawRect(Skia.XYWHRect(x - r, y - r, r * 2, r * 2), paint);
  }
}

/** Draws the repeating dust tile, slowly sliding with the camera. */
function drawDust(canvas: SkCanvas, s: SkyState, dustTile: SkPicture): void {
  'worklet';
  const { width: W, height: H, camera: cam } = s;
  const ox = (((-cam.x * DUST_PARALLAX + W / 2) % DUST_TILE) + DUST_TILE) % DUST_TILE;
  const oy = (((-cam.y * DUST_PARALLAX + H / 2) % DUST_TILE) + DUST_TILE) % DUST_TILE;
  for (let ty = -DUST_TILE; ty < H + DUST_TILE; ty += DUST_TILE) {
    for (let tx = -DUST_TILE; tx < W + DUST_TILE; tx += DUST_TILE) {
      const left = tx + ox;
      const top = ty + oy;
      if (left > W || top > H || left + DUST_TILE < 0 || top + DUST_TILE < 0) continue;
      canvas.save();
      canvas.translate(left, top);
      canvas.drawPicture(dustTile);
      canvas.restore();
    }
  }
}

/** Draws the three layers of cross stars. When the sky moves fast they stretch into streaks. */
function drawStars(canvas: SkCanvas, s: SkyState, now: number): void {
  'worklet';
  const { width: W, height: H, camera: cam } = s;
  const seconds = (now - s.startedAt) / 1000;
  const nowSeconds = now / 1000;
  const speed = Math.hypot(cam.vx, cam.vy);
  const streak = speed > 700 ? Math.min(1, (speed - 700) / 1600) : 0;
  const glow = Skia.Paint();
  glow.setMaskFilter(Skia.MaskFilter.MakeBlur(BlurStyle.Normal, 1.2, true));
  const fill = Skia.Paint();
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
      const [sx, sy, size, color] = L.stars[si];
      const path = Skia.PathBuilder.Make();
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
            addStarCross(path, x, y, size, cellHash(cc, rr, li * 2 + si), nowSeconds);
          }
        }
      }
      const built = path.detach();
      if (streak) {
        line.setColor(Skia.Color(color));
        line.setAlphaf(alpha);
        canvas.drawPath(built, line);
      } else {
        glow.setColor(Skia.Color(color));
        glow.setAlphaf(alpha);
        fill.setColor(Skia.Color(color));
        fill.setAlphaf(alpha);
        canvas.drawPath(built, glow);
        canvas.drawPath(built, fill);
      }
    }
  }
}

/** Draws the shooting stars as fading white streaks. */
function drawShootingStars(canvas: SkCanvas, s: SkyState): void {
  'worklet';
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
export function drawBackdrop(canvas: SkCanvas, s: SkyState, now: number, dustTile: SkPicture): void {
  'worklet';
  drawNebula(canvas, s);
  drawDust(canvas, s, dustTile);
  drawStars(canvas, s, now);
  drawShootingStars(canvas, s);
}
