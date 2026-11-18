// One collected place's page, opened from the Places grid or a character's page: its photo and the photo's credit,
// what it is, how many verses name it (with "Find in scripture"), the collected characters linked to it (the rest
// only counted), and its key moments. Everything, photo included, is already on the phone; only the rows on
// screen are drawn.

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MomentRow, SectionHeading } from '@/components/characters/CharacterRows';
import { DrillHeader } from '@/components/common/DrillHeader';
import { LoadState } from '@/components/common/LoadState';
import { PlaceHead } from '@/components/places/PlaceHead';
import { placePageItems, type PlacePageItem } from '@/components/places/placePageItems';
import { MoreCharacters, PlaceCharacterLine } from '@/components/places/PlaceRows';
import { useCharacterLibrary } from '@/data/queries/characters';
import { usePlaceLibrary, usePlaceRevealedCount } from '@/data/queries/places';
import { reader, text } from '@/theme/colors';
import { gutter } from '@/theme/spacing';
import { fonts } from '@/theme/text';
import type { CharacterLookup } from '@/types/character';

/** A place's page. */
export default function PlacePage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const library = usePlaceLibrary();
  const characters = useCharacterLibrary().data;
  const place = library.data?.byLookup[id];
  const revealed = usePlaceRevealedCount(place);
  const items = useMemo(() => (place ? placePageItems(characters, place) : []), [characters, place]);

  /** Opens a collected character's page. */
  const openCharacter = (lookup: CharacterLookup) => router.push({ pathname: '/characters/[id]', params: { id: lookup } });
  /** Lists the person's revealed verses that name this place. */
  const find = () => router.push({ pathname: '/bible/results', params: { place: id } });

  /** Draws one row of the page. */
  const renderItem = ({ item }: { item: PlacePageItem }) => {
    switch (item.kind) {
      case 'heading':
        return <SectionHeading title={item.title} />;
      case 'character':
        return <PlaceCharacterLine row={item.row} onOpen={openCharacter} />;
      case 'more':
        return <MoreCharacters count={item.count} />;
      case 'moment':
        return <MomentRow moment={item.moment} />;
    }
  };

  return (
    <View style={styles.page}>
      <DrillHeader title={place?.name ?? 'Place'} onBack={() => router.back()} />
      {library.isError && !library.data ? (
        <LoadState failed onRetry={() => library.refetch()} />
      ) : library.data && !place ? (
        <Text style={styles.empty}>This place isn’t in your collection yet.</Text>
      ) : (
        place && (
          <FlatList
            data={items}
            keyExtractor={(item) => item.key}
            renderItem={renderItem}
            ListHeaderComponent={<PlaceHead place={place} revealed={revealed} onFind={find} />}
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
