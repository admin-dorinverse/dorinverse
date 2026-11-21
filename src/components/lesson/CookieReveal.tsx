// A Quality Check cookie that shows the answer: a burnt one goes dark with smoke rising from it, a fresh one lights
// up with a warm glow behind it, grows a little, and gives off white steam. Darkening uses a dark copy cut to the
// cookie's own shape, so only the cookie changes, never the box around it. The change fades in once; the smoke and
// steam drift up on the page's shared timer (20 times a second, resting when the page is hidden).

import { Image } from 'expo-image';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import type { AmbientClock } from '@/components/common/useAmbientClock';
import { qualityColors } from '@/theme/lessonColors';

/** How long the cookie takes to change, and how long one puff takes to rise and fade. */
const CHANGE_MS = 450;
const PUFF_MS = 1700;

/** The three puffs: where each starts across the cookie (as a share of its size), and its head start. */
const PUFFS = [
  { x: -0.2, lead: 0 },
  { x: 0.05, lead: 0.36 },
  { x: 0.24, lead: 0.7 },
];

/** Whether the cookie turned out burnt or fresh, or is not checked yet. */
export type CookieVerdict = 'burnt' | 'fresh' | null;

/** Props for the cookie. */
type CookieRevealProps = {
  /** The baked cookie picture. */
  source: number;
  /** Its size. */
  size: number;
  /** What it turned out to be. */
  verdict: CookieVerdict;
  /** The page's shared timer. */
  clock: AmbientClock;
};

/** One puff of smoke or steam. */
function Puff({ size, x, lead, color, clock }: { size: number; x: number; lead: number; color: string; clock: AmbientClock }) {
  const puff = useAnimatedStyle(() => {
    const t = clock.still ? 0.4 : (clock.time.get() / PUFF_MS + lead) % 1;
    return { opacity: Math.sin(t * Math.PI) * 0.9, transform: [{ translateY: -t * size * 0.85 }, { scale: 0.6 + t * 0.9 }] };
  });
  const d = size * 0.5;
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.puff, { left: size / 2 + x * size - d / 2, top: size * 0.05, width: d, height: d, backgroundImage: `radial-gradient(circle, ${color} 0%, rgba(0,0,0,0) 68%)` }, puff]}
    />
  );
}

/** The cookie, burnt or fresh. */
export function CookieReveal({ source, size, verdict, clock }: CookieRevealProps) {
  const burnt = useSharedValue(0);
  const fresh = useSharedValue(0);
  useEffect(() => {
    burnt.set(withTiming(verdict === 'burnt' ? 1 : 0, { duration: CHANGE_MS }));
    fresh.set(withTiming(verdict === 'fresh' ? 1 : 0, { duration: CHANGE_MS }));
  }, [verdict, burnt, fresh]);
  const dark = useAnimatedStyle(() => ({ opacity: burnt.get() * qualityColors.charStrength }));
  const lit = useAnimatedStyle(() => ({ opacity: fresh.get() }));
  const grow = useAnimatedStyle(() => ({ transform: [{ scale: 1 + 0.06 * fresh.get() }] }));
  const picture = { width: size, height: size };
  return (
    <View style={[styles.wrap, picture]}>
      <Animated.View pointerEvents="none" style={[styles.glow, { backgroundImage: `radial-gradient(circle, ${qualityColors.glow} 0%, rgba(0,0,0,0) 70%)` }, lit]} />
      <Animated.View style={[picture, grow]}>
        <Image source={source} style={picture} contentFit="contain" />
        <Animated.View style={[StyleSheet.absoluteFill, dark]}>
          <Image source={source} style={picture} contentFit="contain" tintColor={qualityColors.char} />
        </Animated.View>
      </Animated.View>
      {verdict && PUFFS.map((p, i) => <Puff key={i} size={size} x={p.x} lead={p.lead} color={verdict === 'burnt' ? qualityColors.smoke : qualityColors.steam} clock={clock} />)}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  glow: { position: 'absolute', left: '-35%', top: '-35%', right: '-35%', bottom: '-35%', borderRadius: 999 },
  puff: { position: 'absolute', borderRadius: 999 },
});
