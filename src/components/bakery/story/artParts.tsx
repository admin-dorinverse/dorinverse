// Small pieces the story's pictures share: the picture's 220 by 160 stage, Papa Dorin standing in it, the gold
// twinkles, and the soft breathing glow. Every moving piece reads the page's shared timer.

import { Image } from 'expo-image';
import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { PAPA_DORIN } from '@/components/common/cookieArt';
import { mix, wave } from '@/components/common/motion';
import type { AmbientClock } from '@/components/common/useAmbientClock';
import { storyArt } from '@/theme/bakeryStoryColors';

/** The soft shadow the design puts under its pictures. */
export const artShadow = `drop-shadow(0 8px 8px ${storyArt.shadow})`;

/** Papa Dorin's picture is 300 by 688 pixels; this turns a height into his width. */
export const dorinWidth = (height: number) => Math.round((height * 300) / 688);

/** Props every chapter picture gets. */
export type ArtProps = {
  /** The page's shared timer. */
  clock: AmbientClock;
};

/** Props for the picture's stage. */
type StageProps = {
  /** What stands on the stage. */
  children: ReactNode;
  /** Changes to the stage, like a wider one or centered contents. */
  style?: StyleProp<ViewStyle>;
};

/** The 220 by 160 box each picture is drawn in, as in the design. */
export function Stage({ children, style }: StageProps) {
  return <View style={[styles.stage, style]}>{children}</View>;
}

/** Props for Papa Dorin standing on the stage. */
type DorinProps = {
  /** How tall he is drawn (150 in most pictures). */
  height?: number;
  /** Where he stands; by default at the bottom middle. */
  style?: StyleProp<ViewStyle>;
};

/** Papa Dorin standing at the bottom middle of the stage. */
export function StageDorin({ height = 150, style }: DorinProps) {
  return (
    <View style={[styles.dorinSpot, style]} pointerEvents="none">
      <Image source={PAPA_DORIN} style={{ width: dorinWidth(height), height, filter: artShadow }} contentFit="contain" />
    </View>
  );
}

/** The three twinkle spots from the design: [left or right edge, top, size, wait in ms]. */
const SPARKLES = {
  s1: { left: 24, top: 20, size: 22, delay: 0 },
  s2: { right: 30, top: 10, size: 16, delay: 600 },
  s3: { left: 110, top: 0, size: 14, delay: 1200 },
} as const;

/** Props for one twinkle. */
type SparkleProps = ArtProps & {
  /** Which of the design's three spots it sits in. */
  spot: keyof typeof SPARKLES;
};

/** A gold ✦ that dims, shrinks and turns a little every 2 seconds. */
export function Sparkle({ clock, spot }: SparkleProps) {
  const { size, delay, ...place } = SPARKLES[spot];
  const twinkle = useAnimatedStyle(() => {
    const w = clock.still ? 0 : wave(clock.time.get(), 2000, -delay);
    return { opacity: mix(w, 1, 0.25), transform: [{ scale: mix(w, 1, 0.7) }, { rotate: `${mix(w, 0, 30)}deg` }] };
  });
  return <Animated.Text style={[styles.sparkle, place, { fontSize: size, lineHeight: size * 1.2 }, twinkle]}>✦</Animated.Text>;
}

/** Props for the breathing glow. */
type GlowProps = ArtProps & {
  /** Its width and height. */
  size: number;
  /** Its colors from the middle out, with where each stops (0 to 100). */
  stops: readonly (readonly [string, number])[];
};

/** A round soft glow in the middle of the stage that grows a little and back every 3 seconds. */
export function Glow({ clock, size, stops }: GlowProps) {
  const breath = useAnimatedStyle(() => ({ transform: [{ scale: mix(clock.still ? 0 : wave(clock.time.get(), 3000), 1, 1.08) }] }));
  const gradient = `radial-gradient(circle, ${stops.map(([c, at]) => `${c} ${at}%`).join(', ')})`;
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.glow, { width: size, height: size, borderRadius: size / 2, marginLeft: -size / 2, marginTop: -size / 2, backgroundImage: gradient }, breath]}
    />
  );
}

/** The warm glow's colors, as in the design. */
export const GLOW_STOPS = [
  [storyArt.glowMiddle, 0],
  [storyArt.glowRing, 35],
  [storyArt.glowClear, 70],
] as const;

const styles = StyleSheet.create({
  stage: { width: 220, height: 160 },
  dorinSpot: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center' },
  sparkle: { position: 'absolute', color: storyArt.sparkle },
  glow: { position: 'absolute', left: '50%', top: '50%' },
});
