// The story's pictures of Papa Dorin himself, as in the design: with his 25¢ sticker, standing over his kids, worn
// down, saying "Hey, friend.", made new with a shine sweeping over him, and happy at the end in a warm glow.

import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, withDelay, withTiming, type EntryAnimationsValues } from 'react-native-reanimated';
import { PAPA_DORIN } from '@/components/common/cookieArt';
import { easeInOut, loop, mix, wave } from '@/components/common/motion';
import { storyArt } from '@/theme/bakeryStoryColors';
import { fonts } from '@/theme/text';
import { dorinWidth, Glow, GLOW_STOPS, Sparkle, Stage, StageDorin, type ArtProps } from './artParts';
import { KidsRow } from './KidsRow';

/** Papa Dorin's usual height in the pictures, and his width at that height. */
const DORIN_H = 150;
const DORIN_W = dorinWidth(DORIN_H);

/** Chapter 1: Papa Dorin with a 25¢ price sticker swinging from him. */
export function PriceArt({ clock }: ArtProps) {
  const swing = useAnimatedStyle(() => ({ transform: [{ rotate: `${mix(clock.still ? 0.5 : wave(clock.time.get(), 2400), -8, 8)}deg` }] }));
  return (
    <Stage>
      <StageDorin />
      <Animated.Text style={[styles.tag, swing]}>25¢</Animated.Text>
    </Stage>
  );
}

/** Chapter 3: a small Papa Dorin standing over his six cutter kids. */
export function CuttersArt({ clock }: ArtProps) {
  return (
    <Stage>
      <StageDorin height={96} style={styles.atTop} />
      <View style={styles.kidsUnder}>
        <KidsRow clock={clock} named={false} />
      </View>
    </Stage>
  );
}

/** Chapter 5: Papa Dorin worn down, blurry and faded. The design's gray-and-sepia filter is a see-through tint here. */
export function WornArt() {
  const size = { width: DORIN_W, height: DORIN_H };
  return (
    <Stage>
      <View style={[styles.wornSpot, size]}>
        <Image source={PAPA_DORIN} style={size} contentFit="contain" blurRadius={1.6} />
        <Image source={PAPA_DORIN} style={[StyleSheet.absoluteFill, styles.wornTint]} contentFit="contain" blurRadius={1.6} tintColor={storyArt.wornTint} />
      </View>
    </Stage>
  );
}

/** How the "Hey, friend." bubble pops in: up from a little lower, after a short wait. */
function bubbleIn(_: EntryAnimationsValues) {
  'worklet';
  const move = { duration: 600, easing: Easing.bezier(0.25, 0.1, 0.25, 1) };
  return {
    initialValues: { opacity: 0, transform: [{ translateY: 10 }, { scale: 0.98 }] },
    animations: {
      opacity: withDelay(300, withTiming(1, move)),
      transform: [{ translateY: withDelay(300, withTiming(0, move)) }, { scale: withDelay(300, withTiming(1, move)) }],
    },
  };
}

/** Chapter 8: Papa Dorin welcoming the scared can opener. */
export function FriendArt() {
  return (
    <Stage>
      <StageDorin style={styles.leftOfMiddle} />
      <Animated.Text entering={bubbleIn} style={styles.bubble}>
        Hey, friend.
      </Animated.Text>
    </Stage>
  );
}

/** How wide the shine's bright band is, and how long one sweep takes (ms). */
const SHINE_W = 26;
const SHINE_MS = 2400;

/** Chapter 13: Papa Dorin with a bright band sweeping across him, and two twinkles. */
export function NewArt({ clock }: ArtProps) {
  // The band's left edge, measured from Papa Dorin's left, runs from well before him to well past him.
  const bandX = () => {
    'worklet';
    return mix(easeInOut(clock.still ? 0 : loop(clock.time.get(), SHINE_MS)), -102 - SHINE_W / 2, 168 - SHINE_W / 2);
  };
  const band = useAnimatedStyle(() => ({ transform: [{ translateX: bandX() }] }));
  const picture = useAnimatedStyle(() => ({ transform: [{ translateX: -bandX() }] }));
  return (
    <Stage>
      <StageDorin />
      <View style={styles.shineSpot} pointerEvents="none">
        <Animated.View style={[styles.band, band]}>
          {/* Papa Dorin again, all white, seen only through the band: the shine follows his outline. */}
          <Animated.View style={picture}>
            <Image source={PAPA_DORIN} style={styles.shineDorin} contentFit="contain" tintColor={storyArt.shine} />
          </Animated.View>
        </Animated.View>
      </View>
      <Sparkle clock={clock} spot="s1" />
      <Sparkle clock={clock} spot="s2" />
    </Stage>
  );
}

/** Chapter 17: Papa Dorin, found, swaying happily in a warm glow. */
export function FoundArt({ clock }: ArtProps) {
  const sway = useAnimatedStyle(() => ({ transform: [{ rotate: `${mix(clock.still ? 0.5 : wave(clock.time.get(), 3500), -2, 2)}deg` }] }));
  return (
    <Stage>
      <Glow clock={clock} size={240} stops={GLOW_STOPS} />
      <Animated.View style={[StyleSheet.absoluteFill, styles.swayOrigin, sway]}>
        <StageDorin />
      </Animated.View>
    </Stage>
  );
}

const styles = StyleSheet.create({
  tag: {
    position: 'absolute',
    left: '58%',
    top: 62,
    backgroundColor: storyArt.tagPaper,
    borderWidth: 2,
    borderColor: storyArt.tagRed,
    color: storyArt.tagRed,
    fontFamily: fonts.black,
    fontSize: 18,
    paddingVertical: 3,
    paddingHorizontal: 9,
    borderRadius: 6,
    transformOrigin: 'left top',
    boxShadow: `0 4px 6px ${storyArt.tagShadow}`,
  },
  atTop: { top: 0 },
  kidsUnder: { position: 'absolute', left: -30, right: -30, bottom: 0 },
  wornSpot: { position: 'absolute', bottom: 0, left: (220 - DORIN_W) / 2, opacity: 0.85 },
  wornTint: { opacity: 0.45 },
  leftOfMiddle: { left: '22%', alignItems: 'flex-start' },
  bubble: {
    position: 'absolute',
    right: 0,
    top: 20,
    backgroundColor: storyArt.bubble,
    borderWidth: 2,
    borderColor: storyArt.bubbleEdge,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    overflow: 'hidden',
    fontFamily: fonts.black,
    fontSize: 16,
    color: storyArt.bubbleText,
  },
  shineSpot: { position: 'absolute', bottom: 0, left: (220 - DORIN_W) / 2, width: DORIN_W, height: DORIN_H, overflow: 'hidden', opacity: 0.6 },
  band: { position: 'absolute', top: 0, left: 0, width: SHINE_W, height: DORIN_H, overflow: 'hidden' },
  shineDorin: { width: DORIN_W, height: DORIN_H },
  swayOrigin: { transformOrigin: '50% 100%' },
});
