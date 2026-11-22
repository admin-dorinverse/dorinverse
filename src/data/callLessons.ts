// Where the Group Voice Call gets the lesson list and a lesson's cards, in the browser (the web join page). The
// browser keeps nothing on the device, so both come straight from the database and stay in memory while the call
// page is open. The phone reads its own saved copies instead (callLessons.native.ts).

import { fetchLesson, fetchLessonOutlines } from '@/data/lessonSource';
import type { Lesson, LessonId, LessonOutline } from '@/types/lesson';

/** Every lesson's outline, in Bible order. */
export function loadCallOutlines(): Promise<LessonOutline[]> {
  return fetchLessonOutlines();
}

/** One lesson's content. */
export function loadCallLesson(id: LessonId): Promise<Lesson> {
  return fetchLesson(id);
}
