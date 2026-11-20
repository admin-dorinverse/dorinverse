// The Bakery TV set: a wooden frame around a screen in the playing program's colors, with its title, a progress bar
// and the time code. When the page opens the picture switches on like an old TV: it grows from a thin line and a
// bright flash fades. The bar and time code change once a second, as the page passes in a new time.

import { memo, useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Defs, Pattern, Rect } from 'react-native-svg';
import type { TvProgram } from '@/data/sample/bakeryTv';
import { bakeryTv, bakeryTvSize } from '@/theme/bakeryTvColors';
import { fonts } from '@/theme/text';
import { mmss } from './tvSchedule';

/** How long the switch-on takes (ms); the picture is full height after 60% of it. */
const SWITCH_ON_MS = 600;

/** Props for the TV. */
type TvScreenProps = {
  /** The program playing now. */
  program: TvProgram;
  /** Seconds since it started. */
  offset: number;
};

/** The TV with what is playing now. */
export function TvScreen({ program, offset }: TvScreenProps) {
  const still = useReducedMotion();
  const grow = useSharedValue(still ? 1 : 0.02);
  const flash = useSharedValue(still ? 0 : 0.7);

  // Switches the picture on once, when the page opens.
  useEffect(() => {
    if (still) return;
    grow.set(withTiming(1, { duration: SWITCH_ON_MS * 0.6, easing: Easing.out(Easing.quad) }));
    flash.set(withTiming(0, { duration: SWITCH_ON_MS, easing: Easing.out(Easing.quad) }));
  }, [still, grow, flash]);

  const picture = useAnimatedStyle(() => ({ transform: [{ scaleY: grow.get() }] }));
  const flashLook = useAnimatedStyle(() => ({ opacity: flash.get() }));
  const [c1, c2] = program.colors;

  return (
    <Animated.View style={[styles.screen, { backgroundImage: `linear-gradient(135deg, ${c1}, ${c2})` }, picture]}>
      <ScreenShine />
      <Text style={styles.title}>{program.title}</Text>
      <Text style={styles.line}>Now playing: {program.title} Overview</Text>
      <View style={styles.bar}>
        <View style={[styles.fill, { transform: [{ scaleX: Math.min(1, offset / program.seconds) }] }]} />
      </View>
      <Text style={[styles.line, styles.timeCode]}>
        {mmss(offset)} / {mmss(program.seconds)}
      </Text>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.flash, flashLook]} />
    </Animated.View>
  );
}

/** The screen's soft light from above and its faint lines, drawn once and never changed. */
const ScreenShine = memo(function ScreenShine() {
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.shine]}>
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern id="tvScanLines" width={4} height={4} patternUnits="userSpaceOnUse">
            <Rect width={4} height={2} fill={bakeryTv.scanLine} />
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#tvScanLines)" />
      </Svg>
    </View>
  );
});

const styles = StyleSheet.create({
  screen: {
    width: '100%',
    aspectRatio: bakeryTvSize.screenAspect,
    borderRadius: bakeryTvSize.screenRadius,
    overflow: 'hidden',
    borderWidth: bakeryTvSize.frame,
    borderColor: bakeryTv.frame,
    boxShadow: `0 0 0 ${bakeryTvSize.frameRing}px ${bakeryTv.frameRing}, 0 0 30px ${bakeryTv.frameGlow}`,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  shine: { backgroundImage: `radial-gradient(circle at 50% 40%, ${bakeryTv.screenShine}, rgba(0,0,0,0) 60%)` },
  title: {
    fontFamily: fonts.black,
    fontSize: bakeryTvSize.title,
    color: bakeryTv.screenText,
    textAlign: 'center',
    textShadowColor: bakeryTv.titleShadow,
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  line: { fontFamily: fonts.bold, fontSize: bakeryTvSize.line, color: bakeryTv.screenText, opacity: 0.9, textAlign: 'center' },
  bar: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: bakeryTvSize.barBottom,
    height: bakeryTvSize.bar,
    borderRadius: 3,
    overflow: 'hidden',
    backgroundColor: bakeryTv.barTrack,
  },
  fill: { flex: 1, borderRadius: 3, backgroundColor: bakeryTv.barFill, transformOrigin: 'left' },
  timeCode: { position: 'absolute', right: 16, bottom: 10, fontSize: bakeryTvSize.timeCode },
  flash: { backgroundColor: bakeryTv.screenText },
});
