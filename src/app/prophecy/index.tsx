// The Prophecy and Fulfillment of Jesus page, opened from its Collections card: how many links the person has
// joined, chips for All / Joined / Waiting for a half, then a card for every link they hold any half of. It shows 25
// at first and 25 more as the person scrolls; only the cards on screen are drawn. Everything is already on the phone.

import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CountChipsHeader, type ChipOption } from '@/components/common/CountChipsHeader';
import { DrillHeader } from '@/components/common/DrillHeader';
import { LoadState } from '@/components/common/LoadState';
import { ProphecyLinkCard } from '@/components/prophecy/ProphecyLinkCard';
import { filterProphecies, useCookieLibrary, type ProphecyFilter } from '@/data/queries/cookies';
import { prophecy as prophecyColors, reader, text } from '@/theme/colors';
import { gutter } from '@/theme/spacing';
import { fonts } from '@/theme/text';
import type { ProphecyCard } from '@/types/cookie';

/** How many links are shown at first, and how many more each time the list nears its end. */
const PAGE = 25;

/** The words under the big count. */
const COUNT_LABEL = ['prophecy joined', 'prophecies joined'] as const;

/** The filter chips. */
const FILTERS: readonly ChipOption<ProphecyFilter>[] = [
  { id: 'all', label: 'All' },
  { id: 'joined', label: '✦ Joined' },
  { id: 'waiting', label: 'Waiting for a half' },
];

/** The Prophecy and Fulfillment list page. */
export default function ProphecyPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const library = useCookieLibrary();
  const [filter, setFilter] = useState<ProphecyFilter>('all');
  // How many links show for the current filter; changing it starts again at 25.
  const [paging, setPaging] = useState({ filter: 'all' as ProphecyFilter, shown: PAGE });
  const shown = paging.filter === filter ? paging.shown : PAGE;

  const all = library.data?.prophecies;
  const matching = useMemo(() => (all ? filterProphecies(all, filter) : []), [all, filter]);
  const visible = useMemo(() => matching.slice(0, shown), [matching, shown]);

  /** Shows 25 more links when the list nears its end. */
  const showMore = () => {
    if (shown < matching.length) setPaging({ filter, shown: shown + PAGE });
  };
  /** Opens a link's page. */
  const open = (card: ProphecyCard) => router.push({ pathname: '/prophecy/[id]', params: { id: String(card.linkNo) } });

  const empty = all?.length ? (filter === 'joined' ? 'No links joined yet. Find both halves to join one.' : 'Every link you hold is joined.') : 'Prophecies you find in lessons show up here.';

  return (
    <View style={styles.page}>
      <DrillHeader title="Prophecy and Fulfillment" onBack={() => router.back()} />
      {library.isError && !library.data ? (
        <LoadState failed onRetry={() => library.refetch()} />
      ) : (
        library.data && (
          <FlatList
            data={visible}
            keyExtractor={(card) => String(card.linkNo)}
            renderItem={({ item }) => <ProphecyLinkCard card={item} onOpen={open} />}
            ListHeaderComponent={
              <CountChipsHeader
                count={library.data.joinedCount}
                label={COUNT_LABEL}
                colors={prophecyColors}
                chips={all?.length ? FILTERS : undefined}
                picked={filter}
                onPick={setFilter}
              />
            }
            ListEmptyComponent={<Text style={styles.empty}>{empty}</Text>}
            onEndReached={showMore}
            onEndReachedThreshold={0.6}
            initialNumToRender={5}
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
  empty: { fontFamily: fonts.bold, fontSize: 15, color: text.onDarkSoft, textAlign: 'center', marginTop: 30 },
});
