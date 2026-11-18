// The Bible book list, opened from the Bible verses card. Books with revealed verses can be opened to their
// chapter tiles; the rest are dimmed. The search button finds words in the person's revealed verses.

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { BookInfoSheet } from '@/components/bible/BookInfoSheet';
import { BookRow } from '@/components/bible/BookRow';
import { DrillHeader, RoundButton } from '@/components/common/DrillHeader';
import { LoadState } from '@/components/common/LoadState';
import { useBibleOutline, useRevealedVerses } from '@/data/queries/bible';
import { reader, text } from '@/theme/colors';
import { gutter } from '@/theme/spacing';
import { fonts } from '@/theme/text';
import type { BibleBook } from '@/types/bible';

/** One line in the list: a testament heading or a book. */
type ListItem = { kind: 'heading'; title: string } | { kind: 'book'; book: BibleBook };

/** The book list page. */
export default function BibleBooksPage() {
  const router = useRouter();
  const outline = useBibleOutline();
  const revealed = useRevealedVerses();
  const { open } = useLocalSearchParams<{ open?: string }>();
  const [openBook, setOpenBook] = useState<number | null>(open ? Number(open) : null);
  const [infoBook, setInfoBook] = useState<BibleBook | null>(null);

  const books = outline.data ?? [];
  const items: ListItem[] = [
    { kind: 'heading', title: 'OLD TESTAMENT' },
    ...books.filter((b) => b.testament === 'OT').map((book) => ({ kind: 'book' as const, book })),
    { kind: 'heading', title: 'NEW TESTAMENT' },
    ...books.filter((b) => b.testament === 'NT').map((book) => ({ kind: 'book' as const, book })),
  ];
  const counts = revealed.data?.counts ?? {};
  const ready = outline.data && revealed.data;

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
      {ready ? (
        <FlatList
          data={items}
          keyExtractor={(item) => (item.kind === 'heading' ? item.title : item.book.code)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) =>
            item.kind === 'heading' ? (
              <Text style={[styles.heading, item.title.startsWith('NEW') && styles.headingLater]}>{item.title}</Text>
            ) : (
              <BookRow
                book={item.book}
                revealed={counts[item.book.code] ?? {}}
                open={openBook === item.book.order}
                onToggle={() => setOpenBook(openBook === item.book.order ? null : item.book.order)}
                onOpenChapter={(chapter) => router.push({ pathname: '/bible/[book]/[chapter]', params: { book: String(item.book.order), chapter: String(chapter) } })}
                onInfo={() => setInfoBook(item.book)}
              />
            )
          }
        />
      ) : (
        <LoadState
          failed={outline.isError || revealed.isError}
          onRetry={() => {
            outline.refetch();
            revealed.refetch();
          }}
        />
      )}
      <BookInfoSheet book={infoBook} revealed={infoBook ? counts[infoBook.code] ?? {} : {}} onClose={() => setInfoBook(null)} />
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
