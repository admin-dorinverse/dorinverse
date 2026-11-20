// A collectible cookie's name inside Papa Dorin's words: amber on a soft rounded gold tint, with a small sparkle after
// it that twinkles and bobs so it looks tappable. Tapping it opens the cookie's quick look. The sparkle moves with the
// card's shared timer (20 times a second), and holds still when the phone asks for less motion.

import { Pressable, StyleSheet, Text, View, type TextStyle } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import type { AmbientClock } from '@/components/common/useAmbientClock';
import { cookieWord } from '@/theme/lessonColors';
import { fonts } from '@/theme/text';

/** How long one twinkle takes (ms). */
const TWINKLE_MS = 1600;

/** Props for a cookie word. */
type CookieWordProps = {
  /** The name, as written in the card. */
  text: string;
  /** The card's text style, so the name matches the words around it. */
  style: TextStyle;
  /** The card's shared timer. */
  clock: AmbientClock;
  /** Opens the cookie's quick look. */
  onPress: () => void;
};

/** The sparkle after the name. */
export function Sparkle({ clock, size }: { clock: AmbientClock; size: number }) {
  const twinkle = useAnimatedStyle(() => {
    if (clock.still) return {};
    const t = (clock.time.get() % TWINKLE_MS) / TWINKLE_MS;
    const wave = 0.5 - 0.5 * Math.cos(t * Math.PI * 2);
    return { opacity: 0.65 + 0.35 * wave, transform: [{ translateY: -1.5 * wave }, { scale: 0.85 + 0.3 * wave }] };
  });
  return <Animated.Text style={[styles.spark, { fontSize: size, lineHeight: size * 1.2 }, twinkle]}>✦</Animated.Text>;
}

/** A tappable cookie name. */
export function CookieWord({ text, style, clock, onPress }: CookieWordProps) {
  const size = (style.fontSize ?? 17) * 0.62;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${text}, a cookie to collect`} onPress={onPress} hitSlop={6}>
      <View style={styles.pill}>
        <Text style={[style, styles.name]}>{text}</Text>
        <Sparkle clock={clock} size={size} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: { flexDirection: 'row', alignItems: 'center', gap: 2, borderRadius: 7, paddingHorizontal: 4, backgroundColor: cookieWord.tint, borderWidth: 1, borderColor: cookieWord.edge },
  name: { fontFamily: fonts.extraBold, color: cookieWord.text },
  spark: { fontFamily: fonts.black, color: cookieWord.spark },
});
