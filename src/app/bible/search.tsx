// Quick search over the person's revealed Bible. Nothing shows until something is typed. One letter shows the
// books whose names start with it (with their open chapters) and matching suggestions; two letters or more show a
// short list of matching suggestions, references and verses, then "View all results". Covered verses are never
// searched: their words are not on the phone.

import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BookChapterRow } from '@/components/bible/BookChapterRow';
import { SearchField } from '@/components/common/SearchField';
import { SuggestionRow } from '@/components/bible/SuggestionRow';
import { RoundButton } from '@/components/common/DrillHeader';
import { playSound } from '@/components/common/sounds';
import { useDebounced } from '@/components/common/useDebounced';
import { matchBooks, matchReferences, matchSuggestions, versePage } from '@/data/bibleSearch';
import { bibleOutline, useBibleLibrary, useSearchIndex } from '@/data/queries/bible';
import { sampleSuggestedSearches } from '@/data/sample/search';
import { readRecentSearches, rememberSearch } from '@/data/storage/recentSearches';
import { navy, reader, text } from '@/theme/colors';
import { gutter } from '@/theme/spacing';
import { fonts } from '@/theme/text';

/** How long typing must pause before searching (ms). */
const TYPING_PAUSE_MS = 150;

/** How many of each kind of row the quick list shows. */
const SHOW = { recent: 3, suggested: 4, references: 5, verses: 4 } as const;

/** The quick search page. */
export default function BibleSearchPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const library = useBibleLibrary().data;
  const index = useSearchIndex();
  const [typed, setTyped] = useState('');
  const [recent, setRecent] = useState(readRecentSearches);
  const settled = useDebounced(typed.trim(), TYPING_PAUSE_MS);
  // Clearing the box empties the page at once, without waiting for the pause.
  const query = typed.trim() ? settled : '';

  const found = useMemo(() => {
    if (!query || !library || !index) return null;
    const oneLetter = query.length === 1;
    const suggested = sampleSuggestedSearches.filter((s) => !recent.some((r) => r.toLowerCase() === s.toLowerCase()));
    return {
      oneLetter,
      books: oneLetter ? matchBooks(bibleOutline, library.counts, query) : [],
      references: oneLetter ? [] : matchReferences(bibleOutline, library, query, SHOW.references),
      verses: oneLetter ? [] : versePage(index, query, 0, SHOW.verses).hits,
      recentRows: matchSuggestions(recent, query, SHOW.recent),
      suggestedRows: matchSuggestions(suggested, query, SHOW.suggested),
    };
  }, [query, library, index, recent]);

  /** Opens a chapter in the reader, with the searched words highlighted when given. */
  const openChapter = (book: number, chapter: number, mark?: string) =>
    router.push({ pathname: '/bible/[book]/[chapter]', params: { book: String(book), chapter: String(chapter), ...(mark ? { mark } : {}) } });
  /** Remembers a search and shows all its results. */
  const showAll = (term: string) => {
    if (!term.trim()) return;
    setRecent(rememberSearch(term));
    router.push({ pathname: '/bible/results', params: { q: term.trim() } });
  };

  return (
    <View style={styles.page}>
      <View style={[styles.top, { paddingTop: insets.top + 10 }]}>
        <RoundButton label="Back" onPress={() => router.back()}>
          <Text style={styles.arrow}>←</Text>
        </RoundButton>
        <View style={styles.fieldBox}>
          <SearchField value={typed} onChange={setTyped} onSubmit={() => showAll(typed)} autoFocus />
        </View>
      </View>
      {found && (
        <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 40 }]} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
          {found.books.map(({ book, chapters }) => (
            <BookChapterRow key={book.code} book={book} chapters={chapters} onChapter={(c) => openChapter(book.order, c)} />
          ))}
          {found.recentRows.map((term) => (
            <SuggestionRow key={`r-${term}`} kind="recent" label={term} onPress={() => showAll(term)} />
          ))}
          {found.suggestedRows.map((term) => (
            <SuggestionRow key={`s-${term}`} kind="suggested" label={term} onPress={() => showAll(term)} onFill={() => setTyped(term)} />
          ))}
          {found.references.map((r) => (
            <SuggestionRow key={`f-${r.label}`} kind="reference" label={r.label} onPress={() => openChapter(r.book, r.chapter)} />
          ))}
          {found.verses.map((hit) => (
            <SuggestionRow key={`v-${hit.ref}`} kind="verse" label={hit.label} detail={hit.text} onPress={() => openChapter(hit.book, hit.chapter, query)} />
          ))}
          {!found.oneLetter && (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                playSound('tap');
                showAll(query);
              }}
              style={({ pressed }) => [styles.viewAll, pressed && styles.pressed]}
            >
              <Text style={styles.viewAllText}>🔍 View all results for “{query}”</Text>
            </Pressable>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: reader.page },
  top: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingBottom: 12 },
  fieldBox: { flex: 1 },
  arrow: { fontFamily: fonts.black, fontSize: 20, color: text.onDark },
  body: { paddingHorizontal: gutter, paddingTop: 8, width: '100%', maxWidth: 560, alignSelf: 'center' },
  viewAll: { alignSelf: 'flex-start', marginTop: 14, borderRadius: 999, paddingVertical: 11, paddingHorizontal: 18, backgroundColor: reader.verseNumber },
  pressed: { opacity: 0.75 },
  viewAllText: { fontFamily: fonts.black, fontSize: 15, color: navy },
});
