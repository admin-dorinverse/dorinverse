// Draws every shape a background star passes through (cross, shrinking, dot) once, ahead of time, onto one
// sheet. Each frame the sky then only places copies from the sheet, instead of building and blurring every star.

import { BlurStyle, Skia, type SkImage, type SkRect } from '@shopify/react-native-skia';
import { STAR_LAYERS } from './skyLayout';
import { addStarShape } from './starCross';

/** How many in-between shapes each star has on its way from cross to dot. */
const STEPS = 24;

/** Size of one cell on the sheet, in points: the biggest star plus room for its glow. */
const CELL = 18;

/** The finished star sheet and how to find each shape on it. */
export type StarSheet = {
  /** The sheet picture. */
  image: SkImage;
  /** The cut-out for each star kind at each step: `rects[kind][step]`. */
  rects: SkRect[][];
  /** The first star kind of each layer. A layer's stars are this kind, the next, and so on. */
  firstKind: number[];
  /** Cell size in points. */
  cell: number;
  /** Pixels per point the sheet was drawn at. */
  pixelRatio: number;
  /** How many in-between shapes each star has. */
  steps: number;
};

/** Makes the star sheet at the screen's real pixel size (`pixelRatio` pixels per point). */
export function makeStarSheet(pixelRatio: number): StarSheet | null {
  const kinds = STAR_LAYERS.flatMap((layer) => layer.stars);
  const cellPx = Math.ceil(CELL * pixelRatio);
  const cell = cellPx / pixelRatio;
  const surface = Skia.Surface.Make(cellPx * STEPS, cellPx * kinds.length);
  if (!surface) return null;
  const canvas = surface.getCanvas();
  canvas.scale(pixelRatio, pixelRatio);
  const glow = Skia.Paint();
  glow.setMaskFilter(Skia.MaskFilter.MakeBlur(BlurStyle.Normal, 1.2, true));
  const fill = Skia.Paint();
  const rects = kinds.map(([, , size, color], kind) => {
    glow.setColor(Skia.Color(color));
    fill.setColor(Skia.Color(color));
    return Array.from({ length: STEPS }, (_, step) => {
      const builder = Skia.PathBuilder.Make();
      addStarShape(builder, (step + 0.5) * cell, (kind + 0.5) * cell, size, step / (STEPS - 1));
      const path = builder.detach();
      canvas.drawPath(path, glow);
      canvas.drawPath(path, fill);
      return Skia.XYWHRect(step * cellPx, kind * cellPx, cellPx, cellPx);
    });
  });
  surface.flush();
  const firstKind: number[] = [];
  let next = 0;
  for (const layer of STAR_LAYERS) {
    firstKind.push(next);
    next += layer.stars.length;
  }
  return { image: surface.makeImageSnapshot(), rects, firstKind, cell, pixelRatio, steps: STEPS };
}
