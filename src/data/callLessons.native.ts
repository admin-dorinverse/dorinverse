// Where the Group Voice Call gets the lesson list and a lesson's cards, on the phone: from the phone's saved copies
// (the same ones the lesson pages use), downloading and saving only what the phone doesn't have yet. The browser
// gets them from the database instead (callLessons.ts).

import { syncLesson, syncOutline } from '@/data/lessonSync';
import { readSavedLesson, readSavedOutline, saveLesson, saveOutline } from '@/data/storage/lessonStore';
import type { Lesson, LessonId, LessonOutline } from '@/types/lesson';

/** Every lesson's outline, in Bible order: the saved copy, or downloaded once and saved. */
export async function loadCallOutlines(): Promise<LessonOutline[]> {
  return (await syncOutline(await readSavedOutline(), { read: readSavedOutline, save: saveOutline })).data;
}

/** One lesson's content: the saved copy, or downloaded once and saved. */
export async function loadCallLesson(id: LessonId): Promise<Lesson> {
  return (await syncLesson(id, { read: readSavedLesson, save: saveLesson })).data;
}
