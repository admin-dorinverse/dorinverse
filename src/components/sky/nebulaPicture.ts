// Paints the 14 soft nebula clouds once into one picture. They are pure soft color, so a small picture stretched
// to size looks the same as painting each cloud every frame, and costs one quick draw instead of fourteen big ones.

import { Skia, TileMode, type SkImage, type SkRect } from '@shopify/react-native-skia';
import { NEBULA_CLOUDS } from './skyLayout';

/**
 * Pixels per point of the nebula picture. One is enough for soft clouds; less made faint blocks show on the
 * phone once the picture was stretched to the screen.
 */
const DETAIL = 1;

/** The nebula picture and the area it covers, in nebula-layer points (cloud spot times the far-layer parallax). */
export type NebulaPicture = {
  /** The painted clouds. */
  image: SkImage;
  /** The whole picture, as the cut-out to draw from. */
  src: SkRect;
  /** Left edge of the covered area. */
  left: number;
  /** Top edge of the covered area. */
  top: number;
  /** Width of the covered area. */
  width: number;
  /** Height of the covered area. */
  height: number;
};

/** Paints the clouds. `parallax` is how much the nebula layer moves with the camera. */
export function makeNebulaPicture(parallax: number): NebulaPicture | null {
  const clouds = NEBULA_CLOUDS.map((n) => ({ x: n.x * parallax, y: n.y * parallax, r: n.radius * 0.6, color: n.color, alpha: n.alpha }));
  const left = Math.min(...clouds.map((c) => c.x - c.r));
  const top = Math.min(...clouds.map((c) => c.y - c.r));
  const width = Math.max(...clouds.map((c) => c.x + c.r)) - left;
  const height = Math.max(...clouds.map((c) => c.y + c.r)) - top;
  const surface = Skia.Surface.Make(Math.ceil(width * DETAIL), Math.ceil(height * DETAIL));
  if (!surface) return null;
  const canvas = surface.getCanvas();
  canvas.scale(DETAIL, DETAIL);
  canvas.translate(-left, -top);
  const paint = Skia.Paint();
  paint.setDither(true);
  for (const c of clouds) {
    paint.setShader(Skia.Shader.MakeRadialGradient({ x: c.x, y: c.y }, c.r, [Skia.Color(c.color), Skia.Color('transparent')], null, TileMode.Clamp));
    paint.setAlphaf(c.alpha);
    canvas.drawRect(Skia.XYWHRect(c.x - c.r, c.y - c.r, c.r * 2, c.r * 2), paint);
  }
  surface.flush();
  const image = surface.makeImageSnapshot();
  return { image, src: Skia.XYWHRect(0, 0, image.width(), image.height()), left, top, width, height };
}
