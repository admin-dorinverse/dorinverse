// Draws the faint star dust once into a reusable tile. The sky then just slides copies of it around, which is
// much faster than drawing 140 dots every frame.

import { Skia, createPicture, type SkPicture } from '@shopify/react-native-skia';
import { DUST_DOTS, DUST_TILE } from './skyLayout';

/** Makes the dust tile picture. */
export function makeDustTile(): SkPicture {
  return createPicture(
    (canvas) => {
      const paint = Skia.Paint();
      for (const d of DUST_DOTS) {
        paint.setColor(Skia.Color(d.color));
        paint.setAlphaf(d.alpha);
        canvas.drawCircle(d.x, d.y, d.radius, paint);
      }
    },
    { width: DUST_TILE, height: DUST_TILE },
  );
}
