// The lessons' data for pages. The outline of every lesson loads from the phone when the app starts (downloaded once,
// the very first time). A lesson's content is fetched in the background as its card comes on screen in a list, a few
// at a time, and kept on the phone, so opening a lesson or a stop never waits on a download.

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { LESSON_TYPE_OF, lessonRows, type LessonRow } from '@/data/lessonLibrary';
import { checkAnswer as checkWithSource } from '@/data/lessonSource';
import { syncLesson, syncOutline } from '@/data/lessonSync';
import { queryClient } from '@/data/queries/client';
import { readSavedLesson, readSavedOutline, saveLesson, saveOutline } from '@/data/storage/lessonStore';
import type { AnswerResult, ChoiceCard, Lesson, LessonId, LessonOutline } from '@/types/lesson';

export { markText, targetId, type LessonRow, type TextPiece } from '@/data/lessonLibrary';

/** The outline's place in the query cache. */
const OUTLINE_KEY = ['lessons', 'outline'] as const;

/** A lesson's place in the query cache. */
const lessonKey = (id: LessonId) => ['lessons', 'lesson', id] as const;

/** How many lessons download at the same time while a list scrolls. */
const AT_ONCE = 2;

/** How long a lesson nobody is looking at stays in memory; it stays on the phone either way. */
const LESSON_MEMORY_MS = 10 * 60 * 1000;

/** Loads the outline: from the phone, or downloaded once and saved. */
async function loadOutline(): Promise<LessonOutline[]> {
  const started = Date.now();
  const result = await syncOutline(await readSavedOutline(), { read: readSavedOutline, save: saveOutline });
  if (__DEV__) console.log(`[lessons] outline of ${result.data.length} lessons ready in ${Date.now() - started} ms; ${result.downloaded} downloads`);
  return result.data;
}

/** The outline query's settings, shared by the start-up load and the pages. */
const outlineQuery = { queryKey: OUTLINE_KEY, queryFn: loadOutline, staleTime: Infinity, gcTime: Infinity } as const;

/** Starts loading the outline in the background. The root layout calls this once when the app starts. */
export function startLessonsLoad(): void {
  void queryClient.prefetchQuery(outlineQuery);
}

/** Every lesson's outline, in Bible order. */
export function useLessonOutlines() {
  return useQuery(outlineQuery);
}

/** The list rows for a constellation: its kind of lessons with story-group headings, or undefined until loaded. */
export function useLessonRows(constellationId: string): LessonRow[] | undefined {
  const outline = useLessonOutlines().data;
  return useMemo(() => {
    const type = LESSON_TYPE_OF[constellationId];
    return outline && type ? lessonRows(outline, type) : undefined;
  }, [outline, constellationId]);
}

/** One lesson's outline, or undefined until loaded. */
export function useLessonOutline(id: LessonId): LessonOutline | undefined {
  const outline = useLessonOutlines().data;
  return useMemo(() => outline?.find((l) => l.id === id), [outline, id]);
}

/** Loads one lesson: from the phone, or downloaded once and saved. */
async function loadLesson(id: LessonId): Promise<Lesson> {
  const started = Date.now();
  const result = await syncLesson(id, { read: readSavedLesson, save: saveLesson });
  if (__DEV__ && result.downloaded) console.log(`[lessons] lesson ${id} downloaded in ${Date.now() - started} ms`);
  return result.data;
}

/** A lesson query's settings. */
const lessonQuery = (id: LessonId) => ({ queryKey: lessonKey(id), queryFn: () => loadLesson(id), staleTime: Infinity, gcTime: LESSON_MEMORY_MS }) as const;

/** One lesson's content. It is normally already in memory, fetched while its card showed in the list. */
export function useLesson(id: LessonId) {
  return useQuery(lessonQuery(id));
}

/** Lessons waiting to be fetched, newest wish first, and how many are being fetched now. */
const waiting: LessonId[] = [];
let running = 0;

/** Fetches the next waiting lessons, at most AT_ONCE at a time. */
function pump(): void {
  while (running < AT_ONCE && waiting.length > 0) {
    const id = waiting.shift()!;
    if (queryClient.getQueryData(lessonKey(id))) continue;
    running += 1;
    void queryClient.prefetchQuery(lessonQuery(id)).finally(() => {
      running -= 1;
      pump();
    });
  }
}

/**
 * Gets the lessons whose cards are on screen ready in the background: saved ones are read from the phone, others
 * downloaded once and saved. At most AT_ONCE run at a time; lessons already in memory are skipped. Only the newest
 * wishes are kept, so a fast scroll never builds up a long line of downloads.
 */
export function prefetchLessons(ids: readonly LessonId[]): void {
  for (const id of ids) {
    if (queryClient.getQueryData(lessonKey(id)) || waiting.includes(id)) continue;
    waiting.unshift(id);
  }
  waiting.splice(8);
  pump();
}

/** Checks a pick on a choice card. Pages only see the result, never the answer key. */
export function checkAnswer(card: ChoiceCard, picked: readonly number[]): Promise<AnswerResult> {
  return checkWithSource(card, picked);
}
