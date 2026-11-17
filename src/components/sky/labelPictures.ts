// Draws each constellation's glowing name once into a ready-made picture. Blurring the glow is the costly part,
// so doing it once here, instead of every frame, keeps the sky light.

import { BlurStyle, Skia, type SkFont, type SkImage, type SkRect } from '@shopify/react-native-skia';
import type { Constellation } from '@/types/constellation';

/** Room around the name for its glow, in points. */
const GLOW_ROOM = 40;

/** One finished name picture, and where it sits relative to the name's own top-left corner. */
export type LabelPicture = {
  /** The name with its glow. */
  image: SkImage;
  /** The whole picture, as the cut-out to draw from. */
  src: SkRect;
  /** Width of the name text alone, in points. */
  textWidth: number;
  /** How far the picture reaches past the text on every side, in points. */
  room: number;
  /** Drawn width in points. */
  width: number;
  /** Drawn height in points. */
  height: number;
};

/** Makes the name pictures for every constellation at the screen's pixel size (`pixelRatio` pixels per point). */
export function makeLabelPictures(constellations: readonly Constellation[], font: SkFont, pixelRatio: number): (LabelPicture | null)[] {
  const { ascent, descent } = font.getMetrics();
  return constellations.map((c) => {
    const textWidth = font.measureText(c.name).width;
    const width = textWidth + GLOW_ROOM * 2;
    const height = descent - ascent + GLOW_ROOM * 2;
    const surface = Skia.Surface.Make(Math.ceil(width * pixelRatio), Math.ceil(height * pixelRatio));
    if (!surface) return null;
    const canvas = surface.getCanvas();
    canvas.scale(pixelRatio, pixelRatio);
    const x = GLOW_ROOM;
    const baseline = GLOW_ROOM - ascent;
    // A wide and a tight colored glow, then a soft white rim and the white text, like the design's text shadow.
    const glow = Skia.Paint();
    glow.setColor(Skia.Color(c.color));
    glow.setMaskFilter(Skia.MaskFilter.MakeBlur(BlurStyle.Normal, 13, true));
    canvas.drawText(c.name, x, baseline, glow, font);
    glow.setMaskFilter(Skia.MaskFilter.MakeBlur(BlurStyle.Normal, 6, true));
    canvas.drawText(c.name, x, baseline, glow, font);
    const white = Skia.Paint();
    white.setColor(Skia.Color('#ffffff'));
    white.setMaskFilter(Skia.MaskFilter.MakeBlur(BlurStyle.Normal, 1, true));
    canvas.drawText(c.name, x, baseline, white, font);
    white.setMaskFilter(null);
    canvas.drawText(c.name, x, baseline, white, font);
    surface.flush();
    const image = surface.makeImageSnapshot();
    return { image, src: Skia.XYWHRect(0, 0, image.width(), image.height()), textWidth, room: GLOW_ROOM, width, height };
  });
}
