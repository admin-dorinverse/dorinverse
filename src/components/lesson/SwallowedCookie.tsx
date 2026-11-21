// A cookie being taken in by the rocket: it slides from its spot into the rocket (following it as it flies),
// shrinking and fading, once, then tells the rocket it is gone. Only moves and fades; nothing redraws.

import { Image } from 'expo-image';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

/** How long the cookie takes to go in. */
const SWALLOW_MS = 340;

/** Props for the cookie going in. */
type SwallowedCookieProps = {
  /** The baked cookie picture. */
  source: number;
  /** Its size. */
  size: number;
  /** Where it starts: its spot on the orbit. */
  fromX: number;
  fromY: number;
  /** Where it goes: the rocket, wherever it is. */
  toX: SharedValue<number>;
  toY: SharedValue<number>;
  /** Called once it is inside. */
  onIn: () => void;
};

/** The cookie sliding into the rocket. */
export function SwallowedCookie({ source, size, fromX, fromY, toX, toY, onIn }: SwallowedCookieProps) {
  const still = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    t.set(
      withTiming(1, { duration: still ? 0 : SWALLOW_MS, easing: Easing.in(Easing.quad) }, (done) => {
        if (done) scheduleOnRN(onIn);
      }),
    );
    // Runs once, when the cookie is collected.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const go = useAnimatedStyle(() => ({
    opacity: 1 - 0.8 * t.get(),
    transform: [{ translateX: (toX.get() - fromX) * t.get() }, { translateY: (toY.get() - fromY) * t.get() }, { scale: 1 - 0.85 * t.get() }],
  }));
  return (
    <Animated.View pointerEvents="none" style={[styles.cookie, { left: fromX - size / 2, top: fromY - size / 2, width: size, height: size }, go]}>
      <Image source={source} style={StyleSheet.absoluteFill} contentFit="contain" />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cookie: { position: 'absolute' },
});
