// One story's page, opened from its card on a book page: its name, the chapters it spans and how many parts are
// done, then each part as a lesson card in Bible order. The part to pick up next has a gold edge. Each part's lesson
// is fetched as its card comes on screen, so opening one never waits.

import { useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { FlatList } from 'react-native';
import { LessonCard } from '@/components/constellation/LessonCard';
import { LIST_WINDOW, ListEmpty, ListShell, useListContentStyle } from '@/components/constellation/ListShell';
import { ShelfTop } from '@/components/constellation/ListTop';
import { usePrefetchOnScreen } from '@/components/constellation/usePrefetchOnScreen';
import { usePartRows, useShelf, type PartRow } from '@/components/constellation/useShelf';
import { doneCount, upNextIn, type ShelfStory } from '@/data/lessonBooks';

/** A story page: the story's parts as lesson cards. */
export default function StoryPage() {
  const { book: code, story: first } = useLocalSearchParams<{ book: string; story: string }>();
  const { books, baked, art, look, openLesson, constellation } = useShelf();
  const story = useMemo(() => {
    const items = books?.find((b) => b.book.code === code)?.items;
    return items?.find((i): i is ShelfStory => i.kind === 'story' && String(i.firstId) === first);
  }, [books, code, first]);
  const rows = usePartRows(story?.lessons);
  const upNextId = useMemo(() => (story ? upNextIn(story.lessons, baked)?.lesson.id : undefined), [story, baked]);
  const onScreen = usePrefetchOnScreen();
  const contentStyle = useListContentStyle();

  /** Draws one part's card; the part to pick up next is drawn in gold. */
  const renderRow = ({ item }: { item: PartRow }) => (
    <LessonCard lesson={item.lesson} baked={baked[item.lesson.id] ?? 0} art={art} look={look} upNext={item.lesson.id === upNextId} onOpen={openLesson} />
  );

  return (
    <ListShell backLabel="Back to the book">
      <FlatList
        data={rows}
        keyExtractor={(r) => r.key}
        renderItem={renderRow}
        extraData={baked}
        ListHeaderComponent={story ? <ShelfTop title={story.name} detail={`${story.span} · ${doneCount(story.lessons, baked)} of ${story.lessons.length} done`} color={constellation.color} /> : undefined}
        ListEmptyComponent={<ListEmpty loaded={!!books} message="This story isn't here." />}
        {...LIST_WINDOW}
        {...onScreen}
        contentContainerStyle={contentStyle}
      />
    </ListShell>
  );
}
