// Search for the Memorization Tool, as in the prototype: a search box for references and words, book chips to
// narrow the list, and the matching verses as cards. Searching runs on the phone, once per pause in typing.

import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { DrillHeader } from '@/components/common/DrillHeader';
import { FilterChip } from '@/components/common/FilterChip';
import { SearchField } from '@/components/common/SearchField';
import { useDebounced } from '@/components/common/useDebounced';
import { VerseGrid } from '@/components/verse-memory/VerseGrid';
import type { VerseHit } from '@/data/bibleSearch';
import { bookAt, useSearchIndex } from '@/data/queries/bible';
import { reader } from '@/theme/colors';
import { gutter } from '@/theme/spacing';
import { verseMemory } from '@/theme/verseMemoryColors';

/** How long typing must pause before the list updates (ms). */
const SETTLE_MS = 200;

/** The Memorization Tool's search page. */
export default function VerseMemorySearchPage() {
  const router = useRouter();
  const index = useSearchIndex();
  const [query, setQuery] = useState('');
  const [book, setBook] = useState<number | null>(null);
  const settled = useDebounced(query, SETTLE_MS).trim().toLowerCase();

  // The books the person has verses in, in Bible order, for the chips.
  const books = useMemo(() => (index ? [...new Set(index.map((v) => v.book))] : []), [index]);
  // Each verse's reference and words in small letters, made once, so typing only compares.
  const haystacks = useMemo(() => (index ? index.map((v) => `${v.label} ${v.text}`.toLowerCase()) : []), [index]);
  const matching = useMemo(() => {
    if (!index) return [];
    return index.filter((v, i) => (book === null || v.book === book) && (!settled || haystacks[i].includes(settled)));
  }, [index, haystacks, book, settled]);

  /** Opens a verse to practice. */
  const open = useCallback((v: VerseHit) => router.push({ pathname: '/verse-memory/[ref]', params: { ref: v.ref } }), [router]);

  return (
    <View style={styles.page}>
      <DrillHeader title="Search verses" onBack={() => router.back()} />
      <View style={styles.top}>
        <SearchField value={query} onChange={setQuery} onSubmit={() => {}} autoFocus placeholder="Search verses…" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} keyboardShouldPersistTaps="handled">
          <FilterChip label="All books" on={book === null} colors={verseMemory} onPress={() => setBook(null)} />
          {books.map((b) => (
            <FilterChip key={b} label={`📖 ${bookAt(b)?.name ?? ''}`} on={book === b} colors={verseMemory} onPress={() => setBook(book === b ? null : b)} />
          ))}
        </ScrollView>
      </View>
      {index && <VerseGrid verses={matching} onOpen={open} emptyNote="No verses match. Try another word or clear a filter." />}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: reader.page },
  top: { width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: gutter, gap: 10, marginBottom: 12 },
  chips: { gap: 8 },
});
