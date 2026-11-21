// The week at a glance on the Clue Book page: seven small circles, Monday to Sunday. A collected clue is a red
// circle with a check, a missed one is a dashed ring with a cross, today has a gold ring, and later days are dim.

import { StyleSheet, Text, View } from 'react-native';
import { mystery } from '@/theme/mysteryColors';
import { fonts } from '@/theme/text';
import type { ClueSlot } from '@/types/mystery';

/** The days' first letters, Monday first. */
const LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/** Props for the day strip. */
type DayStripProps = {
  /** All seven days' clue pages. */
  clues: readonly ClueSlot[];
  /** Today, 1 (Monday) to 7 (Sunday). */
  today: number;
};

/** The seven day circles. */
export function DayStrip({ clues, today }: DayStripProps) {
  const collected = clues.filter((c) => c.status === 'collected').length;
  return (
    <View style={styles.strip} accessibilityLabel={`${collected} of 7 clues collected`}>
      {clues.map((c) => (
        <View key={c.day} style={styles.day}>
          <View style={[styles.dot, c.status === 'collected' && styles.collected, c.status === 'missed' && styles.missed, c.day === today && styles.today]}>
            <Text style={[styles.mark, c.status === 'collected' && styles.markOn]}>{c.status === 'collected' ? '✓' : c.status === 'missed' ? '✕' : ''}</Text>
          </View>
          <Text style={[styles.letter, c.day === today && styles.letterToday]}>{LETTERS[c.day - 1]}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  strip: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4 },
  day: { alignItems: 'center', gap: 5 },
  dot: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: mystery.later, backgroundColor: mystery.later },
  collected: { backgroundColor: mystery.accent, borderColor: mystery.accent, boxShadow: `0 0 10px ${mystery.glow}` },
  missed: { backgroundColor: 'transparent', borderStyle: 'dashed', borderColor: mystery.missedEdge },
  today: { borderColor: mystery.gold },
  mark: { fontFamily: fonts.black, fontSize: 14, color: mystery.soft },
  markOn: { color: mystery.paper },
  letter: { fontFamily: fonts.extraBold, fontSize: 12, color: mystery.soft },
  letterToday: { color: mystery.gold },
});
