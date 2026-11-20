// The story's pictures of heavenly things, as in the design: the angel with beating wings, the gold cookie box for
// the great celebration, the cookie planet floating among twinkles, and the open Word with the six cutter kids.

import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import Svg, { Circle, Defs, Path, RadialGradient, Stop } from 'react-native-svg';
import { mix, wave } from '@/components/common/motion';
import { storyArt } from '@/theme/bakeryStoryColors';
import { artShadow, Glow, GLOW_STOPS, Sparkle, Stage, type ArtProps } from './artParts';
import { KidsRow } from './KidsRow';

/** The angel's left and right wings, in its 200 by 140 drawing. */
const WING_LEFT = 'M96 74 C70 40 40 34 14 44 C34 52 44 62 50 76 C38 76 28 82 22 92 C46 90 70 92 96 80Z';
const WING_RIGHT = 'M104 74 C130 40 160 34 186 44 C166 52 156 62 150 76 C162 76 172 82 178 92 C154 90 130 92 104 80Z';

/** How long one wing beat takes (ms). */
const WING_MS = 2400;

/** One wing, turning up a little and back from where it meets the light. */
function Wing({ clock, path, turn, origin }: ArtProps & { path: string; turn: number; origin: string }) {
  const beat = useAnimatedStyle(() => ({ transform: [{ rotate: `${mix(clock.still ? 0 : wave(clock.time.get(), WING_MS), 0, turn)}deg` }] }));
  return (
    <Animated.View style={[StyleSheet.absoluteFill, { transformOrigin: origin }, beat]}>
      <Svg width={200} height={140} viewBox="0 0 200 140">
        <Path d={path} fill={storyArt.wing} opacity={0.95} />
      </Svg>
    </Animated.View>
  );
}

/** Chapters 10 and 11: the angel, a ball of light with wings, in a warm glow. */
export function AngelArt({ clock }: ArtProps) {
  return (
    <Stage style={styles.center}>
      <Glow clock={clock} size={240} stops={GLOW_STOPS} />
      <View style={styles.angel}>
        <Wing clock={clock} path={WING_LEFT} turn={-8} origin="96px 76px" />
        <Wing clock={clock} path={WING_RIGHT} turn={8} origin="104px 76px" />
        <Svg width={200} height={140} viewBox="0 0 200 140" style={StyleSheet.absoluteFill}>
          <Defs>
            <RadialGradient id="storyAngelLight">
              <Stop offset="0" stopColor={storyArt.angelWhite} />
              <Stop offset="0.5" stopColor={storyArt.angelPale} />
              <Stop offset="1" stopColor={storyArt.angelGold} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={100} cy={74} r={34} fill="url(#storyAngelLight)" />
        </Svg>
      </View>
    </Stage>
  );
}

/** The cookie box pictures are 132 by 110 pixels; this turns a width into a height. */
const boxHeight = (width: number) => Math.round((width * 110) / 132);

/** The halo's colors behind the boxes. */
const HALO_STOPS = [
  [storyArt.halo, 0],
  [storyArt.glowClear, 65],
] as const;

/** Chapter 12: the gold cookie box floating in a halo, with two boxes beside it and twinkles above. */
export function FeastArt({ clock }: ArtProps) {
  const float = useAnimatedStyle(() => ({ transform: [{ translateY: mix(clock.still ? 0 : wave(clock.time.get(), 3400), 0, -14) }] }));
  return (
    <Stage>
      <Glow clock={clock} size={200} stops={HALO_STOPS} />
      <Animated.View style={[styles.goldBox, float]}>
        <Image source={require('../../../../assets/images/boxes/box-gold.webp')} style={styles.goldBoxImage} contentFit="contain" />
      </Animated.View>
      <Image source={require('../../../../assets/images/boxes/box-1.webp')} style={[styles.sideBox, styles.leftBox]} contentFit="contain" />
      <Image source={require('../../../../assets/images/boxes/box-2.webp')} style={[styles.sideBox, styles.rightBox]} contentFit="contain" />
      <Sparkle clock={clock} spot="s1" />
      <Sparkle clock={clock} spot="s2" />
      <Sparkle clock={clock} spot="s3" />
    </Stage>
  );
}

/** The cookie planet picture is 750 by 1170 pixels; it is drawn 160 tall. */
const PLANET_H = 160;
const PLANET_W = Math.round((PLANET_H * 750) / 1170);

/** Chapter 15: the cookie planet floating up and down, among twinkles. */
export function PlanetArt({ clock }: ArtProps) {
  const float = useAnimatedStyle(() => ({ transform: [{ translateY: mix(clock.still ? 0 : wave(clock.time.get(), 4000), 0, -14) }] }));
  return (
    <Stage style={styles.row}>
      <Sparkle clock={clock} spot="s1" />
      <Sparkle clock={clock} spot="s2" />
      <Sparkle clock={clock} spot="s3" />
      <Animated.View style={float}>
        <Image source={require('../../../../assets/images/bakery-cookie.webp')} style={styles.planet} contentFit="contain" />
      </Animated.View>
    </Stage>
  );
}

/** Chapter 16: the open Word, with the six cutter kids under it. */
export function WordArt({ clock }: ArtProps) {
  return (
    <Stage style={styles.word}>
      <Svg width={84} height={72} viewBox="0 0 64 56" style={styles.book}>
        <Path d="M4 12 L32 16 L60 12 L60 48 L32 52 L4 48 Z" fill={storyArt.bookCover} />
        <Path d="M7 9 C16 7 25 8 31 13 L31 47 C25 43 16 42 7 44 Z" fill={storyArt.bookPage} stroke={storyArt.bookEdge} />
        <Path d="M57 9 C48 7 39 8 33 13 L33 47 C39 43 48 42 57 44 Z" fill={storyArt.bookPage} stroke={storyArt.bookEdge} />
      </Svg>
      <KidsRow clock={clock} named={false} />
    </Stage>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', justifyContent: 'center' },
  angel: { width: 200, height: 140 },
  goldBox: { position: 'absolute', left: 55, top: 40 },
  goldBoxImage: { width: 110, height: boxHeight(110), filter: artShadow },
  sideBox: { position: 'absolute', width: 62, height: boxHeight(62), filter: artShadow },
  leftBox: { left: 6, top: 86, transform: [{ rotate: '-10deg' }] },
  rightBox: { right: 6, top: 84, transform: [{ rotate: '9deg' }] },
  planet: { width: PLANET_W, height: PLANET_H, filter: `drop-shadow(0 10px 12px ${storyArt.shadow})` },
  word: { width: 300, alignItems: 'center', gap: 6 },
  book: { filter: artShadow },
});
