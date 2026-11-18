// A list of revealed verses: every one that matches a search (opened from "View all results"), or every one that
// names a character or a place (opened from "Find in scripture" on its page). The list finds 25 at a time and stops
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
import { usePlace, usePlaceVerseRefs } from '@/data/queries/places';
import { reader, text } from '@/theme/colors';
import { gutter } from '@/theme/spacing';
import { fonts } from '@/theme/text';
import type { VerseRef } from '@/types/bible';

/** The pages found after the first, for one list: which list, its matches and where the next page starts. */
type MorePages = { list: string; hits: VerseHit[]; next: number | null };

/**
 * One page of the list from `from` on: search matches, or the verses in `refs` when the list is a character's or
 * a place's (`refs` is null while it is still loading). Null until the revealed verses are loaded.
 */
function listPage(index: SearchIndex | undefined, q: string, refs: ReadonlySet<VerseRef> | null | undefined, from: number): VersePage | null {
  if (!index || refs === null) return null;
  return refs ? refsPage(index, refs, from) : versePage(index, q, from);
}

/** The full results page. */
export default function BibleResultsPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { q = '', character, place } = useLocalSearchParams<{ q?: string; character?: string; place?: string }>();
  const index = useSearchIndex();
  const person = useCharacter(character);
  const personRefs = useCharacterVerseRefs(character);
  const spot = usePlace(place);
  const spotRefs = usePlaceVerseRefs(place);
  // A character's or place's list highlights its name; a search highlights the searched words.
  const named = character ? person?.name : place ? spot?.name : undefined;
  const mark = character || place ? (named ?? '') : q;
  const list = character ? `c:${character}` : place ? `p:${place}` : `q:${q}`;
  // The verse labels to list, null while they load, or undefined for a search.
  const refs = character ? (personRefs ?? null) : place ? (spotRefs ?? null) : undefined;

  /** One page of the list, starting at `from` in the revealed verses. */
  const pageAt = (from: number) => listPage(index, q, refs, from);
  const first = useMemo(() => listPage(index, q, refs, 0), [index, q, refs]);
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

  /** Opens a verse's chapter in the reader with the searched words (or the character's or place's name) highlighted. */
  const open = (hit: VerseHit) =>
    router.push({ pathname: '/bible/[book]/[chapter]', params: { book: String(hit.book), chapter: String(hit.chapter), ...(mark ? { mark } : {}) } });

  const title = character || place ? `Verses naming ${named ?? ''}` : `Results for “${q}”`;
  const empty = character || place ? `None of your revealed verses name ${named ?? 'it'} yet.` : 'Nothing in your revealed verses matches yet.';

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
