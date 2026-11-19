// Brings the phone's lessons up to date: the outline is downloaded once and then read from the phone, and a lesson's
// content is downloaded once, the first time it is wanted, and then read from the phone. When the phone holds it,
// no download happens. The phone store is passed in, so this works the same in the app and in timing checks.

import { fetchLesson, fetchLessonOutlines } from '@/data/lessonSource';
import type { Lesson, LessonId, LessonOutline } from '@/types/lesson';

/** What a sync did: the data to show, and how many downloads it took (0 when the phone had it). */
export type LessonSyncResult<T> = { data: T; downloaded: number };

/** The phone's outline store. */
export type OutlineStore = { read: () => Promise<LessonOutline[] | null>; save: (outline: readonly LessonOutline[]) => Promise<void> };

/** The phone's lesson store. */
export type LessonStore = { read: (id: LessonId) => Promise<Lesson | null>; save: (lesson: Lesson) => Promise<void> };

/**
 * The outline: the saved copy when there is one, otherwise downloaded and saved. Development: it is never downloaded
 * again. Hookup: the sign-in download carries a version, and a new version replaces the saved copy.
 */
export async function syncOutline(saved: LessonOutline[] | null, phone: OutlineStore): Promise<LessonSyncResult<LessonOutline[]>> {
  if (saved) return { data: saved, downloaded: 0 };
  const outline = await fetchLessonOutlines();
  await phone.save(outline);
  return { data: outline, downloaded: 1 };
}

/** One lesson: from the phone when saved, otherwise downloaded and saved, so it is downloaded only once. */
export async function syncLesson(id: LessonId, phone: LessonStore): Promise<LessonSyncResult<Lesson>> {
  const saved = await phone.read(id);
  if (saved) return { data: saved, downloaded: 0 };
  const lesson = await fetchLesson(id);
  await phone.save(lesson);
  return { data: lesson, downloaded: 1 };
}
