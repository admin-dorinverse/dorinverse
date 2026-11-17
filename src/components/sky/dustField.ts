// Draws the faint star dust once, across the whole sky, into a reusable picture. The sky then just slides it
// with the camera. The dust used to be one small tile repeated, which showed as a pattern while panning.

import { Skia, createPicture, type SkPicture } from '@shopify/react-native-skia';
import { sky } from '@/theme/colors';
import { DUST_PARALLAX, SKY_BOUNDS } from './skyLayout';
import { seededRandom } from './skyMath';

/** Room past the farthest camera spot, so dust still fills the screen at the sky's edges and on wide screens. */
const EDGE_ROOM = 700;

/** How many dust dots per 900 by 900 points, the density of the design's dust tile. */
const DOTS_PER_TILE = 140;

/** The dust field picture and the area it covers, in dust-layer points (camera spot times the dust parallax). */
export type DustField = {
  /** The dots. */
  picture: SkPicture;
  /** Left edge of the covered area. */
  left: number;
  /** Top edge of the covered area. */
  top: number;
};

/** Makes the dust field. Every dot is placed the same way each time. */
export function makeDustField(): DustField {
  const left = SKY_BOUNDS.left * DUST_PARALLAX - EDGE_ROOM;
  const top = SKY_BOUNDS.top * DUST_PARALLAX - EDGE_ROOM;
  const width = SKY_BOUNDS.right * DUST_PARALLAX + EDGE_ROOM - left;
  const height = SKY_BOUNDS.bottom * DUST_PARALLAX + EDGE_ROOM - top;
  const count = Math.round((DOTS_PER_TILE * width * height) / (900 * 900));
  const random = seededRandom(77);
  const colors = [sky.starGold, sky.starWhite, sky.starLilac, sky.starWhite];
  const picture = createPicture(
    (canvas) => {
      const paint = Skia.Paint();
      for (let i = 0; i < count; i++) {
        const x = random() * width;
        const y = random() * height;
        const radius = 0.6 + random() * 1.1;
        paint.setColor(Skia.Color(colors[Math.floor(random() * colors.length)]));
        paint.setAlphaf(0.35 + random() * 0.5);
        canvas.drawCircle(x, y, radius, paint);
      }
    },
    { width, height },
  );
  return { picture, left, top };
}
