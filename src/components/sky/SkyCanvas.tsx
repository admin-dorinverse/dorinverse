// The full-screen sky drawing. It sits behind every tab and redraws each frame from the shared sky memory.

import { Canvas, LinearGradient, Picture, Rect, createPicture, useFont, useImage, vec } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { PixelRatio, StyleSheet, useWindowDimensions } from 'react-native';
import { useDerivedValue } from 'react-native-reanimated';
import { sky as skyColors } from '@/theme/colors';
import { constellationLabelSize, skyLabelFont } from '@/theme/text';
import { drawBackdrop } from './drawBackdrop';
import { PLANET_WIDTH, drawBakery } from './drawBakery';
import { drawConstellations } from './drawConstellations';
import { drawRocket, drawTrail, makeRocketArt } from './rocketArt';
import { makeDustTile } from './dustTile';
import { makePlanetSprite } from './planetSprite';
import { useSky } from './SkyProvider';

/** The eight cookie box pictures that float out of the chimney. */
const BOX_IMAGES = [
  require('../../../assets/images/boxes/box-0.webp'),
  require('../../../assets/images/boxes/box-1.webp'),
  require('../../../assets/images/boxes/box-2.webp'),
  require('../../../assets/images/boxes/box-3.webp'),
  require('../../../assets/images/boxes/box-4.webp'),
  require('../../../assets/images/boxes/box-5.webp'),
  require('../../../assets/images/boxes/box-6.webp'),
  require('../../../assets/images/boxes/box-7.webp'),
];

/** Draws the living sky. Place it once, behind the tabs. */
export function SkyCanvas() {
  const { width, height } = useWindowDimensions();
  const { sky, clock, constellations, labelWidths } = useSky();
  const font = useFont(skyLabelFont, constellationLabelSize);
  const planetImage = useImage(require('../../../assets/images/bakery-cookie.webp'));
  const planet = useMemo(() => (planetImage ? makePlanetSprite(planetImage, PLANET_WIDTH, PixelRatio.get()) : null), [planetImage]);
  const box0 = useImage(BOX_IMAGES[0]);
  const box1 = useImage(BOX_IMAGES[1]);
  const box2 = useImage(BOX_IMAGES[2]);
  const box3 = useImage(BOX_IMAGES[3]);
  const box4 = useImage(BOX_IMAGES[4]);
  const box5 = useImage(BOX_IMAGES[5]);
  const box6 = useImage(BOX_IMAGES[6]);
  const box7 = useImage(BOX_IMAGES[7]);
  const boxes = useMemo(() => [box0, box1, box2, box3, box4, box5, box6, box7], [box0, box1, box2, box3, box4, box5, box6, box7]);
  const dustTile = useMemo(() => makeDustTile(), []);
  const rocketArt = useMemo(() => makeRocketArt(), []);

  const picture = useDerivedValue(() => {
    const now = clock.value;
    const s = sky.value;
    return createPicture(
      (canvas) => {
        drawBackdrop(canvas, s, now, dustTile);
        drawConstellations(canvas, s, now, constellations, font, labelWidths);
        drawBakery(canvas, s, now, planet, boxes, s.worldShown);
        drawTrail(canvas, s, s.worldShown);
        drawRocket(canvas, s, now, rocketArt, s.worldShown);
      },
      { width: s.width, height: s.height },
    );
  }, [dustTile, rocketArt, font, planet, boxes, constellations, labelWidths]);

  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      <Rect x={0} y={0} width={width} height={height}>
        <LinearGradient start={vec(0, 0)} end={vec(0, height)} colors={[skyColors.top, skyColors.middle, skyColors.bottom]} positions={[0, 0.7, 1]} />
      </Rect>
      <Picture picture={picture} />
    </Canvas>
  );
}
