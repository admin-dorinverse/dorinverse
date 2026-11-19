// The two-column grid of verse cards used by every Verse Memory list. It shows 26 cards at first and more as the
// person scrolls; only the rows on screen are drawn.

import { useCallback, useMemo, useState, type ReactElement } from 'react';
import { FlatList, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { VerseHit } from '@/data/bibleSearch';
import { useMemorizedVerses } from '@/data/storage/memorizedVerses';
import { text } from '@/theme/colors';
import { gutter } from '@/theme/spacing';
import { fonts, readingFont } from '@/theme/text';
import { VerseCard } from './VerseCard';

/** How many cards show at first, and how many more each time the grid nears its end (an even number). */
const PAGE = 26;

/** The serif line above a grid, like "Choose a verse you have collected". */
export const verseHeading = {
  fontFamily: readingFont,
  fontWeight: '700',
  fontSize: 19,
  lineHeight: 24,
  color: text.onDark,
  textAlign: 'center',
  marginHorizontal: 8,
  marginBottom: 14,
} as const;

/** Props for the grid. */
type VerseGridProps = {
  /** The verses, in the order to show. */
  verses: readonly VerseHit[];
  /** Opens a verse. */
  onOpen: (verse: VerseHit) => void;
  /** What sits above the cards. */
  header?: ReactElement;
  /** What shows when there are no verses. */
  emptyNote: string;
};

/** The verse card grid. */
export function VerseGrid({ verses, onOpen, header, emptyNote }: VerseGridProps) {
  const insets = useSafeAreaInsets();
  const memorized = useMemorizedVerses();
  const known = useMemo(() => new Set(memorized), [memorized]);
  // A new list starts again at the first page.
  const [paging, setPaging] = useState({ list: verses, shown: PAGE });
  const shown = paging.list === verses ? paging.shown : PAGE;
  const visible = useMemo(() => verses.slice(0, shown), [verses, shown]);

  /** Shows more cards when the grid nears its end. */
  const showMore = () => {
    if (shown < verses.length) setPaging({ list: verses, shown: shown + PAGE });
  };
  const renderCard = useCallback(({ item }: { item: VerseHit }) => <VerseCard verse={item} memorized={known.has(item.ref)} onOpen={onOpen} />, [known, onOpen]);

  return (
    <FlatList
      data={visible}
      keyExtractor={(v) => v.ref}
      renderItem={renderCard}
      numColumns={2}
      columnWrapperStyle={styles.row}
      ListHeaderComponent={header}
      ListEmptyComponent={<Text style={styles.empty}>{emptyNote}</Text>}
      onEndReached={showMore}
      onEndReachedThreshold={0.6}
      initialNumToRender={8}
      windowSize={7}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 40 }]}
    />
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: gutter, paddingTop: 4, gap: 12, width: '100%', maxWidth: 560, alignSelf: 'center' },
  row: { gap: 12 },
  empty: { fontFamily: fonts.bold, fontSize: 15, lineHeight: 21, color: text.onDarkSoft, textAlign: 'center', marginTop: 30, paddingHorizontal: 10 },
});
