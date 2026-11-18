// One collected character's page, opened from the Characters grid or a relationship: recently viewed chips, who
// they were, how many verses name them (with "Find in scripture"), key moments, relationships with other collected
// characters, and places (collected ones open their page). Everything comes from memory; only the rows on
// screen are drawn.

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CharacterHead } from '@/components/characters/CharacterHead';
import { DiscoverLine, MomentRow, PlaceRow, RelationRow, SectionHeading } from '@/components/characters/CharacterRows';
import { characterPageItems, type PageItem } from '@/components/characters/pageItems';
import { RecentTrail } from '@/components/characters/RecentTrail';
import { visitCharacter } from '@/components/characters/recentCharacters';
import { DrillHeader } from '@/components/common/DrillHeader';
import { LoadState } from '@/components/common/LoadState';
import { useCharacterLibrary, useRevealedVerseCount } from '@/data/queries/characters';
import { usePlaceLibrary } from '@/data/queries/places';
import { reader, text } from '@/theme/colors';
import { gutter } from '@/theme/spacing';
import { fonts } from '@/theme/text';
import type { CharacterLookup } from '@/types/character';
import type { PlaceLookup } from '@/types/place';

/** A character's page. */
export default function CharacterPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const library = useCharacterLibrary();
  const character = library.data?.byLookup[id];
  const revealed = useRevealedVerseCount(character);
  // Collected places open their page from the Places rows; the rest stay plain text.
  const places = usePlaceLibrary().data;
  // Opening the page puts this character first in the recently viewed chips.
  const [trail] = useState(() => visitCharacter(id));
  const items = useMemo(() => (library.data && character ? characterPageItems(library.data, character) : []), [library.data, character]);

  /** Opens another collected character's page. */
  const open = (lookup: CharacterLookup) => router.push({ pathname: '/characters/[id]', params: { id: lookup } });
  /** Opens a collected place's page. */
  const openPlace = (lookup: PlaceLookup) => router.push({ pathname: '/places/[id]', params: { id: lookup } });
  /** Lists the person's revealed verses that name this character. */
  const find = () => router.push({ pathname: '/bible/results', params: { character: id } });

  /** Draws one row of the page. */
  const renderItem = ({ item }: { item: PageItem }) => {
    switch (item.kind) {
      case 'heading':
        return <SectionHeading title={item.title} />;
      case 'moment':
        return <MomentRow moment={item.moment} />;
      case 'link':
        return <RelationRow link={item.link} onOpen={open} />;
      case 'discover':
        return <DiscoverLine count={item.count} />;
      case 'place':
        return <PlaceRow place={item.place} placeLookup={places?.byPlaceId[item.place.id]?.lookup} onOpen={openPlace} />;
    }
  };

  return (
    <View style={styles.page}>
      <DrillHeader title={character?.name ?? 'Character'} onBack={() => router.back()} />
      {library.isError && !library.data ? (
        <LoadState failed onRetry={() => library.refetch()} />
      ) : library.data && !character ? (
        <Text style={styles.empty}>This character isn’t in your collection yet.</Text>
      ) : (
        library.data &&
        character && (
          <FlatList
            data={items}
            keyExtractor={(item) => item.key}
            renderItem={renderItem}
            ListHeaderComponent={
              <>
                <RecentTrail trail={trail} library={library.data} current={id} onOpen={open} />
                <CharacterHead character={character} revealed={revealed} onFind={find} />
              </>
            }
            initialNumToRender={10}
            windowSize={7}
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
  empty: { fontFamily: fonts.bold, fontSize: 15, color: text.onDarkSoft, textAlign: 'center', marginTop: 40 },
});
