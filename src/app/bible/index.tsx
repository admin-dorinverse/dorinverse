// The Bible book list, opened from the Bible verses card. It draws at once from the outline inside the app.
// Books with revealed verses can be opened to their chapter tiles; the rest are dimmed. The search button finds
// words in the person's revealed verses.

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { BookInfoSheet } from '@/components/bible/BookInfoSheet';
import { BookRow } from '@/components/bible/BookRow';
import { DrillHeader, RoundButton } from '@/components/common/DrillHeader';
import { LoadState } from '@/components/common/LoadState';
import { bibleOutline, useBibleLibrary } from '@/data/queries/bible';
import { reader, text } from '@/theme/colors';
import { gutter } from '@/theme/spacing';
import { fonts } from '@/theme/text';
import type { BibleBook } from '@/types/bible';

/** One line in the list: a testament heading or a book. */
type ListItem = { kind: 'heading'; title: string } | { kind: 'book'; book: BibleBook };

/** The list's lines, made once: the outline never changes while the app runs. */
const ITEMS: ListItem[] = [
  { kind: 'heading', title: 'OLD TESTAMENT' },
  ...bibleOutline.filter((b) => b.testament === 'OT').map((book) => ({ kind: 'book' as const, book })),
  { kind: 'heading', title: 'NEW TESTAMENT' },
  ...bibleOutline.filter((b) => b.testament === 'NT').map((book) => ({ kind: 'book' as const, book })),
];

/** No revealed verses, used for every book until the saved verses are loaded (a moment after the app opens). */
const NONE: Record<number, number> = {};

/** The book list page. */
export default function BibleBooksPage() {
  const router = useRouter();
  const library = useBibleLibrary();
  const { open } = useLocalSearchParams<{ open?: string }>();
  const [openBook, setOpenBook] = useState<number | null>(open ? Number(open) : null);
  // Coming back from the reader (or search) opens that book's chapters. Checked while drawing, so the list
  // never draws twice.
  const [openParam, setOpenParam] = useState(open);
  if (open !== openParam) {
    setOpenParam(open);
    if (open) setOpenBook(Number(open));
  }
  const [infoBook, setInfoBook] = useState<BibleBook | null>(null);
  const counts = library.data?.counts ?? {};

  return (
    <View style={styles.page}>
      <DrillHeader
        title="Bible verses revealed"
        onBack={() => router.back()}
        right={
          <RoundButton label="Search your revealed verses" onPress={() => router.push('/bible/search')}>
            <Text style={styles.icon}>🔍</Text>
          </RoundButton>
        }
      />
      {library.isError && !library.data ? (
        <LoadState failed onRetry={() => library.refetch()} />
      ) : (
        <FlatList
          data={ITEMS}
          keyExtractor={(item) => (item.kind === 'heading' ? item.title : item.book.code)}
          contentContainerStyle={styles.list}
          initialNumToRender={20}
          renderItem={({ item }) =>
            item.kind === 'heading' ? (
              <Text style={[styles.heading, item.title.startsWith('NEW') && styles.headingLater]}>{item.title}</Text>
            ) : (
              <BookRow
                book={item.book}
                revealed={counts[item.book.code] ?? NONE}
                open={openBook === item.book.order}
                onToggle={() => setOpenBook(openBook === item.book.order ? null : item.book.order)}
                onOpenChapter={(chapter) => router.push({ pathname: '/bible/[book]/[chapter]', params: { book: String(item.book.order), chapter: String(chapter) } })}
                onInfo={() => setInfoBook(item.book)}
              />
            )
          }
        />
      )}
      <BookInfoSheet book={infoBook} revealed={infoBook ? counts[infoBook.code] ?? NONE : NONE} onClose={() => setInfoBook(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: reader.page },
  list: { paddingHorizontal: gutter, paddingBottom: 60, width: '100%', maxWidth: 560, alignSelf: 'center' },
  heading: { fontFamily: fonts.black, fontSize: 13, letterSpacing: 1.2, color: text.goldNote, marginTop: 10, marginBottom: 2 },
  headingLater: { marginTop: 26 },
  icon: { fontSize: 18 },
});
