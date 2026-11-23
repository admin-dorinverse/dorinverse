// Gets the lessons whose cards are on screen ready in the background, so opening one never waits on a download. The
// list tells it which rows show; each row names the lessons to have ready, and each lesson is fetched once (a few at
// a time) and kept on the phone.

import { useState } from 'react';
import { prefetchLessons } from '@/data/queries/lessons';
import type { LessonId } from '@/types/lesson';

/** How much of a row must show before it counts as on screen. */
const VIEWABILITY = { itemVisiblePercentThreshold: 30, minimumViewTime: 150 } as const;

/** A list row: it names the lessons a tap on it may open (none for a book tile). */
export type PrefetchRow = { lessonIds: readonly LessonId[] };

/** What a list needs to report the rows on screen: a fixed setting and a fixed handler, as FlatList asks. */
export type OnScreenProps = {
  /** How much of a row must show, and for how long, before it counts. */
  viewabilityConfig: typeof VIEWABILITY;
  /** Told by the list which rows are on screen now. */
  onViewableItemsChanged: (info: { viewableItems: { item: PrefetchRow }[] }) => void;
};

/** The list props that fetch on-screen lessons. They stay the same object for the list's whole life. */
export function usePrefetchOnScreen(): OnScreenProps {
  const [props] = useState<OnScreenProps>(() => ({
    viewabilityConfig: VIEWABILITY,
    onViewableItemsChanged: ({ viewableItems }) => {
      const ids = viewableItems.flatMap((v) => v.item?.lessonIds ?? []);
      if (ids.length) prefetchLessons(ids);
    },
  }));
  return props;
}
