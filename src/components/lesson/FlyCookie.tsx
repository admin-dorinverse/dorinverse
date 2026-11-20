// The little cookie that flies up and away when a cookie is collected, toward Collections. It plays once (0.7 seconds)
// and then tells the card it's done. With less motion on the phone it just fades.

import { Image } from 'expo-image';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

/** How long the flight takes (ms), how far up it goes, and the cookie's size. */
const FLY_MS = 700;
const RISE = 280;
const SIZE = 56;

/** Props for the flying cookie. */
type FlyCookieProps = {
  /** Runs when the flight is over, to remove it. */
  onDone: () => void;
};

/** One flying cookie. */
export function FlyCookie({ onDone }: FlyCookieProps) {
  const still = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    t.set(
      withTiming(1, { duration: FLY_MS, easing: Easing.in(Easing.cubic) }, (finished) => {
        if (finished) scheduleOnRN(onDone);
      }),
    );
  }, [t, onDone]);
  const fly = useAnimatedStyle(() => {
    const p = t.get();
    if (still) return { opacity: 1 - p };
    return { opacity: 1 - p * p, transform: [{ translateY: -RISE * p }, { translateX: 40 * p }, { scale: 1 - 0.55 * p }, { rotate: `${200 * p}deg` }] };
  });
  return (
    <Animated.View pointerEvents="none" style={[styles.cookie, fly]}>
      <Image source={require('../../../assets/images/bakery-cookie.webp')} style={styles.image} contentFit="contain" />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cookie: { position: 'absolute', left: '50%', bottom: 0, width: SIZE, height: SIZE, marginLeft: -SIZE / 2 },
  image: { width: SIZE, height: SIZE },
});
