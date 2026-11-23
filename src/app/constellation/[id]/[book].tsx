// One Bible book's lessons in a constellation, opened from its tile: an "Up next" card when a lesson here is the one
// to pick up, then the book's lessons in Bible order, a story told over several lessons as one card (tap to see its
// parts) and a lesson on its own as its regular lesson card with its cookies. The lessons a tap may open are fetched as their cards come on
// screen, so opening one never waits.

import { useLocalSearchParams, type Href } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { FlatList } from 'react-native';
import { LIST_WINDOW, ListEmpty, ListShell, useListContentStyle } from '@/components/constellation/ListShell';
import { counted, ShelfTop } from '@/components/constellation/ListTop';
import { LessonCard } from '@/components/constellation/LessonCard';
import { StoryCard } from '@/components/constellation/StoryCards';
import { UpNextCard } from '@/components/constellation/UpNextCard';
import { usePrefetchOnScreen } from '@/components/constellation/usePrefetchOnScreen';
import { useShelf, useShelfRows, type ShelfRow } from '@/components/constellation/useShelf';
import { doneCount, type ShelfStory } from '@/data/lessonBooks';

/** A book page: "Up next" and the book's story and lesson cards. */
export default function BookPage() {
  const { book: code } = useLocalSearchParams<{ book: string }>();
  const { router, constellation, books, baked, art, look, openLesson } = useShelf();
  const book = useMemo(() => books?.find((b) => b.book.code === code), [books, code]);
  const rows = useShelfRows(book, baked);
  const onScreen = usePrefetchOnScreen();
  const contentStyle = useListContentStyle();
  const detail = book ? (book.stories ? `${counted(book.lessons.length, 'lesson', 'lessons')} · ${counted(book.stories, 'story', 'stories')}` : counted(book.lessons.length, 'lesson', 'lessons')) : '';

  /** Opens a story's page. */
  const openStory = useCallback(
    (story: ShelfStory) => router.push(`/constellation/${constellation.id}/${code}/${story.firstId}` as Href),
    [router, constellation.id, code],
  );

  /** Draws one row: "Up next", a story card, or a lone lesson's card. */
  const renderRow = ({ item }: { item: ShelfRow }) => {
    if (item.kind === 'upNext') return <UpNextCard next={item.next} baked={baked[item.next.lesson.id] ?? 0} art={art} onOpen={openLesson} />;
    const card = item.item;
    if (card.kind === 'story') return <StoryCard story={card} done={doneCount(card.lessons, baked)} look={look} onOpen={openStory} />;
    return <LessonCard lesson={card.lesson} baked={baked[card.lesson.id] ?? 0} art={art} look={look} onOpen={openLesson} />;
  };

  return (
    <ListShell backLabel={`Back to ${constellation.name}`}>
      <FlatList
        data={rows}
        keyExtractor={(r) => r.key}
        renderItem={renderRow}
        extraData={baked}
        ListHeaderComponent={book ? <ShelfTop title={book.book.name} detail={detail} color={constellation.color} /> : undefined}
        ListEmptyComponent={<ListEmpty loaded={!!books} message="No lessons in this book here." />}
        {...LIST_WINDOW}
        {...onScreen}
        contentContainerStyle={contentStyle}
      />
    </ListShell>
  );
}
