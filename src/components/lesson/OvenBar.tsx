// The oven progress bar at the top of the player, as in the design: a cream bar that fills with heat as the stop goes
// on, and the constellation's dough riding along the heat's edge, turning into a baked cookie in four steps. Each
// change is one short slide or fade; nothing loops.

import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import type { CookieArt } from '@/components/common/cookieArt';
import { ovenColors } from '@/theme/lessonColors';

/** How long the heat takes to slide to its new spot. */
const SLIDE_MS = 450;

/** The space kept at each end of the bar, from the design. */
const END = 24;

/** The riding cookie's size. */
const COOKIE_W = 54;
const COOKIE_H = 40;

/** Props for the oven bar. */
type OvenBarProps = {
  /** How hot the oven is, 0 to 1. */
  heat: number;
  /** The constellation's cookie pictures. */
  art: CookieArt;
};

/** The oven bar. */
export function OvenBar({ heat, art }: OvenBarProps) {
  const [width, setWidth] = useState(0);
  const shown = useSharedValue(heat);
  const bump = useSharedValue(1);
  // The cookie browns in four steps: a quarter more baked at each quarter of the stop.
  const baked = useSharedValue(heat >= 1 ? 1 : Math.floor(heat * 4) / 4);
  useEffect(() => {
    shown.set(withTiming(heat, { duration: SLIDE_MS, easing: Easing.inOut(Easing.ease) }));
    baked.set(withTiming(heat >= 1 ? 1 : Math.floor(heat * 4) / 4, { duration: SLIDE_MS }));
    bump.set(withSequence(withTiming(1.15, { duration: 160 }), withTiming(1, { duration: 260 })));
  }, [heat, shown, baked, bump]);

  // The fill is a full-width strip slid left out of sight, so it only ever moves, never changes size.
  const fill = useAnimatedStyle(() => ({ transform: [{ translateX: END + (width - 2 * END) * shown.get() - width }] }));
  const ride = useAnimatedStyle(() => ({ transform: [{ translateX: END + (width - 2 * END) * shown.get() - COOKIE_W / 2 }, { scale: bump.get() }] }));
  const browned = useAnimatedStyle(() => ({ opacity: baked.get() }));

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel="Cookie baking progress"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(heat * 100) }}
      style={styles.bar}
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
    >
      <View style={styles.track}>
        {width > 0 && <Animated.View style={[styles.fill, { width }, fill]} />}
        <View pointerEvents="none" style={styles.shine} />
      </View>
      {width > 0 && (
        <Animated.View pointerEvents="none" style={[styles.cookie, ride]}>
          <Image source={art.dough} style={StyleSheet.absoluteFill} contentFit="contain" />
          <Animated.View style={[StyleSheet.absoluteFill, browned]}>
            <Image source={art.baked} style={StyleSheet.absoluteFill} contentFit="contain" />
          </Animated.View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flex: 1, height: 36, justifyContent: 'center' },
  track: {
    height: 36,
    borderRadius: 18,
    borderWidth: 3,
    borderColor: ovenColors.edge,
    overflow: 'hidden',
    backgroundImage: `linear-gradient(180deg, ${ovenColors.inside.join(', ')})`,
    boxShadow: `0 3px 0 ${ovenColors.shadow}`,
  },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 16, backgroundImage: `linear-gradient(90deg, ${ovenColors.heat[0]} 0%, ${ovenColors.heat[1]} 60%, ${ovenColors.heat[2]} 100%)` },
  shine: { position: 'absolute', left: 16, top: 5, width: '30%', height: 6, borderRadius: 6, backgroundColor: ovenColors.shine, transform: [{ skewX: '-24deg' }] },
  cookie: { position: 'absolute', left: 0, top: (36 - COOKIE_H) / 2 - 1, width: COOKIE_W, height: COOKIE_H },
});
