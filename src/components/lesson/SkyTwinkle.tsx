// The star a sent box becomes: it bursts in bright, settles, then twinkles softly on the page's shared timer (20
// times a second, resting when the page is hidden). Only grows, shrinks and fades.

import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { wave } from '@/components/common/motion';
import { useAmbientClock } from '@/components/common/useAmbientClock';
import { lessonSky } from '@/theme/lessonColors';

/** The star's size, and how long one soft twinkle takes. */
const SIZE = 44;
const TWINKLE_MS = 1800;

/** The twinkle only needs the calm 20 ticks a second. */
function calm(): boolean {
  'worklet';
  return false;
}

/** Props for the star. */
type SkyTwinkleProps = {
  /** Its center. */
  x: number;
  y: number;
  /** The constellation's color, for its glow. */
  color: string;
};

/** The new star. */
export function SkyTwinkle({ x, y, color }: SkyTwinkleProps) {
  const clock = useAmbientClock(calm);
  const burst = useSharedValue(0);
  useEffect(() => {
    burst.set(withSequence(withTiming(1.7, { duration: 280, easing: Easing.out(Easing.quad) }), withTiming(1, { duration: 520, easing: Easing.inOut(Easing.quad) })));
  }, [burst]);
  const star = useAnimatedStyle(() => {
    const soft = clock.still ? 1 : 0.7 + 0.3 * wave(clock.time.get(), TWINKLE_MS);
    return { opacity: Math.min(1, burst.get()) * soft, transform: [{ scale: burst.get() * (0.9 + 0.1 * soft) }] };
  });
  return (
    <Animated.View pointerEvents="none" style={[styles.star, { left: x - SIZE / 2, top: y - SIZE / 2, boxShadow: `0 0 18px ${color}` }, star]}>
      <Svg width={SIZE} height={SIZE} viewBox="-22 -22 44 44">
        <Path d="M0 -21 C2 -5 5 -2 21 0 C5 2 2 5 0 21 C-2 5 -5 2 -21 0 C-5 -2 -2 -5 0 -21Z" fill={lessonSky.white} />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  star: { position: 'absolute', width: SIZE, height: SIZE, borderRadius: SIZE / 2 },
});
