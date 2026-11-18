// The Characters page, opened from the Characters card: how many characters the person has met, a search box,
// book chips and order chips (newest first, A–Z or Z–A), then a 3-column grid of collected characters. Sorted by
// name, each first letter gets a heading. It shows 25 at first and 25 more as the person scrolls; only the rows on
// screen are drawn. Everything comes from memory, so nothing waits on a download.

import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlankCell, CharacterCell } from '@/components/characters/CharacterCell';
import { CollectedGridHeader } from '@/components/common/CollectedGridHeader';
import { DrillHeader } from '@/components/common/DrillHeader';
import { gridRows, type GridRow } from '@/components/common/gridRows';
import { LoadState } from '@/components/common/LoadState';
import { filterCharacters, sortCharacters, useCharacterLibrary, type CharacterOrder } from '@/data/queries/characters';
import { characters as characterColors, reader, text } from '@/theme/colors';
import { gutter } from '@/theme/spacing';
import { fonts } from '@/theme/text';
import type { MetCharacter } from '@/types/character';

/** How many characters are shown at first, and how many more each time the grid nears its end. */
const PAGE = 25;

/** Cells across. */
const COLUMNS = 3;

/** The words under the big count. */
const COUNT_LABEL = ['character met', 'characters met'] as const;

/** The Characters grid page. */
export default function CharactersPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const library = useCharacterLibrary();
  const [query, setQuery] = useState('');
  const [book, setBook] = useState<string | null>(null);
  const [order, setOrder] = useState<CharacterOrder>('newest');
  // How many characters show, for the current search, book and order; any change starts again at 25.
  const filter = `${book ?? ''}|${order}|${query.trim().toLowerCase()}`;
  const [paging, setPaging] = useState({ filter: '', shown: PAGE });
  const shown = paging.filter === filter ? paging.shown : PAGE;

  const all = library.data?.characters;
  const matching = useMemo(() => (all ? sortCharacters(filterCharacters(all, query, book), order) : []), [all, query, book, order]);
  const rows = useMemo(() => gridRows(matching.slice(0, shown), order, COLUMNS), [matching, shown, order]);

  /** Shows 25 more characters when the grid nears its end. */
  const showMore = () => {
    if (shown < matching.length) setPaging({ filter, shown: shown + PAGE });
  };
  /** Opens a character's page. */
  const open = (character: MetCharacter) => router.push({ pathname: '/characters/[id]', params: { id: character.lookup } });

  /** Draws one line of the grid: a letter heading or a row of cells. */
  const renderRow = ({ item }: { item: GridRow<MetCharacter> }) =>
    item.kind === 'letter' ? (
      <Text style={styles.letter}>{item.letter}</Text>
    ) : (
      <View style={styles.row}>
        {item.cells.map((c, i) => (c ? <CharacterCell key={c.lookup} character={c} onPress={open} /> : <BlankCell key={`blank-${i}`} />))}
      </View>
    );

  return (
    <View style={styles.page}>
      <DrillHeader title="Characters collected" onBack={() => router.back()} />
      {library.isError && !library.data ? (
        <LoadState failed onRetry={() => library.refetch()} />
      ) : (
        library.data && (
          <FlatList
            data={rows}
            keyExtractor={(r) => (r.kind === 'letter' ? `letter-${r.letter}` : r.key)}
            renderItem={renderRow}
            ListHeaderComponent={
              <CollectedGridHeader
                count={library.data.characters.length}
                countLabel={COUNT_LABEL}
                placeholder="Search characters"
                colors={characterColors}
                query={query}
                onQuery={setQuery}
                books={library.data.books}
                book={book}
                onBook={setBook}
                order={order}
                onOrder={setOrder}
              />
            }
            ListEmptyComponent={<Text style={styles.empty}>{all?.length ? 'No characters match.' : 'Characters you meet in lessons show up here.'}</Text>}
            onEndReached={showMore}
            onEndReachedThreshold={0.6}
            initialNumToRender={8}
            windowSize={7}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 40 }]}
          />
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: reader.page },
  list: { paddingHorizontal: gutter, paddingTop: 4, width: '100%', maxWidth: 560, alignSelf: 'center' },
  row: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  letter: { fontFamily: fonts.black, fontSize: 22, color: characterColors.accent, marginTop: 8, marginBottom: 8, marginLeft: 2 },
  empty: { fontFamily: fonts.bold, fontSize: 15, color: text.onDarkSoft, textAlign: 'center', marginTop: 30 },
});
