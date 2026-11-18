// A list of revealed verses: every one that matches a search (opened from "View all results"), or every one that
// names a character (opened from "Find in scripture" on a character's page). The list finds 25 at a time and stops
// looking; scrolling near the end finds the next 25. Only the cards on screen are drawn.

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { VerseHitCard } from '@/components/bible/VerseHitCard';
import { DrillHeader } from '@/components/common/DrillHeader';
import { refsPage, versePage, type SearchIndex, type VerseHit, type VersePage } from '@/data/bibleSearch';
import { useSearchIndex } from '@/data/queries/bible';
import { useCharacter, useCharacterVerseRefs } from '@/data/queries/characters';
import { reader, text } from '@/theme/colors';
import { gutter } from '@/theme/spacing';
import { fonts } from '@/theme/text';
import type { VerseRef } from '@/types/bible';

/** The pages found after the first, for one list: which list, its matches and where the next page starts. */
type MorePages = { list: string; hits: VerseHit[]; next: number | null };

/**
 * One page of the list from `from` on: search matches, or the verses in `refs` when the list is a character's
 * (`refs` is null while that character is still loading). Null until the revealed verses are loaded.
 */
function listPage(index: SearchIndex | undefined, q: string, refs: ReadonlySet<VerseRef> | null | undefined, from: number): VersePage | null {
  if (!index || refs === null) return null;
  return refs ? refsPage(index, refs, from) : versePage(index, q, from);
}

/** The full results page. */
export default function BibleResultsPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { q = '', character } = useLocalSearchParams<{ q?: string; character?: string }>();
  const index = useSearchIndex();
  const person = useCharacter(character);
  const personRefs = useCharacterVerseRefs(character);
  // A character's list highlights their name; a search highlights the searched words.
  const mark = character ? (person?.name ?? '') : q;
  const list = character ? `c:${character}` : `q:${q}`;

  /** One page of the list, starting at `from` in the revealed verses. */
  const pageAt = (from: number) => listPage(index, q, character ? (personRefs ?? null) : undefined, from);
  const first = useMemo(() => listPage(index, q, character ? (personRefs ?? null) : undefined, 0), [index, q, character, personRefs]);
  const [more, setMore] = useState<MorePages>({ list: '', hits: [], next: null });

  const extra = more.list === list ? more : null;
  const hits = first ? (extra ? [...first.hits, ...extra.hits] : first.hits) : [];
  const next = extra ? extra.next : (first?.next ?? null);

  /** Finds the next 25 verses when the list nears its end. */
  const loadMore = () => {
    if (next === null) return;
    const page = pageAt(next);
    if (page) setMore({ list, hits: [...(extra?.hits ?? []), ...page.hits], next: page.next });
  };

  /** Opens a verse's chapter in the reader with the searched words (or the character's name) highlighted. */
  const open = (hit: VerseHit) =>
    router.push({ pathname: '/bible/[book]/[chapter]', params: { book: String(hit.book), chapter: String(hit.chapter), ...(mark ? { mark } : {}) } });

  const title = character ? `Verses naming ${person?.name ?? ''}` : `Results for “${q}”`;
  const empty = character ? `None of your revealed verses name ${person?.name ?? 'them'} yet.` : 'Nothing in your revealed verses matches yet.';

  return (
    <View style={styles.page}>
      <DrillHeader title={title} onBack={() => router.back()} />
      <FlatList
        data={hits}
        keyExtractor={(hit) => hit.ref}
        renderItem={({ item }) => <VerseHitCard hit={item} query={mark} onPress={open} />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.6}
        initialNumToRender={10}
        windowSize={7}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 40 }]}
        ListEmptyComponent={first ? <Text style={styles.empty}>{empty}</Text> : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: reader.page },
  list: { paddingHorizontal: gutter, paddingTop: 4, width: '100%', maxWidth: 560, alignSelf: 'center' },
  empty: { fontFamily: fonts.bold, fontSize: 15, color: text.onDarkSoft, textAlign: 'center', marginTop: 40 },
});
