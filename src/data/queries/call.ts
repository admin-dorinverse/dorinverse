// The Group Voice Call's content for its screens: the lesson list for the host's picker, the lesson being done
// together, and the chapter being shown. The lesson list and lessons share the lesson pages' places in the cache,
// so on the phone a lesson already opened elsewhere shows at once.

import { useQuery } from '@tanstack/react-query';
import { fetchChapter } from '@/data/callContent';
import { loadCallLesson, loadCallOutlines } from '@/data/callLessons';
import type { LessonId } from '@/types/lesson';

/** How long a chapter nobody is showing stays in memory. */
const CHAPTER_MEMORY_MS = 10 * 60 * 1000;

/** Every lesson's outline, in Bible order. */
export function useCallOutlines() {
  return useQuery({ queryKey: ['lessons', 'outline'], queryFn: loadCallOutlines, staleTime: Infinity, gcTime: Infinity });
}

/** One lesson's content. */
export function useCallLesson(id: LessonId) {
  return useQuery({ queryKey: ['lessons', 'lesson', id], queryFn: () => loadCallLesson(id), staleTime: Infinity });
}

/** One chapter's words, for the book code (like "Gen") and chapter number. */
export function useCallChapter(code: string, chapter: number) {
  return useQuery({ queryKey: ['call', 'chapter', code, chapter], queryFn: () => fetchChapter(code, chapter), staleTime: Infinity, gcTime: CHAPTER_MEMORY_MS });
}
