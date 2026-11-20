// One of the four bright cards in Papa Dorin's Bakery, as in the design: a glassy card tinted in its colors, a round
// picture, its name and a short line. A soft shine sweeps across each card in turn, every 7 seconds.

import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { playSound } from '@/components/common/sounds';
import type { AmbientClock } from '@/components/common/useAmbientClock';
import { bakeryRoom } from '@/theme/bakeryColors';
import { mixColor } from '@/theme/mixColor';
import { fonts } from '@/theme/text';

/** How long one shine cycle takes, and how far apart the four cards' shines are (ms). */
const SHINE_MS = 7000;
const SHINE_GAP_MS = 1750;

/** Props for an option card. */
type BakeryOptionProps = {
  /** The card's name, like "Bakery TV". */
  title: string;
  /** Its short line, like "See what's on right now". */
  line: string;
  /** Its light and deep colors. */
  colors: readonly [string, string];
  /** Its place among the four cards, which sets when its shine passes. */
  index: number;
  /** The page's shared timer. */
  clock: AmbientClock;
  /** Opens it. */
  onPress: () => void;
  /** Its round picture's inside. */
  children: ReactNode;
};

/** One option card. */
export function BakeryOption({ title, line, colors, index, clock, onPress, children }: BakeryOptionProps) {
  const [light, deep] = colors;
  // The shine waits for 70% of its cycle, then sweeps across, as in the design's bkShine.
  const shine = useAnimatedStyle(() => {
    if (clock.still) return { opacity: 0 };
    const p = (((clock.time.get() - index * SHINE_GAP_MS) % SHINE_MS) + SHINE_MS) % SHINE_MS / SHINE_MS;
    const f = p < 0.7 ? 0 : p > 0.9 ? 1 : (p - 0.7) / 0.2;
    return { opacity: f > 0 && f < 1 ? 1 : 0, left: `${-70 + 210 * f}%` };
  });
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${line}`}
      onPress={() => {
        playSound('tap');
        onPress();
      }}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundImage: `radial-gradient(120% 90% at 100% 100%, ${mixColor(deep, 0.38, 'rgba(255,255,255,0)')}, rgba(255,255,255,0) 60%), linear-gradient(160deg, rgba(255,255,255,0.78), rgba(255,255,255,0.38))`,
          boxShadow: `inset 0 1px 0 #ffffff, inset 0 -14px 22px -14px ${mixColor(deep, 0.7, 'rgba(255,255,255,0)')}, 0 0 0 1px ${bakeryRoom.bubbleRing}, 0 16px 28px -16px ${bakeryRoom.shadow}`,
        },
        pressed && styles.pressed,
      ]}
    >
      <View pointerEvents="none" style={styles.gloss} />
      <Animated.View pointerEvents="none" style={[styles.shine, shine]} />
      <View style={[styles.art, { backgroundImage: `radial-gradient(circle at 35% 30%, #ffffff, ${light} 55%, ${deep})` }]}>{children}</View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.line}>{line}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: bakeryRoom.bubbleEdge,
    overflow: 'hidden',
  },
  pressed: { transform: [{ translateY: 4 }] },
  gloss: {
    position: 'absolute',
    left: '8%',
    right: '8%',
    top: 5,
    height: '34%',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    backgroundImage: 'linear-gradient(180deg, rgba(255,255,255,0.85), rgba(255,255,255,0))',
  },
  shine: { position: 'absolute', top: '-20%', bottom: '-20%', width: '40%', backgroundImage: `linear-gradient(100deg, rgba(255,255,255,0), ${bakeryRoom.shine}, rgba(255,255,255,0))`, transform: [{ skewX: '-18deg' }] },
  art: {
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: 'inset 0 -4px 0 rgba(0,0,0,0.08), inset 0 2px 0 rgba(255,255,255,0.8)',
  },
  title: { fontFamily: fonts.black, fontSize: 16, lineHeight: 19, textAlign: 'center', color: bakeryRoom.ink },
  line: { fontFamily: fonts.bold, fontSize: 12.5, lineHeight: 16, textAlign: 'center', color: bakeryRoom.soft },
});
