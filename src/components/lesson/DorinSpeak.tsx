// Papa Dorin speaking, as in the design: a cream speech bubble that pops in, and Papa Dorin under it who hops in and
// gives a few little "talking" wiggles, more for longer lines, then stands still. Every move plays once; nothing loops.

import { Image } from 'expo-image';
import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, FadeInDown, ZoomIn, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withTiming } from 'react-native-reanimated';
import { PAPA_DORIN, sharpDorinHeight } from '@/components/common/cookieArt';
import { cream } from '@/theme/lessonColors';

/** How the bubble and Papa Dorin come in. */
const BUBBLE_IN = FadeInDown.duration(450).easing(Easing.out(Easing.back(1.2)));
const DORIN_IN = ZoomIn.duration(550).easing(Easing.out(Easing.back(1.5)));

/** One talking wiggle, from the design. */
const TALK_MS = 340;

/** Props for Papa Dorin speaking. */
type DorinSpeakProps = {
  /** What is in the bubble. */
  children: ReactNode;
  /** How long his line is, in letters; longer lines get a few more wiggles. */
  length: number;
  /** Papa Dorin's height (smaller on short screens). */
  height: number;
};

/** The bubble and Papa Dorin. */
export function DorinSpeak({ children, length, height }: DorinSpeakProps) {
  const h = sharpDorinHeight(height);
  const talk = useSharedValue(0);
  const still = useReducedMotion();
  useEffect(() => {
    if (still) return;
    const wiggles = Math.max(4, Math.min(16, Math.round(length / 14))) * 2;
    talk.set(withDelay(550, withRepeat(withTiming(1, { duration: TALK_MS, easing: Easing.inOut(Easing.ease) }), wiggles, true)));
  }, [length, still, talk]);
  const wiggle = useAnimatedStyle(() => ({
    transform: [{ scaleX: 1 + 0.025 * talk.get() }, { scaleY: 1 - 0.025 * talk.get() }, { rotate: `${-1.5 * talk.get()}deg` }],
  }));
  return (
    <View style={styles.wrap}>
      <Animated.View entering={BUBBLE_IN} style={styles.bubble}>
        {children}
        <View style={styles.tail} />
      </Animated.View>
      <Animated.View entering={DORIN_IN} style={[styles.dorin, { height: h, width: Math.round((h * 300) / 688) }]}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.pivot, wiggle]}>
          <Image source={PAPA_DORIN} style={StyleSheet.absoluteFill} contentFit="contain" accessibilityLabel="Papa Dorin" />
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'flex-start', paddingTop: 4 },
  bubble: { alignSelf: 'stretch', borderRadius: 22, paddingTop: 18, paddingHorizontal: 18, paddingBottom: 16, backgroundColor: cream.card, boxShadow: '0 10px 26px rgba(0,0,0,0.35)' },
  tail: { position: 'absolute', left: 52, bottom: -12, width: 24, height: 24, backgroundColor: cream.card, transform: [{ rotate: '45deg' }], borderBottomRightRadius: 4 },
  dorin: { marginTop: 20, marginLeft: 22 },
  pivot: { transformOrigin: '50% 100%' },
});
