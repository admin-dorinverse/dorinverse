// The top of a collected grid (Characters, Places): the big count, the search box, a row of book chips (the books
// things were collected in) and the order chips. Filtering happens on the phone, as the person types or taps.

import { ScrollView, StyleSheet, View } from 'react-native';
import { CountHero, type ListColors } from '@/components/common/CountHero';
import { FilterChip } from '@/components/common/FilterChip';
import { SearchField } from '@/components/common/SearchField';
import type { ListOrder } from '@/data/collectedLists';

/** A grid's accent colors, like `characters` or `places` in the theme. */
export type GridColors = ListColors;

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
      <CountHero count={count} label={countLabel} colors={colors} />
      <SearchField value={query} onChange={onQuery} onSubmit={() => {}} placeholder={placeholder} />
      {books.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} keyboardShouldPersistTaps="handled">
          <FilterChip label="All" on={book === null} colors={colors} onPress={() => onBook(null)} />
          {books.map((b) => (
            <FilterChip key={b} label={`📖 ${b}`} on={book === b} colors={colors} onPress={() => onBook(book === b ? null : b)} />
          ))}
        </ScrollView>
      )}
      {count > 1 && (
        <View style={styles.chips}>
          {ORDERS.map((o) => (
            <FilterChip key={o.order} label={o.label} on={order === o.order} colors={colors} onPress={() => onOrder(o.order)} />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingBottom: 14, gap: 10 },
  chips: { flexDirection: 'row', gap: 8 },
});
