// Draws the Armor of God's ready-made pictures once, as in the Constellations design: for each of the six pieces,
// its glass shards (earned ones polished silver, gold, red, steel or leather; the rest faint outlines) with a soft edge,
// its glow for when it pulses, and a mask of its earned shards for the shine to sweep across. The sky then only moves
// and fades these pictures, which costs almost nothing.

import { BlurStyle, ClipOp, PaintStyle, Skia, StrokeJoin, TileMode, type SkCanvas, type SkImage, type SkPath } from '@shopify/react-native-skia';
import { armor, shardLooks, shardShades, type ArmorGradient } from '@/theme/armorColors';
import { ARMOR_H, ARMOR_PIECES, ARMOR_W } from './armorShapes';

/** The shards, cut once by scripts/app/make-armor-shards.mjs: [piece, color, lightness, rank, of, x1, y1, …]. */
const DATA = require('../../../assets/data/armor-shards.json') as { colors: string[]; shards: number[][] };

/** Room around each piece's picture for its glow. */
const PAD = 16;

/** Room around the whole armor for its halo and shadow. */
const HALO_PAD = 44;

/** One piece's pictures and where they sit in the armor drawing (its top-left corner, with the room around it). */
export type PieceArt = { x: number; y: number; w: number; h: number; base: SkImage; glow: SkImage; mask: SkImage | null };

/** The whole armor's pictures. */
export type ArmorArt = { pieces: PieceArt[]; halo: SkImage; haloPad: number };

/** Turns a list of shards into one shape. */
function shardsPath(rows: readonly number[][]): SkPath {
  const b = Skia.PathBuilder.Make();
  for (const r of rows) {
    b.moveTo(r[5], r[6]);
    for (let i = 7; i < r.length; i += 2) b.lineTo(r[i], r[i + 1]);
    b.close();
  }
  return b.detach();
}

/** A piece's outline as one shape. */
function outlinePath(sil: readonly string[]): SkPath {
  const b = Skia.PathBuilder.Make();
  for (const d of sil) {
    const p = Skia.Path.MakeFromSVGString(d);
    if (p) b.addPath(p);
  }
  return b.detach();
}

/** A fill paint for a shard color: its mirrored gradient, or a plain color. */
function fillPaint(fill: ArmorGradient | string) {
  const paint = Skia.Paint();
  if (typeof fill === 'string') paint.setColor(Skia.Color(fill));
  else {
    const [x1, y1] = fill.from;
    const [x2, y2] = fill.to;
    paint.setShader(Skia.Shader.MakeLinearGradient({ x: x1, y: y1 }, { x: x2, y: y2 }, fill.colors.map((c) => Skia.Color(c)), [...fill.stops], TileMode.Mirror));
  }
  return paint;
}

/** Draws into a fresh picture `w` × `h` points big at the screen's pixel size, with the armor's (0, 0) at (`dx`, `dy`). */
function picture(w: number, h: number, dx: number, dy: number, pixelRatio: number, draw: (canvas: SkCanvas) => void): SkImage | null {
  const surface = Skia.Surface.Make(Math.ceil(w * pixelRatio), Math.ceil(h * pixelRatio));
  if (!surface) return null;
  const canvas = surface.getCanvas();
  canvas.scale(pixelRatio, pixelRatio);
  canvas.translate(dx, dy);
  draw(canvas);
  surface.flush();
  return surface.makeImageSnapshot();
}

/**
 * Makes every armor picture. `earned` says which shards the person has, by their place in the shard list.
 * Returns null if a picture could not be made.
 */
export function makeArmorArt(earned: (index: number) => boolean, pixelRatio: number): ArmorArt | null {
  const pieces: PieceArt[] = [];
  for (let pi = 0; pi < ARMOR_PIECES.length; pi++) {
    const piece = ARMOR_PIECES[pi];
    const [x0, y0, w, h] = piece.box;
    const outline = outlinePath(piece.sil);
    const mine = DATA.shards.map((r, i) => ({ r, got: earned(i) })).filter((s) => s.r[0] === pi);
    const got = mine.filter((s) => s.got).map((s) => s.r);
    const missing = mine.filter((s) => !s.got).map((s) => s.r);
    const W = w + PAD * 2;
    const H = h + PAD * 2;

    const base = picture(W, H, PAD - x0, PAD - y0, pixelRatio, (canvas) => {
      canvas.save();
      canvas.clipPath(outline, ClipOp.Intersect, true);
      // Shards not earned yet: a faint fill and outline.
      const missingPath = shardsPath(missing);
      const faint = Skia.Paint();
      faint.setColor(Skia.Color(armor.missingFill));
      canvas.drawPath(missingPath, faint);
      const seam = Skia.Paint();
      seam.setStyle(PaintStyle.Stroke);
      seam.setStrokeJoin(StrokeJoin.Round);
      seam.setStrokeWidth(0.35);
      seam.setColor(Skia.Color(armor.missingLine));
      canvas.drawPath(missingPath, seam);
      // Earned shards in their colors, each with a thin dark seam.
      seam.setStrokeWidth(0.32);
      for (const [ci, name] of DATA.colors.entries()) {
        const rows = got.filter((r) => r[1] === ci);
        if (!rows.length) continue;
        const path = shardsPath(rows);
        canvas.drawPath(path, fillPaint(shardLooks[name].fill));
        seam.setColor(Skia.Color(shardLooks[name].seam));
        canvas.drawPath(path, seam);
      }
      // Light and shade: earned shards fall into four groups by their lightness, so neighbors differ.
      shardShades.forEach(([color, alpha], k) => {
        const rows = got.filter((r) => Math.floor(r[2] * 4) === k);
        if (!rows.length) return;
        const shade = Skia.Paint();
        shade.setColor(Skia.Color(color));
        shade.setAlphaf(alpha);
        canvas.drawPath(shardsPath(rows), shade);
      });
      canvas.restore();
      const rim = Skia.Paint();
      rim.setStyle(PaintStyle.Stroke);
      rim.setStrokeWidth(0.9);
      rim.setColor(Skia.Color(armor.rim));
      canvas.drawPath(outline, rim);
    });

    // The glow as it pulses: a soft light blue haze around the piece and a bright glowing edge.
    const glow = picture(W, H, PAD - x0, PAD - y0, pixelRatio, (canvas) => {
      const haze = Skia.Paint();
      haze.setColor(Skia.Color(armor.pulseGlow));
      haze.setMaskFilter(Skia.MaskFilter.MakeBlur(BlurStyle.Outer, 5, true));
      canvas.drawPath(outline, haze);
      const edge = Skia.Paint();
      edge.setStyle(PaintStyle.Stroke);
      edge.setStrokeWidth(0.9);
      edge.setColor(Skia.Color(armor.rimBright));
      edge.setMaskFilter(Skia.MaskFilter.MakeBlur(BlurStyle.Solid, 2.5, true));
      canvas.drawPath(outline, edge);
    });

    // Where the shine shows: the earned shards only.
    const mask = got.length
      ? picture(W, H, PAD - x0, PAD - y0, pixelRatio, (canvas) => {
          canvas.clipPath(outline, ClipOp.Intersect, true);
          const white = Skia.Paint();
          white.setColor(Skia.Color('#ffffff'));
          canvas.drawPath(shardsPath(got), white);
        })
      : null;

    if (!base || !glow) return null;
    pieces.push({ x: x0 - PAD, y: y0 - PAD + piece.shiftY, w: W, h: H, base, glow, mask });
  }

  // A soft light blue halo and a shadow under the whole armor, as in the design's drop shadows.
  const halo = picture(ARMOR_W + HALO_PAD * 2, ARMOR_H + HALO_PAD * 2, HALO_PAD, HALO_PAD, pixelRatio, (canvas) => {
    const shadow = Skia.Paint();
    shadow.setColor(Skia.Color(armor.shadow));
    shadow.setMaskFilter(Skia.MaskFilter.MakeBlur(BlurStyle.Normal, 9, true));
    const light = Skia.Paint();
    light.setColor(Skia.Color(armor.halo));
    light.setMaskFilter(Skia.MaskFilter.MakeBlur(BlurStyle.Outer, 9, true));
    for (const piece of ARMOR_PIECES) {
      const outline = outlinePath(piece.sil);
      canvas.save();
      canvas.translate(0, piece.shiftY + 10);
      canvas.drawPath(outline, shadow);
      canvas.translate(0, -10);
      canvas.drawPath(outline, light);
      canvas.restore();
    }
  });
  if (!halo) return null;
  return { pieces, halo, haloPad: HALO_PAD };
}

/** For now, the person has the shards nearest each piece's heart, about a quarter of each piece, as in the design. */
export function sampleEarned(index: number): boolean {
  const r = DATA.shards[index];
  return r[3] < r[4] * 0.27;
}
