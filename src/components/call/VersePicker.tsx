// The host picks a Bible book and chapter to show everyone, on a full-screen sheet in the call's look: the books
// of the Old and New Testament from the outline inside the app, then that book's chapters as round tiles. The
// chapter shows on everyone's screen with its first verse lit.

import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { playSound } from '@/components/common/sounds';
import { BIBLE_OUTLINE } from '@/data/bibleOutline';
import { call } from '@/theme/callColors';
import { text } from '@/theme/colors';
import { gutter } from '@/theme/spacing';
import { fonts } from '@/theme/text';
import type { BibleBook } from '@/types/bible';
import type { VerseShowState } from '@/types/call';

/** Props for the verse picker. */
type VersePickerProps = {
  /** Shows the picked chapter (starting at a verse) to everyone. */
  onPick: (show: VerseShowState) => void;
  /** Closes without picking. */
  onClose: () => void;
};

/** One line of the book list: a testament heading or a book. */
type BookItem = { kind: 'heading'; title: string } | { kind: 'book'; book: BibleBook };

/** The book list's lines, made once: the outline never changes while the app runs. */
const BOOK_ITEMS: BookItem[] = [
  { kind: 'heading', title: 'OLD TESTAMENT' },
  ...BIBLE_OUTLINE.filter((b) => b.testament === 'OT').map((book) => ({ kind: 'book' as const, book })),
  { kind: 'heading', title: 'NEW TESTAMENT' },
  ...BIBLE_OUTLINE.filter((b) => b.testament === 'NT').map((book) => ({ kind: 'book' as const, book })),
];

/** How many chapter tiles fit across. */
const TILES_ACROSS = 5;

/** The chapter numbers of a book, 1 to its last. */
function chaptersOf(book: BibleBook): number[] {
  return book.chapterVerses.map((_, i) => i + 1);
}

/** The host picks a Bible book and chapter to show everyone. */
export function VersePicker({ onPick, onClose }: VersePickerProps) {
  const insets = useSafeAreaInsets();
  const [book, setBook] = useState<BibleBook | null>(null);

  /** A tap sound, then the action. */
  const tap = (go: () => void) => () => {
    playSound('tap');
    go();
  };

  return (
    <View style={[styles.sheet, { paddingTop: insets.top + 12 }]} accessibilityViewIsModal>
      <View style={styles.inner}>
        <View style={styles.head}>
          <View style={styles.headWords}>
            <Text style={styles.title}>{book ? book.name : 'Show a verse'}</Text>
            <Text style={styles.line}>{book ? 'Pick a chapter to show everyone' : 'Pick a book'}</Text>
          </View>
          {book && (
            <Pressable accessibilityRole="button" onPress={tap(() => setBook(null))} style={styles.pill}>
              <Text style={styles.pillText}>Books</Text>
            </Pressable>
          )}
          <Pressable accessibilityRole="button" onPress={tap(onClose)} style={styles.pill}>
            <Text style={styles.pillText}>Close</Text>
          </Pressable>
        </View>
        {book ? (
          <FlatList
            key={book.code}
            data={chaptersOf(book)}
            numColumns={TILES_ACROSS}
            keyExtractor={(n) => String(n)}
            columnWrapperStyle={styles.tileRow}
            contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
            initialNumToRender={40}
            renderItem={({ item, index }) => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${book.name} ${item}`}
                onPress={tap(() => onPick({ kind: 'verse', book: book.code, chapter: item, verse: 1 }))}
                style={[styles.tile, (index + 1) % TILES_ACROSS !== 0 && styles.tileGap]}
              >
                <Text style={styles.tileText}>{item}</Text>
              </Pressable>
            )}
          />
        ) : (
          <FlatList
            data={BOOK_ITEMS}
            keyExtractor={(item) => (item.kind === 'heading' ? item.title : item.book.code)}
            contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
            initialNumToRender={16}
            renderItem={({ item }) =>
              item.kind === 'heading' ? (
                <Text style={styles.heading}>{item.title}</Text>
              ) : (
                <Pressable accessibilityRole="button" onPress={tap(() => setBook(item.book))} style={styles.row}>
                  <Text style={styles.rowName}>{item.book.name}</Text>
                  <Text style={styles.rowCount}>{item.book.chapterVerses.length === 1 ? '1 chapter' : `${item.book.chapterVerses.length} chapters`}</Text>
                </Pressable>
              )
            }
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: 10,
    backgroundColor: call.page,
    backgroundImage: `radial-gradient(120% 70% at 50% 0%, ${call.pageGlow[0]} 0%, ${call.pageGlow[1]} 55%, ${call.pageGlow[2]} 100%)`,
  },
  inner: { flex: 1, width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: gutter, gap: 14 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headWords: { flex: 1, gap: 2 },
  title: { fontFamily: fonts.black, fontSize: 22, color: text.onDark },
  line: { fontFamily: fonts.bold, fontSize: 13, color: text.onDarkSoft },
  pill: { height: 40, borderRadius: 20, borderWidth: 1, borderColor: call.glassEdge, backgroundColor: call.glassFill, paddingHorizontal: 14, justifyContent: 'center' },
  pillText: { fontFamily: fonts.extraBold, fontSize: 13, color: text.onDark },
  list: { gap: 8 },
  heading: { fontFamily: fonts.extraBold, fontSize: 11.5, letterSpacing: 1.2, color: text.goldNote, marginTop: 10, marginBottom: 2 },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 52, borderRadius: 16, borderWidth: 1, borderColor: call.glassEdge, backgroundColor: call.glassFillSoft, paddingHorizontal: 16 },
  rowName: { flex: 1, fontFamily: fonts.extraBold, fontSize: 16, color: text.onDark },
  rowCount: { fontFamily: fonts.bold, fontSize: 12.5, color: text.onDarkSoft },
  tileRow: { justifyContent: 'flex-start' },
  tile: { width: '18.4%', aspectRatio: 1, borderRadius: 18, borderWidth: 1, borderColor: call.toolVerseEdge, backgroundColor: call.toolVerseFill, alignItems: 'center', justifyContent: 'center' },
  tileGap: { marginRight: '2%' },
  tileText: { fontFamily: fonts.black, fontSize: 18, color: call.toolVerse },
});
