// What the search page lists: before typing, trending and recent searches; after typing, the revealed verses
// and the books that match. Characters and places join these results when their pages are built.

import { Pressable, StyleSheet, Text, View } from 'react-native';
import { playSound } from '@/components/common/sounds';
import { reader, text } from '@/theme/colors';
import { fonts, readingFont } from '@/theme/text';
import type { BookHit, VerseHit } from '@/data/bibleSearch';
import type { BibleBook } from '@/types/bible';

/** Props for the starting suggestions. */
type SuggestionsProps = {
  /** Searches many people are making. */
  trending: readonly string[];
  /** The person's own recent searches, newest first. */
  recent: readonly string[];
  /** Runs a search. */
  onPick: (query: string) => void;
  /** Clears the recent searches. */
  onClearRecent: () => void;
};

/** Trending and recent searches, shown before anything is typed. */
export function Suggestions({ trending, recent, onPick, onClearRecent }: SuggestionsProps) {
  return (
    <View>
      <Text style={styles.heading}>Trending Searches</Text>
      {trending.map((t) => (
        <Row key={t} icon="🔥" label={t} onPress={() => onPick(t)} />
      ))}
      {recent.length > 0 && (
        <>
          <View style={styles.headRow}>
            <Text style={[styles.heading, styles.headingFlex]}>Recent Searches</Text>
            <Pressable accessibilityRole="button" onPress={onClearRecent} style={styles.clear}>
              <Text style={styles.clearText}>Clear</Text>
            </Pressable>
          </View>
          {recent.map((t) => (
            <Row key={t} icon="🕐" label={t} onPress={() => onPick(t)} />
          ))}
        </>
      )}
    </View>
  );
}

/** One suggestion row. */
function Row({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.row}>
      <Text style={styles.rowIcon}>{icon}</Text>
      <Text style={styles.rowText}>{label}</Text>
    </Pressable>
  );
}

/** Props for the results. */
type ResultsProps = {
  /** What was searched. */
  query: string;
  /** Matching revealed verses. */
  verses: readonly VerseHit[];
  /** Matching books, with whether each has anything revealed. */
  books: readonly BookHit[];
  /** Opens a verse in the reader. */
  onVerse: (hit: VerseHit) => void;
  /** Opens a book in the book list. */
  onBook: (book: BibleBook) => void;
};

/** The search results. */
export function Results({ query, verses, books, onVerse, onBook }: ResultsProps) {
  const nothing = verses.length === 0 && books.length === 0;
  return (
    <View>
      <Text style={styles.heading}>Results for “{query}”</Text>
      {verses.length > 0 && <Text style={styles.subheading}>Verses</Text>}
      {verses.map((hit) => (
        <Pressable
          key={hit.ref}
          accessibilityRole="button"
          onPress={() => {
            playSound('tap');
            onVerse(hit);
          }}
          style={styles.card}
        >
          <Text style={styles.cardRef}>{hit.label}</Text>
          <Text style={styles.cardText} numberOfLines={3}>
            {hit.text}
          </Text>
        </Pressable>
      ))}
      {books.length > 0 && <Text style={styles.subheading}>Books</Text>}
      <View style={styles.bookGrid}>
        {books.map(({ book, open }) => (
          <Pressable
            key={book.code}
            accessibilityRole="button"
            disabled={!open}
            onPress={() => {
              playSound('tap');
              onBook(book);
            }}
            style={[styles.bookCard, !open && styles.bookLocked]}
          >
            <Text style={styles.bookIcon}>📚</Text>
            <Text style={styles.bookName}>{book.name}</Text>
            <Text style={styles.bookSub}>
              {book.chapterVerses.length} {book.chapterVerses.length === 1 ? 'chapter' : 'chapters'}
            </Text>
          </Pressable>
        ))}
      </View>
      {nothing && <Text style={styles.empty}>Nothing in your revealed verses matches yet.</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  heading: { fontFamily: fonts.black, fontSize: 19, color: text.onDark, marginTop: 18, marginBottom: 8 },
  headingFlex: { flex: 1 },
  headRow: { flexDirection: 'row', alignItems: 'center' },
  subheading: { fontFamily: fonts.black, fontSize: 13, letterSpacing: 1, color: text.goldNote, marginTop: 14, marginBottom: 8 },
  clear: { backgroundColor: reader.surface, borderRadius: 999, paddingVertical: 7, paddingHorizontal: 14, marginTop: 10 },
  clearText: { fontFamily: fonts.extraBold, fontSize: 13, color: text.onDark },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  rowIcon: { fontSize: 18, width: 26, textAlign: 'center' },
  rowText: { fontFamily: fonts.bold, fontSize: 16, color: text.onDark },
  card: { borderRadius: 20, padding: 14, marginBottom: 10, backgroundColor: reader.surface, borderWidth: 1, borderColor: reader.edge, borderTopColor: 'rgba(255,255,255,0.26)' },
  cardRef: { fontFamily: fonts.black, fontSize: 14, color: reader.verseNumber, marginBottom: 4 },
  cardText: { fontFamily: readingFont, fontSize: 15.5, lineHeight: 23, color: reader.text },
  bookGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  bookCard: { width: '47%', borderRadius: 20, paddingVertical: 14, alignItems: 'center', gap: 2, backgroundColor: reader.surface, borderWidth: 1, borderColor: reader.edge },
  bookLocked: { opacity: 0.45 },
  bookIcon: { fontSize: 26 },
  bookName: { fontFamily: fonts.black, fontSize: 15, color: text.onDark },
  bookSub: { fontFamily: fonts.bold, fontSize: 12, color: 'rgba(255,255,255,0.6)' },
  empty: { fontFamily: fonts.bold, fontSize: 15, color: text.onDarkSoft, textAlign: 'center', marginTop: 24 },
});
