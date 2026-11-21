// The glowing ember trail behind the orbit view's rocket, drawn like the home sky's: small fading dots in ember
// colors. It is redrawn only when the page's shared timer ticks (60 a second while the rocket moves, 20 at rest).

import { Canvas, Picture, Skia, createPicture } from '@shopify/react-native-skia';
import { StyleSheet } from 'react-native';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';
import type { OrbitFlight } from './orbitRocketFlight';

/** Props for the trail. */
type RocketTrailProps = {
  /** The rocket's flight, with its trail. */
  flight: SharedValue<OrbitFlight>;
  /** The page's shared timer; the trail redraws when it ticks. */
  time: SharedValue<number>;
};

/** The ember trail. */
export function RocketTrail({ flight, time }: RocketTrailProps) {
  const picture = useDerivedValue(() => {
    time.get();
    const trail = flight.get().trail;
    return createPicture((canvas) => {
      const paint = Skia.Paint();
      for (const p of trail) {
        const a = p.life / p.maxLife;
        paint.setColor(Skia.Color(p.color));
        paint.setAlphaf(a * 0.9);
        canvas.drawCircle(p.x, p.y, p.radius * (1.4 - a * 0.4), paint);
      }
    });
  });
  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      <Picture picture={picture} />
    </Canvas>
  );
}
