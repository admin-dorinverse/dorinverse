// A still copy of the night sky (gradient, nebula, dust and stars) for pages that open on top of the tabs, like the
// lesson list, the orbit view and the player. It is drawn once when the page opens and never redrawn, so it costs
// the phone nothing while the page is open.

import { Canvas, LinearGradient, Picture, Rect, createPicture, vec } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import { sky as skyColors } from '@/theme/colors';
import { drawBackdrop } from './drawBackdrop';
import { useSky } from './SkyProvider';

/** The night sky, drawn once. Place it first on a page, under everything else. */
export function StillSky() {
  const { width, height } = useWindowDimensions();
  const { sky, art } = useSky();
  // One picture of the sky as it is right now, with twinkles frozen. It is made once per screen size.
  const picture = useMemo(() => {
    const s = sky.get();
    return createPicture((canvas) => drawBackdrop(canvas, { ...s, width, height, shootingStars: [] }, 0, art.backdrop, {}), { width, height });
  }, [sky, art.backdrop, width, height]);

  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      <Rect x={0} y={0} width={width} height={height}>
        <LinearGradient start={vec(0, 0)} end={vec(0, height)} colors={[skyColors.top, skyColors.middle, skyColors.bottom]} positions={[0, 0.7, 1]} />
      </Rect>
      <Picture picture={picture} />
    </Canvas>
  );
}
