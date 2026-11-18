// The Prayers page, opened from its Collections card: how many prayers the person has collected, then a card for
// each one (who prayed, the key line, where it runs). Tapping a card opens its sheet. It shows 25 at first and 25
// more as the person scrolls; only the cards on screen are drawn. Everything is already on the phone.

import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CountChipsHeader } from '@/components/common/CountChipsHeader';
import { DrillHeader } from '@/components/common/DrillHeader';
import { LoadState } from '@/components/common/LoadState';
import { PrayerCard } from '@/components/prayers/PrayerCard';
import { PrayerSheet } from '@/components/prayers/PrayerSheet';
import { useCookieLibrary } from '@/data/queries/cookies';
import { prayers as prayerColors, reader, text } from '@/theme/colors';
import { gutter } from '@/theme/spacing';
import { fonts } from '@/theme/text';
import type { PrayerCookie } from '@/types/cookie';

/** How many prayers are shown at first, and how many more each time the list nears its end. */
const PAGE = 25;

/** The words under the big count. */
const COUNT_LABEL = ['prayer collected', 'prayers collected'] as const;

/** The Prayers list page. */
export default function PrayersPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const library = useCookieLibrary();
  const [shown, setShown] = useState(PAGE);
  const [open, setOpen] = useState<PrayerCookie | null>(null);

  const all = library.data?.prayers;
  const visible = useMemo(() => (all ? all.slice(0, shown) : []), [all, shown]);

  /** Shows 25 more prayers when the list nears its end. */
  const showMore = () => {
    if (all && shown < all.length) setShown(shown + PAGE);
  };

  return (
    <View style={styles.page}>
      <DrillHeader title="Prayers" onBack={() => router.back()} />
      {library.isError && !library.data ? (
        <LoadState failed onRetry={() => library.refetch()} />
      ) : (
        library.data && (
          <FlatList
            data={visible}
            keyExtractor={(c) => c.key}
            renderItem={({ item }) => <PrayerCard cookie={item} onOpen={setOpen} />}
            ListHeaderComponent={<CountChipsHeader count={library.data.prayers.length} label={COUNT_LABEL} colors={prayerColors} />}
            ListEmptyComponent={<Text style={styles.empty}>Prayers you find in lessons show up here.</Text>}
            onEndReached={showMore}
            onEndReachedThreshold={0.6}
            initialNumToRender={8}
            windowSize={7}
            contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 40 }]}
          />
        )
      )}
      <PrayerSheet cookie={open} onClose={() => setOpen(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: reader.page },
  list: { paddingHorizontal: gutter, paddingTop: 4, width: '100%', maxWidth: 560, alignSelf: 'center' },
  empty: { fontFamily: fonts.bold, fontSize: 15, color: text.onDarkSoft, textAlign: 'center', marginTop: 30 },
});
