// The top of a collected list (Prophecy, Instructions, Prayers): the big count, an optional row of filter chips,
// and anything the page adds under them. Filtering happens on the phone, as the person taps.

import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { CountHero, type ListColors } from '@/components/common/CountHero';
import { FilterChip } from '@/components/common/FilterChip';

/** One filter chip: what it picks and the words on it. */
export type ChipOption<T extends string> = { id: T; label: string };

/** Props for the list's top. */
type CountChipsHeaderProps<T extends string> = {
  /** The number to show. */
  count: number;
  /** The words under the count, for one and for more. */
  label: readonly [string, string];
  /** The list's accent colors. */
  colors: ListColors;
  /** The filter chips; none (or one) shows no chip row. */
  chips?: readonly ChipOption<T>[];
  /** The picked chip. */
  picked?: T;
  /** Picks a chip. */
  onPick?: (id: T) => void;
  /** Shown under the chips, like the Ten Commandments pack. */
  children?: ReactNode;
};

/** The count, the filter chips and what the page adds under them. */
export function CountChipsHeader<T extends string>({ count, label, colors, chips, picked, onPick, children }: CountChipsHeaderProps<T>) {
  return (
    <View style={styles.wrap}>
      <CountHero count={count} label={label} colors={colors} />
      {chips && chips.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {chips.map((c) => (
            <FilterChip key={c.id} label={c.label} on={picked === c.id} colors={colors} onPress={() => onPick?.(c.id)} />
          ))}
        </ScrollView>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingBottom: 14, gap: 10 },
  chips: { flexDirection: 'row', gap: 8 },
});
