// The top of a collected grid (Characters, Places): the big count, the search box, a row of book chips (the books
// things were collected in) and the order chips. Filtering happens on the phone, as the person types or taps.

import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SearchField } from '@/components/common/SearchField';
import { playSound } from '@/components/common/sounds';
import type { ListOrder } from '@/data/collectedLists';
import { reader, text } from '@/theme/colors';
import { fonts } from '@/theme/text';

/** A grid's accent colors, like `characters` or `places` in the theme. */
export type GridColors = { accent: string; glow: string; chipOn: string; soft: string };

/** Props for the grid's top. */
type CollectedGridHeaderProps = {
  /** How many things the person has collected. */
  count: number;
  /** The words under the count, for one and for more, like ["character met", "characters met"]. */
  countLabel: readonly [string, string];
  /** The search box's hint, like "Search characters". */
  placeholder: string;
  /** The grid's accent colors. */
  colors: GridColors;
  /** What is typed in the search box. */
  query: string;
  /** Runs as the person types. */
  onQuery: (query: string) => void;
  /** The books things were collected in, in Bible order. */
  books: readonly string[];
  /** The picked book, or null for all books. */
  book: string | null;
  /** Picks a book, or null for all. */
  onBook: (book: string | null) => void;
  /** How the grid is ordered. */
  order: ListOrder;
  /** Changes the order. */
  onOrder: (order: ListOrder) => void;
};

/** The order chips: newest collected first, or by name either way. */
const ORDERS: readonly { order: ListOrder; label: string }[] = [
  { order: 'newest', label: 'Newest' },
  { order: 'az', label: 'A–Z' },
  { order: 'za', label: 'Z–A' },
];

/** The count, search box, book chips and order chips. */
export function CollectedGridHeader(props: CollectedGridHeaderProps) {
  const { count, countLabel, placeholder, colors, query, onQuery, books, book, onBook, order, onOrder } = props;
  return (
    <View style={styles.wrap}>
      <View style={styles.hero}>
        <Text style={[styles.count, { color: colors.accent, textShadowColor: colors.glow }]}>{count}</Text>
        <Text style={[styles.label, { color: colors.soft }]}>{count === 1 ? countLabel[0] : countLabel[1]}</Text>
      </View>
      <SearchField value={query} onChange={onQuery} onSubmit={() => {}} placeholder={placeholder} />
      {books.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} keyboardShouldPersistTaps="handled">
          <Chip label="All" on={book === null} colors={colors} onPress={() => onBook(null)} />
          {books.map((b) => (
            <Chip key={b} label={`📖 ${b}`} on={book === b} colors={colors} onPress={() => onBook(book === b ? null : b)} />
          ))}
        </ScrollView>
      )}
      {count > 1 && (
        <View style={styles.chips}>
          {ORDERS.map((o) => (
            <Chip key={o.order} label={o.label} on={order === o.order} colors={colors} onPress={() => onOrder(o.order)} />
          ))}
        </View>
      )}
    </View>
  );
}

/** Props for one chip. */
type ChipProps = {
  /** The words on the chip, like "📖 Judges" or "A–Z". */
  label: string;
  /** True when this chip is the picked one. */
  on: boolean;
  /** The grid's accent colors. */
  colors: GridColors;
  /** Picks this chip. */
  onPress: () => void;
};

/** One book or order chip. */
function Chip({ label, on, colors, onPress }: ChipProps) {
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
  wrap: { paddingBottom: 14, gap: 10 },
  hero: { alignItems: 'center', paddingTop: 4, paddingBottom: 8 },
  count: { fontFamily: fonts.black, fontSize: 72, lineHeight: 78, textShadowRadius: 22, textShadowOffset: { width: 0, height: 0 } },
  label: { fontFamily: fonts.extraBold, fontSize: 14, letterSpacing: 0.6, textTransform: 'uppercase' },
  chips: { flexDirection: 'row', gap: 8 },
  chip: { borderRadius: 999, paddingVertical: 7, paddingHorizontal: 14, backgroundColor: reader.surface, borderWidth: 1, borderColor: reader.edge },
  chipText: { fontFamily: fonts.extraBold, fontSize: 13 },
});
