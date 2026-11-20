// The story's kitchen and drawer pictures, as in the design: three warm cookies with steam rising, the junk in the
// drawer rocking gently, and the takeout menu with a stubby pencil writing on it.

import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import Svg, { Path, Rect } from 'react-native-svg';
import { cookieArtFor } from '@/components/common/cookieArt';
import { easeOut, loop, mix, wave } from '@/components/common/motion';
import { storyArt } from '@/theme/bakeryStoryColors';
import { fonts } from '@/theme/text';
import { artShadow, Stage, type ArtProps } from './artParts';

/** The three cookies: which constellation's cookie, how far from the left, and how far up. */
const BATCH = [
  ['stories', 8, 16],
  ['poems', 72, 30],
  ['sermons', 136, 16],
] as const;

/** The three steam puffs over a cookie: [left of the middle in px, wait in ms]. */
const PUFFS = [
  [-9, 0],
  [-16, 850],
  [-2, 1700],
] as const;

/** How long one puff takes to rise and vanish (ms), and the puff's size (the design's blur is a soft edge here). */
const PUFF_MS = 2600;
const PUFF = 28;

/** The cookie pictures are 200 by 199 pixels; each is drawn 76 wide. */
const COOKIE_W = 76;
const COOKIE_H = Math.round((COOKIE_W * 199) / 200);

/** One steam puff rising from a cookie, growing and fading as it goes. */
function Puff({ clock, left, delay }: ArtProps & { left: number; delay: number }) {
  const rise = useAnimatedStyle(() => {
    const now = clock.time.get();
    if (clock.still || now < delay) return { opacity: 0 };
    const p = loop(now, PUFF_MS, delay);
    const e = easeOut(p);
    const opacity = p < 0.15 ? 0.75 * easeOut(p / 0.15) : 0.75 * (1 - easeOut((p - 0.15) / 0.85));
    return { opacity, transform: [{ translateX: 6 * e }, { translateY: -62 * e }, { scale: mix(e, 0.5, 1.9) }] };
  });
  return <Animated.View style={[styles.puff, { left: left - (PUFF - 18) / 2 }, rise]} />;
}

/** Chapter 2: three warm cookies, steaming. */
export function BatchArt({ clock }: ArtProps) {
  return (
    <Stage>
      {BATCH.map(([id, left, bottom]) => (
        <View key={id} style={[styles.cookie, { left, bottom }]}>
          <Image source={cookieArtFor(id).baked} style={styles.cookieImage} contentFit="contain" />
          <View style={styles.steam}>
            {PUFFS.map(([x, delay]) => (
              <Puff key={delay} clock={clock} left={x} delay={delay} />
            ))}
          </View>
        </View>
      ))}
    </Stage>
  );
}

/** The junk in the drawer: a key, batteries, a birthday candle, a receipt, a rubber band, a coupon. */
const JUNK = ['🔑', '🔋', '🕯️', '🧾', '➰', '📜', '🔋'] as const;

/** Chapter 7: the junk in the drawer, each piece bobbing and rocking a little out of step with the next. */
export function JunkArt({ clock }: ArtProps) {
  return (
    <Stage>
      {JUNK.map((emoji, i) => (
        <JunkPiece key={i} clock={clock} emoji={emoji} index={i} />
      ))}
    </Stage>
  );
}

/** One piece of junk, scattered by its place in the list. */
function JunkPiece({ clock, emoji, index }: ArtProps & { emoji: string; index: number }) {
  const rock = useAnimatedStyle(() => {
    const w = clock.still ? 0 : wave(clock.time.get(), 3000, index * 400);
    return { transform: [{ translateY: mix(w, 0, -8) }, { rotate: `${mix(w, -6, 6)}deg` }] };
  });
  return <Animated.Text style={[styles.junk, { left: 14 + index * 28, top: 40 + ((index * 37) % 60) }, rock]}>{emoji}</Animated.Text>;
}

/** How long one pencil stroke takes, there and back (ms). */
const PEN_MS = 1600;

/** Chapter 14: the takeout menu, tilted, with the pencil writing on it. */
export function NoteArt({ clock }: ArtProps) {
  const write = useAnimatedStyle(() => {
    const w = clock.still ? 0 : wave(clock.time.get(), PEN_MS);
    return { transform: [{ rotate: '-30deg' }, { translateX: mix(w, 0, -10) }, { translateY: mix(w, 0, 4) }] };
  });
  return (
    <Stage style={styles.center}>
      <View style={styles.menu}>
        <Text style={styles.menuTitle}>TAKEOUT MENU</Text>
        <View style={styles.menuLine} />
        <View style={styles.menuLine} />
        <View style={styles.menuLine} />
      </View>
      <Animated.View style={[styles.pencil, write]}>
        <Svg width={120} height={20} viewBox="0 0 120 20">
          <Rect x={10} y={5} width={86} height={10} fill={storyArt.pencil} stroke={storyArt.pencilEdge} />
          <Path d="M96 5 L114 10 L96 15 Z" fill={storyArt.pencilTip} stroke={storyArt.pencilEdge} />
          <Rect x={2} y={5} width={10} height={10} fill={storyArt.eraser} stroke={storyArt.pencilEdge} />
        </Svg>
      </Animated.View>
    </Stage>
  );
}

const styles = StyleSheet.create({
  cookie: { position: 'absolute', width: COOKIE_W, height: COOKIE_H },
  cookieImage: { width: COOKIE_W, height: COOKIE_H, filter: artShadow },
  steam: { position: 'absolute', left: '50%', top: '6%', width: 0, height: 0 },
  puff: {
    position: 'absolute',
    top: -(PUFF - 18) / 2,
    width: PUFF,
    height: PUFF,
    borderRadius: PUFF / 2,
    backgroundImage: `radial-gradient(circle, ${storyArt.steam} 0%, ${storyArt.steam} 30%, ${storyArt.steamClear} 70%)`,
  },
  junk: {
    position: 'absolute',
    fontSize: 34,
    lineHeight: 42,
    textShadowColor: storyArt.junkShadow,
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 4,
  },
  center: { alignItems: 'center', justifyContent: 'center' },
  menu: {
    width: 130,
    height: 150,
    backgroundColor: storyArt.menuPaper,
    borderWidth: 1,
    borderColor: storyArt.menuEdge,
    borderRadius: 4,
    transform: [{ rotate: '-6deg' }],
    padding: 12,
    gap: 9,
    boxShadow: `0 10px 16px -8px ${storyArt.menuShadow}`,
  },
  menuTitle: { fontFamily: fonts.black, fontSize: 11, color: storyArt.menuRed, letterSpacing: 1 },
  menuLine: { height: 6, borderRadius: 3, backgroundColor: storyArt.menuLine },
  pencil: { position: 'absolute', right: 4, bottom: 24, width: 120, height: 20 },
});
