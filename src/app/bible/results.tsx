// Every revealed verse that matches a search, opened from "View all results". The list finds 25 matches at a
// time and stops looking; scrolling near the end finds the next 25. Only the cards on screen are drawn.

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { VerseHitCard } from '@/components/bible/VerseHitCard';
import { DrillHeader } from '@/components/common/DrillHeader';
import { versePage, type VerseHit } from '@/data/bibleSearch';
import { useSearchIndex } from '@/data/queries/bible';
import { reader, text } from '@/theme/colors';
import { gutter } from '@/theme/spacing';
import { fonts } from '@/theme/text';

/** The pages found after the first, for one search: their matches and where the next page starts. */
type MorePages = { query: string; hits: VerseHit[]; next: number | null };

/** The full results page. */
export default function BibleResultsPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { q = '' } = useLocalSearchParams<{ q?: string }>();
  const index = useSearchIndex();
  const first = useMemo(() => (index ? versePage(index, q) : null), [index, q]);
  const [more, setMore] = useState<MorePages>({ query: '', hits: [], next: null });

  const extra = more.query === q ? more : null;
  const hits = first ? (extra ? [...first.hits, ...extra.hits] : first.hits) : [];
  const next = extra ? extra.next : (first?.next ?? null);

  /** Finds the next 25 matches when the list nears its end. */
  const loadMore = () => {
    if (!index || next === null) return;
    const page = versePage(index, q, next);
    setMore({ query: q, hits: [...(extra?.hits ?? []), ...page.hits], next: page.next });
  };

  /** Opens a verse's chapter in the reader with the searched words highlighted. */
  const open = (hit: VerseHit) =>
    router.push({ pathname: '/bible/[book]/[chapter]', params: { book: String(hit.book), chapter: String(hit.chapter), mark: q } });

  return (
    <View style={styles.page}>
      <DrillHeader title={`Results for “${q}”`} onBack={() => router.back()} />
      <FlatList
        data={hits}
        keyExtractor={(hit) => hit.ref}
        renderItem={({ item }) => <VerseHitCard hit={item} query={q} onPress={open} />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.6}
        initialNumToRender={10}
        windowSize={7}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 40 }]}
        ListEmptyComponent={first ? <Text style={styles.empty}>Nothing in your revealed verses matches yet.</Text> : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: reader.page },
  list: { paddingHorizontal: gutter, paddingTop: 4, width: '100%', maxWidth: 560, alignSelf: 'center' },
  empty: { fontFamily: fonts.bold, fontSize: 15, color: text.onDarkSoft, textAlign: 'center', marginTop: 40 },
});
