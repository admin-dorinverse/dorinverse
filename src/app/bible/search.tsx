// Search across the person's revealed verses and the Bible's books. Covered verses are never searched:
// their words are not on the phone.

import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Results, Suggestions } from '@/components/bible/SearchResults';
import { DrillHeader } from '@/components/common/DrillHeader';
import { LoadState } from '@/components/common/LoadState';
import { findBooks, findVerses } from '@/data/bibleSearch';
import { useBibleOutline, useRevealedTexts, useRevealedVerses } from '@/data/queries/bible';
import { sampleTrendingSearches } from '@/data/sample/search';
import { reader, text } from '@/theme/colors';
import { gutter } from '@/theme/spacing';
import { fonts } from '@/theme/text';

/** How many recent searches are kept. */
const RECENT_MAX = 6;

/** The search page. */
export default function BibleSearchPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const outline = useBibleOutline();
  const revealed = useRevealedVerses();
  const texts = useRevealedTexts(revealed.data);
  const [typed, setTyped] = useState('');
  const [recent, setRecent] = useState<string[]>([]);

  const query = typed.trim();
  const low = query.toLowerCase();
  const books = outline.data ?? [];
  const counts = revealed.data?.counts ?? {};

  const verseHits = low && texts.data ? findVerses(books, texts.data, query) : [];
  const bookHits = low ? findBooks(books, counts, query) : [];

  /** Remembers a search as recent. */
  const remember = (q: string) => setRecent((list) => [q, ...list.filter((x) => x !== q)].slice(0, RECENT_MAX));

  return (
    <View style={styles.page}>
      <DrillHeader title="Search" onBack={() => router.back()} />
      <View style={styles.field}>
        <TextInput
          value={typed}
          onChangeText={setTyped}
          onSubmitEditing={() => query && remember(query)}
          placeholder="Search your revealed verses"
          placeholderTextColor="rgba(255,255,255,0.45)"
          autoFocus
          returnKeyType="search"
          style={styles.input}
        />
      </View>
      {texts.data || !low ? (
        <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 40 }]} keyboardShouldPersistTaps="handled">
          {low ? (
            <Results
              query={query}
              verses={verseHits}
              books={bookHits}
              onVerse={(hit) => {
                remember(query);
                router.push({ pathname: '/bible/[book]/[chapter]', params: { book: String(hit.book), chapter: String(hit.chapter), mark: query } });
              }}
              onBook={(book) => {
                remember(query);
                router.push(`/bible?open=${book.order}` as Href);
              }}
            />
          ) : (
            <Suggestions trending={sampleTrendingSearches} recent={recent} onPick={(q) => (setTyped(q), remember(q))} onClearRecent={() => setRecent([])} />
          )}
        </ScrollView>
      ) : (
        <LoadState failed={texts.isError || revealed.isError} onRetry={() => (revealed.isError ? revealed.refetch() : texts.refetch())} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: reader.page },
  field: { paddingHorizontal: gutter, width: '100%', maxWidth: 560, alignSelf: 'center' },
  input: {
    height: 50,
    borderRadius: 999,
    paddingHorizontal: 18,
    backgroundColor: reader.surface,
    borderWidth: 1,
    borderColor: reader.edge,
    color: text.onDark,
    fontFamily: fonts.bold,
    fontSize: 16,
  },
  body: { paddingHorizontal: gutter, width: '100%', maxWidth: 560, alignSelf: 'center' },
});
