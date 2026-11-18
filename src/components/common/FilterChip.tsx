// One round chip for filtering or ordering a collected list, like "📖 Judges", "A–Z" or "Joined". The picked chip
// fills with the list's accent.

import { Pressable, StyleSheet, Text } from 'react-native';
import type { ListColors } from '@/components/common/CountHero';
import { playSound } from '@/components/common/sounds';
import { reader, text } from '@/theme/colors';
import { fonts } from '@/theme/text';

/** Props for one chip. */
type FilterChipProps = {
  /** The words on the chip. */
  label: string;
  /** True when this chip is the picked one. */
  on: boolean;
  /** The list's accent colors. */
  colors: ListColors;
  /** Picks this chip. */
  onPress: () => void;
};

/** One filter or order chip. */
export function FilterChip({ label, on, colors, onPress }: FilterChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      onPress={() => {
        playSound('tap');
        onPress();
      }}
      style={[styles.chip, on && { backgroundColor: colors.chipOn, borderColor: colors.accent }]}
    >
      <Text style={[styles.chipText, { color: on ? text.onDark : colors.soft }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: { borderRadius: 999, paddingVertical: 7, paddingHorizontal: 14, backgroundColor: reader.surface, borderWidth: 1, borderColor: reader.edge },
  chipText: { fontFamily: fonts.extraBold, fontSize: 13 },
});
