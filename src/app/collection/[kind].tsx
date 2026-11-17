// One collection's full list, opened from a card's "See all" on the Collections tab. The real lists
// (starting with the Bible reader) are built next in Phase 2.

import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { PlaceholderPage } from '@/components/common/PlaceholderPage';
import { collectionHues, sky } from '@/theme/colors';

/** Each collection's title and glow color. */
const COLLECTIONS: Record<string, { title: string; glow: string }> = {
  verses: { title: 'Bible verses', glow: collectionHues.amber },
  characters: { title: 'Characters', glow: collectionHues.berry },
  places: { title: 'Places', glow: collectionHues.sage },
  prophecy: { title: 'Prophecy and Fulfillment of Jesus', glow: collectionHues.blue },
  instructions: { title: 'Instructions for Today', glow: collectionHues.cocoa },
  prayers: { title: 'Prayers', glow: collectionHues.lav },
};

/** A collection's page, for now a placeholder in the collection's color. */
export default function CollectionPage() {
  const router = useRouter();
  const { kind } = useLocalSearchParams<{ kind: string }>();
  const collection = COLLECTIONS[kind] ?? { title: 'Collection', glow: collectionHues.amber };
  return (
    <View style={styles.page}>
      <PlaceholderPage
        kicker="COLLECTIONS"
        title={collection.title}
        note="The full list will live here. Coming next in Phase 2."
        glow={collection.glow}
        onBack={() => router.back()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: sky.top },
});
