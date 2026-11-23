// One constellation's page, opened by flying to it in the sky: its shape and name, an "Up next" card with the lesson
// to pick up, then its kind of lessons' Bible books as tiles, Old Testament then New, in Bible order. Tapping a book
// opens its page. The "Up next" lesson is fetched in the background as it comes on screen, so opening it never waits.

import { type Href } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { BookTile, TestamentHeading } from '@/components/constellation/BookTile';
import { LIST_WINDOW, ListEmpty, ListShell, useListContentStyle } from '@/components/constellation/ListShell';
import { counted, ListTop } from '@/components/constellation/ListTop';
import { UpNextCard } from '@/components/constellation/UpNextCard';
import { usePrefetchOnScreen } from '@/components/constellation/usePrefetchOnScreen';
import { useBooksRows, useShelf, type BooksRow } from '@/components/constellation/useShelf';
import { doneCount, type LessonBook } from '@/data/lessonBooks';

/** The constellation's page: "Up next" and its books. */
export default function ConstellationPage() {
  const { router, constellation, books, baked, art, look, openLesson } = useShelf();
  const rows = useBooksRows(books, baked);
  const onScreen = usePrefetchOnScreen();
  const contentStyle = useListContentStyle();
  const detail = useMemo(() => {
    if (!books) return undefined;
    const lessons = books.reduce((n, b) => n + b.lessons.length, 0);
    return `${counted(lessons, 'lesson', 'lessons')} · ${counted(books.length, 'book', 'books')}`;
  }, [books]);

  /** Opens a book's page. */
  const openBook = useCallback((book: LessonBook) => router.push(`/constellation/${constellation.id}/${book.book.code}` as Href), [router, constellation.id]);

  /** Draws one row: "Up next", a testament heading, or two book tiles. */
  const renderRow = ({ item }: { item: BooksRow }) => {
    if (item.kind === 'upNext') return <UpNextCard next={item.next} baked={baked[item.next.lesson.id] ?? 0} art={art} onOpen={openLesson} />;
    if (item.kind === 'heading') return <TestamentHeading title={item.title} />;
    return (
      <View style={styles.pair}>
        {item.books.map((b) => (
          <BookTile key={b.book.code} book={b} done={doneCount(b.lessons, baked)} look={look} onOpen={openBook} />
        ))}
        {item.books.length === 1 && <View style={styles.gap} />}
      </View>
    );
  };

  return (
    <ListShell backLabel="Back to the sky">
      <FlatList
        data={rows}
        keyExtractor={(r) => r.key}
        renderItem={renderRow}
        extraData={baked}
        ListHeaderComponent={<ListTop constellation={constellation} detail={detail} />}
        ListEmptyComponent={<ListEmpty loaded={!!books} message="No lessons here yet." />}
        {...LIST_WINDOW}
        {...onScreen}
        contentContainerStyle={contentStyle}
      />
    </ListShell>
  );
}

const styles = StyleSheet.create({
  pair: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  gap: { flex: 1 },
});
