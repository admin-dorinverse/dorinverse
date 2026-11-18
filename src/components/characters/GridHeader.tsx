// The top of the Characters grid: the big count of characters met, the search box, and a row of book chips
// (the books characters were met in). Filtering happens on the phone, as the person types or taps.

import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SearchField } from '@/components/common/SearchField';
import { playSound } from '@/components/common/sounds';
import type { CharacterOrder } from '@/data/characterLibrary';
import { characters, reader, text } from '@/theme/colors';
import { fonts } from '@/theme/text';

/** Props for the grid's top. */
type GridHeaderProps = {
  /** How many characters the person has collected. */
  count: number;
  /** What is typed in the search box. */
  query: string;
  /** Runs as the person types. */
  onQuery: (query: string) => void;
  /** The books characters were met in, in Bible order. */
  books: readonly string[];
  /** The picked book, or null for all books. */
  book: string | null;
  /** Picks a book, or null for all. */
  onBook: (book: string | null) => void;
  /** How the grid is ordered. */
  order: CharacterOrder;
  /** Changes the order. */
  onOrder: (order: CharacterOrder) => void;
};

/** The order chips: newest collected first, or by name either way. */
const ORDERS: readonly { order: CharacterOrder; label: string }[] = [
  { order: 'newest', label: 'Newest' },
  { order: 'az', label: 'A–Z' },
  { order: 'za', label: 'Z–A' },
];

/** The count, search box and book chips. */
export function GridHeader({ count, query, onQuery, books, book, onBook, order, onOrder }: GridHeaderProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.hero}>
        <Text style={styles.count}>{count}</Text>
        <Text style={styles.label}>{count === 1 ? 'character met' : 'characters met'}</Text>
      </View>
      <SearchField value={query} onChange={onQuery} onSubmit={() => {}} placeholder="Search characters" />
      {books.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} keyboardShouldPersistTaps="handled">
          <BookChip label="All" on={book === null} onPress={() => onBook(null)} />
          {books.map((b) => (
            <BookChip key={b} label={b} on={book === b} onPress={() => onBook(book === b ? null : b)} />
          ))}
        </ScrollView>
      )}
      {count > 1 && (
        <View style={styles.chips}>
          {ORDERS.map((o) => (
            <BookChip key={o.order} label={o.label} plain on={order === o.order} onPress={() => onOrder(o.order)} />
          ))}
        </View>
      )}
    </View>
  );
}

/** Props for one book chip. */
type BookChipProps = {
  /** The book's name, or "All". */
  label: string;
  /** True when this chip is the picked one. */
  on: boolean;
  /** True for chips without the book icon, like the order chips. */
  plain?: boolean;
  /** Picks this chip. */
  onPress: () => void;
};

/** One book chip. */
function BookChip({ label, on, plain = false, onPress }: BookChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      onPress={() => {
        playSound('tap');
        onPress();
      }}
      style={[styles.chip, on && styles.chipOn]}
    >
      <Text style={[styles.chipText, on && styles.chipTextOn]}>{plain || label === 'All' ? label : `📖 ${label}`}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingBottom: 14, gap: 10 },
  hero: { alignItems: 'center', paddingTop: 4, paddingBottom: 8 },
  count: {
    fontFamily: fonts.black,
    fontSize: 72,
    lineHeight: 78,
    color: characters.accent,
    textShadowColor: characters.glow,
    textShadowRadius: 22,
    textShadowOffset: { width: 0, height: 0 },
  },
  label: { fontFamily: fonts.extraBold, fontSize: 14, letterSpacing: 0.6, color: characters.soft, textTransform: 'uppercase' },
  chips: { flexDirection: 'row', gap: 8 },
  chip: { borderRadius: 999, paddingVertical: 7, paddingHorizontal: 14, backgroundColor: reader.surface, borderWidth: 1, borderColor: reader.edge },
  chipOn: { backgroundColor: characters.chipOn, borderColor: characters.accent },
  chipText: { fontFamily: fonts.extraBold, fontSize: 13, color: characters.soft },
  chipTextOn: { color: text.onDark },
});
