// The Characters page, opened from the Characters card: how many characters the person has met, a search box and
// book chips, then a 3-column grid of collected characters, newest first. It shows 25 at first and 25 more as the
// person scrolls; only the cells on screen are drawn. Everything comes from memory, so nothing waits on a download.

import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlankCell, CharacterCell, fillRows } from '@/components/characters/CharacterCell';
import { GridHeader } from '@/components/characters/GridHeader';
import { DrillHeader } from '@/components/common/DrillHeader';
import { LoadState } from '@/components/common/LoadState';
import { filterCharacters, useCharacterLibrary } from '@/data/queries/characters';
import { reader, text } from '@/theme/colors';
import { gutter } from '@/theme/spacing';
import { fonts } from '@/theme/text';
import type { MetCharacter } from '@/types/character';

/** How many cells are shown at first, and how many more each time the grid nears its end. */
const PAGE = 25;

/** Cells across. */
const COLUMNS = 3;

/** The Characters grid page. */
export default function CharactersPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const library = useCharacterLibrary();
  const [query, setQuery] = useState('');
  const [book, setBook] = useState<string | null>(null);
  // How many cells show, for the current search and book; a new search starts again at 25.
  const filter = `${book ?? ''}|${query.trim().toLowerCase()}`;
  const [paging, setPaging] = useState({ filter: '', shown: PAGE });
  const shown = paging.filter === filter ? paging.shown : PAGE;

  const all = library.data?.characters;
  const matching = useMemo(() => (all ? filterCharacters(all, query, book) : []), [all, query, book]);
  const cells = useMemo(() => fillRows(matching.slice(0, shown), COLUMNS), [matching, shown]);

  /** Shows 25 more cells when the grid nears its end. */
  const showMore = () => {
    if (shown < matching.length) setPaging({ filter, shown: shown + PAGE });
  };
  /** Opens a character's page. */
  const open = (character: MetCharacter) => router.push({ pathname: '/characters/[id]', params: { id: character.lookup } });

  return (
    <View style={styles.page}>
      <DrillHeader title="Characters collected" onBack={() => router.back()} />
      {library.isError && !library.data ? (
        <LoadState failed onRetry={() => library.refetch()} />
      ) : (
        library.data && (
          <FlatList
            data={cells}
            numColumns={COLUMNS}
            keyExtractor={(c, i) => (c ? c.lookup : `blank-${i}`)}
            renderItem={({ item }) => (item ? <CharacterCell character={item} onPress={open} /> : <BlankCell />)}
            columnWrapperStyle={styles.row}
            ListHeaderComponent={
              <GridHeader count={library.data.characters.length} query={query} onQuery={setQuery} books={library.data.books} book={book} onBook={setBook} />
            }
            ListEmptyComponent={<Text style={styles.empty}>{all?.length ? 'No characters match.' : 'Characters you meet in lessons show up here.'}</Text>}
            onEndReached={showMore}
            onEndReachedThreshold={0.6}
            initialNumToRender={12}
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
  row: { gap: 10, marginBottom: 10 },
  empty: { fontFamily: fonts.bold, fontSize: 15, color: text.onDarkSoft, textAlign: 'center', marginTop: 30 },
});
