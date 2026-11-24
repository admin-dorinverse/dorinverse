// The Bakery TV set: a wooden frame around the screen. The screen holds the video playing now, or, in the short
// gap between videos, a card in the next video's colors saying what comes next. When the page opens the picture
// switches on like an old TV: it grows from a thin line and a bright flash fades.

import { memo, useEffect, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Defs, Pattern, Rect } from 'react-native-svg';
import { bakeryTv, bakeryTvSize } from '@/theme/bakeryTvColors';
import { fonts } from '@/theme/text';

/** How long the switch-on takes (ms); the picture is full height after 60% of it. */
const SWITCH_ON_MS = 600;

/** Props for the TV. */
type TvScreenProps = {
  /** The video player, while a video plays. Without it the screen shows the card below. */
  player?: ReactNode;
  /** The card's gradient, top-left then bottom-right. */
  colors: readonly [string, string];
  /** The card's big title. */
  title: string;
  /** The card's small line under the title. */
  line: string;
};

/** The TV. */
export function TvScreen({ player, colors, title, line }: TvScreenProps) {
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

  return (
    <Animated.View style={[styles.screen, picture]}>
      {player ? (
        <View style={styles.player}>{player}</View>
      ) : (
        <View style={[styles.card, { backgroundImage: `linear-gradient(135deg, ${colors[0]}, ${colors[1]})` }]}>
          <ScreenShine />
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.line}>{line}</Text>
        </View>
      )}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.flash, flashLook]} />
    </Animated.View>
  );
}

/** The card's soft light from above and its faint lines, drawn once and never changed. */
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
    backgroundColor: bakeryTv.screenOff,
    boxShadow: `0 0 0 ${bakeryTvSize.frameRing}px ${bakeryTv.frameRing}, 0 0 30px ${bakeryTv.frameGlow}`,
  },
  player: { flex: 1 },
  card: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
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
  flash: { backgroundColor: bakeryTv.screenText },
});
