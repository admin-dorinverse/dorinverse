// The full-screen star sky. It sits behind every tab and redraws when the sky clock ticks: 20 times a second
// while the sky rests, 60 while it moves. The planet and rocket are separate views over it, so the sky's slow
// parts never need to be repainted for their fast motion.

import { Canvas, LinearGradient, Picture, Rect, createPicture, vec } from '@shopify/react-native-skia';
import { StyleSheet, useWindowDimensions } from 'react-native';
import { useDerivedValue, useSharedValue } from 'react-native-reanimated';
import { sky as skyColors } from '@/theme/colors';
import { drawBackdrop, type StarSpots } from './drawBackdrop';
import { drawConstellations } from './drawConstellations';
import { drawTrail } from './drawTrail';
import { useSky } from './SkyProvider';

/** Draws the star sky. Place it once, behind the tabs, under the planet and rocket views. */
export function SkyCanvas() {
  const { width, height } = useWindowDimensions();
  const { sky, clock, constellations, art } = useSky();
  // The star spots are remembered on the animation thread, in an object made there the first time. An object
  // handed over from React is sealed, so new spots could not be added to it. The drawing below also runs once
  // on the React side before the animation thread takes over; that run gets a throwaway memory.
  const starSpots = useSharedValue<{ spots: StarSpots | null }>({ spots: null });

  const picture = useDerivedValue(() => {
    const now = clock.get();
    const s = sky.get();
    const holder = starSpots.get();
    let spots = holder.spots;
    if (!spots) {
      spots = {};
      if (globalThis._WORKLET) holder.spots = spots;
    }
    return createPicture(
      (canvas) => {
        drawBackdrop(canvas, s, now, art.backdrop, spots);
        drawConstellations(canvas, s, now, constellations, art.labels);
        drawTrail(canvas, s, s.worldShown);
      },
      { width: s.width, height: s.height },
    );
  });

  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      <Rect x={0} y={0} width={width} height={height}>
        <LinearGradient start={vec(0, 0)} end={vec(0, height)} colors={[skyColors.top, skyColors.middle, skyColors.bottom]} positions={[0, 0.7, 1]} />
      </Rect>
      <Picture picture={picture} />
    </Canvas>
  );
}
