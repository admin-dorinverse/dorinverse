// The row at the top of the Memorization Tool, as in the prototype: how many verses the person has memorized,
// with an arrow. Tapping it opens the memorized list.

import { Pressable, StyleSheet, Text, View } from 'react-native';
import { playSound } from '@/components/common/sounds';
import { useMemorizedVerses } from '@/data/storage/memorizedVerses';
import { reader, text } from '@/theme/colors';
import { fonts } from '@/theme/text';
import { verseMemory } from '@/theme/verseMemoryColors';

/** Props for the memorized row. */
type MemorizedRowProps = {
  /** Opens the memorized list. */
  onPress: () => void;
};

/** The "Verses memorized" row. */
export function MemorizedRow({ onPress }: MemorizedRowProps) {
  const count = useMemorizedVerses().length;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`View memorized verses, ${count}`}
      onPress={() => {
        playSound('tap');
        onPress();
      }}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <Text style={styles.label}>Verses memorized</Text>
      <View style={styles.right}>
        <Text style={styles.count}>{count}</Text>
        <Text style={styles.arrow}>›</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: reader.surface,
    borderWidth: 1,
    borderColor: reader.edge,
    marginBottom: 18,
  },
  pressed: { transform: [{ scale: 0.98 }] },
  label: { fontFamily: fonts.black, fontSize: 15, color: text.onDark },
  right: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  count: { fontFamily: fonts.black, fontSize: 22, color: verseMemory.accent, textShadowColor: verseMemory.glow, textShadowRadius: 10 },
  arrow: { fontFamily: fonts.black, fontSize: 22, color: verseMemory.soft },
});
