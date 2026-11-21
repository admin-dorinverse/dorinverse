// The Sunday evening reveal at the top of the Clue Book: the week's word in big gold letters, growing into place,
// with the day the person solved it, if they did.

import { StyleSheet, Text } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { easeOutBack, mix, progress } from '@/components/common/motion';
import type { AmbientClock } from '@/components/common/useAmbientClock';
import { text } from '@/theme/colors';
import { mystery } from '@/theme/mysteryColors';
import { fonts } from '@/theme/text';

/** How long the word takes to grow into place (ms). */
const GROW_MS = 700;

/** Props for the reveal. */
type WordRevealProps = {
  /** The week's word. */
  word: string;
  /** One line under the word, like the day it was solved. Empty for none. */
  note: string;
  /** The page's shared animation timer. */
  clock: AmbientClock;
};

/** The revealed word. */
export function WordReveal({ word, note, clock }: WordRevealProps) {
  const { time, still } = clock;
  const grow = useAnimatedStyle(() => {
    if (still) return { opacity: 1, transform: [{ scale: 1 }] };
    const t = progress(time.get(), 150, GROW_MS);
    return { opacity: t, transform: [{ scale: mix(easeOutBack(t), 0.6, 1) }] };
  });
  return (
    <Animated.View style={[styles.card, grow]}>
      <Text style={styles.kicker}>THE WORD WAS</Text>
      <Text style={styles.word} adjustsFontSizeToFit numberOfLines={1}>
        {word.toUpperCase()}
      </Text>
      {note !== '' && <Text style={styles.note}>{note}</Text>}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: 'center', gap: 4, borderRadius: 24, borderWidth: 1.5, borderColor: mystery.gold, backgroundColor: mystery.accentSoft, paddingVertical: 18, paddingHorizontal: 16, boxShadow: `0 0 26px ${mystery.glow}` },
  kicker: { fontFamily: fonts.black, fontSize: 12, letterSpacing: 1.4, color: mystery.gold },
  word: { fontFamily: fonts.black, fontSize: 40, letterSpacing: 4, color: text.onDark },
  note: { fontFamily: fonts.body, fontSize: 14.5, lineHeight: 20, textAlign: 'center', color: mystery.soft },
});
