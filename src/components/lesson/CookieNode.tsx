// One stop on the orbit view: the constellation's cookie, dough until the stop is baked and baked after. Only the
// first unbaked stop can be tapped; it glows and gently pulses. Every cookie bobs a little on the shared timer, and
// a stop that has just been baked gives one bounce as it turns into a baked cookie.

import { Image } from 'expo-image';
import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import type { CookieArt } from '@/components/common/cookieArt';
import { wave } from '@/components/common/motion';
import { playSound } from '@/components/common/sounds';
import type { AmbientClock } from '@/components/common/useAmbientClock';
import { mixColor } from '@/theme/mixColor';

/** How long one bob and one glow pulse take, from the design. */
const BOB_MS = 1200 * 2 * Math.PI;
const PULSE_MS = 1600;

/** How far a cookie bobs up and down. */
const BOB_PX = 4;

/** Props for a stop's cookie. */
type CookieNodeProps = {
  /** The stop's place in the lesson, from 0. */
  index: number;
  /** Where its center sits. */
  x: number;
  y: number;
  /** The cookie's size. */
  size: number;
  /** Whether it is baked, the next one to bake, or still locked. */
  state: 'baked' | 'next' | 'locked';
  /** The constellation's cookie pictures. */
  art: CookieArt;
  /** The constellation's color. */
  color: string;
  /** The page's shared timer. */
  clock: AmbientClock;
  /** Opens the stop. Only the next stop can be opened. */
  onOpen: (index: number) => void;
};

/** A stop's cookie on its orbit. */
export function CookieNode({ index, x, y, size, state, art, color, clock, onOpen }: CookieNodeProps) {
  const bounce = useSharedValue(1);
  const next = state === 'next';
  const bob = useAnimatedStyle(() => ({
    transform: [{ translateY: (wave(clock.time.get(), BOB_MS, index * 2.1 * 1200) - 0.5) * 2 * BOB_PX }, { scale: bounce.get() }],
  }));
  const pulse = useAnimatedStyle(() => {
    const w = next ? wave(clock.time.get(), PULSE_MS) : 0;
    return { opacity: next ? 0.65 + 0.35 * w : 0, transform: [{ scale: 0.9 + 0.32 * w }] };
  });
  const grow = useAnimatedStyle(() => ({ transform: [{ scale: next ? 1 + 0.08 * wave(clock.time.get(), PULSE_MS) : 1 }] }));

  // One bounce, once, when the stop turns baked.
  const baked = state === 'baked';
  const wasBaked = useRef(baked);
  useEffect(() => {
    if (!baked || wasBaked.current) return;
    wasBaked.current = true;
    playSound('collect');
    bounce.set(withSequence(withTiming(1.25, { duration: 250 }), withTiming(0.88, { duration: 300 }), withTiming(1, { duration: 350 })));
  }, [baked, bounce]);

  return (
    <Animated.View style={[styles.node, { left: x - size / 2, top: y - size / 2, width: size, height: size }, bob]}>
      <Animated.View
        pointerEvents="none"
        style={[styles.glow, { backgroundImage: `radial-gradient(circle, ${mixColor(color, 0.7)} 0%, rgba(0,0,0,0) 68%)` }, pulse]}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Cookie ${index + 1}${baked ? ', baked' : next ? ', ready to bake' : ', locked'}`}
        accessibilityState={{ disabled: !next }}
        disabled={!next}
        onPress={() => {
          playSound('tap');
          onOpen(index);
        }}
        style={StyleSheet.absoluteFill}
      >
        <Animated.View style={[StyleSheet.absoluteFill, grow]}>
          <Image source={baked ? art.baked : art.dough} style={[styles.picture, state === 'locked' && styles.locked]} contentFit="contain" />
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  node: { position: 'absolute' },
  glow: { position: 'absolute', left: -14, top: -14, right: -14, bottom: -14, borderRadius: 999 },
  picture: { width: '100%', height: '100%' },
  locked: { opacity: 0.38 },
});
