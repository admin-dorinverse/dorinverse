// Draws the bakery planet and its soft golden glow once, at the screen's real pixel size, into a ready-made
// picture. Each frame then just moves that picture. This keeps the planet steady (no shimmer) and is faster
// than blurring the glow 60 times a second.

import { FilterMode, MipmapMode, Skia, type SkImage } from '@shopify/react-native-skia';

/** The finished planet picture and where it sits, in points, relative to the planet's top-left corner. */
export type PlanetSprite = {
  /** The finished picture, including the glow around it. */
  image: SkImage;
  /** Left edge, measured from the planet's left edge (negative, because the glow spreads out). */
  left: number;
  /** Top edge, measured from the planet's top edge. */
  top: number;
  /** Drawn width in points. */
  width: number;
  /** Drawn height in points. */
  height: number;
};

/** Room around the planet for the glow, in points. */
const GLOW_ROOM = 48;

/** Makes the planet sprite for a planet drawn `width` points wide on a screen with `pixelRatio` pixels per point. */
export function makePlanetSprite(planet: SkImage, width: number, pixelRatio: number): PlanetSprite | null {
  const height = (width * planet.height()) / planet.width();
  const spriteW = width + GLOW_ROOM * 2;
  const spriteH = height + GLOW_ROOM * 2;
  const surface = Skia.Surface.Make(Math.ceil(spriteW * pixelRatio), Math.ceil(spriteH * pixelRatio));
  if (!surface) return null;
  const canvas = surface.getCanvas();
  canvas.scale(pixelRatio, pixelRatio);
  const paint = Skia.Paint();
  paint.setImageFilter(Skia.ImageFilter.MakeDropShadow(0, 10, 15, 15, Skia.Color('rgba(255,190,90,0.25)'), null));
  canvas.drawImageRectOptions(
    planet,
    Skia.XYWHRect(0, 0, planet.width(), planet.height()),
    Skia.XYWHRect(GLOW_ROOM, GLOW_ROOM, width, height),
    FilterMode.Linear,
    MipmapMode.Linear,
    paint,
  );
  surface.flush();
  return { image: surface.makeImageSnapshot(), left: -GLOW_ROOM, top: -GLOW_ROOM, width: spriteW, height: spriteH };
}
