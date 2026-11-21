// The glowing circle left on a stop's spot once the rocket has taken its cookie, as in the Constellations design: a
// ring in the constellation's color with a bright dot in the middle. It grows in once, then its glow breathes on the
// page's shared timer (20 times a second, resting when the page is hidden).

import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, ZoomIn } from 'react-native-reanimated';
import { wave } from '@/components/common/motion';
import type { AmbientClock } from '@/components/common/useAmbientClock';

/** The ring's size, how it comes in, and how long one breath of its glow takes (from the design). */
const SIZE = 70;
const RING_IN = ZoomIn.duration(800).easing(Easing.out(Easing.quad));
const BREATH_MS = 2400;

/** Props for the ring. */
type DoneRingProps = {
  /** Its center. */
  x: number;
  y: number;
  /** The constellation's color. */
  color: string;
  /** The page's shared timer. */
  clock: AmbientClock;
};

/** A stop's done circle. */
export function DoneRing({ x, y, color, clock }: DoneRingProps) {
  const breathe = useAnimatedStyle(() => ({ opacity: 0.55 + 0.45 * wave(clock.time.get(), BREATH_MS) }));
  return (
    <Animated.View entering={RING_IN} pointerEvents="none" style={[styles.ring, { left: x - SIZE / 2, top: y - SIZE / 2, borderColor: color }]}>
      <Animated.View style={[styles.glow, { boxShadow: `0 0 16px ${color}, inset 0 0 16px ${color}` }, breathe]} />
      <View style={[styles.dot, { backgroundColor: color, boxShadow: `0 0 14px ${color}` }]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  ring: { position: 'absolute', width: SIZE, height: SIZE, borderRadius: SIZE / 2, borderWidth: 3 },
  glow: { position: 'absolute', left: -3, top: -3, right: -3, bottom: -3, borderRadius: SIZE / 2 },
  dot: { position: 'absolute', left: 19, top: 19, right: 19, bottom: 19, borderRadius: SIZE / 2 },
});
