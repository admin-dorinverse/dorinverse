// The person's lesson progress for pages: stops baked and things collected, loaded when the app starts. Baking a stop
// or collecting a cookie updates memory at once, records it, and then lets the Bible and the collections pick up
// only what is new (new verses, new cards) in one round, without a restart.

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { stopVerseRefs, targetId } from '@/data/lessonLibrary';
import { bakeStop as bakeWithSource, collectCookie as collectWithSource, connectProgressKeeper, fetchProgress } from '@/data/progressSource';
import { refreshBible, useBibleLibrary } from '@/data/queries/bible';
import { refreshCharacters } from '@/data/queries/characters';
import { queryClient } from '@/data/queries/client';
import { refreshCookies } from '@/data/queries/cookies';
import { refreshPlaces } from '@/data/queries/places';
import { readProgressRecord, saveProgressRecord } from '@/data/storage/progressStore';
import type { LessonCookie, LessonId, LessonProgress, LessonStop } from '@/types/lesson';

/** The progress's place in the query cache. */
const PROGRESS_KEY = ['lessons', 'progress'] as const;

/** The progress query's settings. Kept for as long as the app runs; only baking and collecting change it. */
const progressQuery = { queryKey: PROGRESS_KEY, queryFn: fetchProgress, staleTime: Infinity, gcTime: Infinity } as const;

/**
 * Starts loading progress. The root layout calls this once, first, when the app starts. DEVELOPMENT ONLY: it first
 * connects the phone store that stands in for the server's record, so every library sees what was earned.
 */
export function startProgressLoad(): void {
  connectProgressKeeper({ read: readProgressRecord, save: saveProgressRecord });
  void queryClient.prefetchQuery(progressQuery);
}

/** The person's progress: stops baked per lesson, and everything collected. */
export function useProgress() {
  return useQuery(progressQuery);
}

/** How many stops of a lesson are baked (0 until loaded or never started). */
export function useBakedStops(id: LessonId): number {
  return useProgress().data?.baked[id] ?? 0;
}

/** Changes the progress in memory right away. */
function setProgress(change: (p: LessonProgress) => LessonProgress): void {
  const now = queryClient.getQueryData<LessonProgress>(PROGRESS_KEY);
  if (now) queryClient.setQueryData(PROGRESS_KEY, change(now));
}

/**
 * Bakes a finished stop: records it, then lets the Bible pick up the newly revealed verses and the collections the
 * cards collected during the stop, each downloading only what is new, all in one round.
 */
export async function bakeStop(id: LessonId, stop: LessonStop): Promise<void> {
  const result = await bakeWithSource(id, stop);
  setProgress((p) => ({ ...p, baked: { ...p.baked, [id]: Math.max(p.baked[id] ?? 0, result.bakedStops) } }));
  await refreshEarned();
}

/**
 * Lets the Bible and the collections pick up what was earned, each downloading only what is new, all in one round.
 * When nothing is new, nothing is downloaded. Also used when a stop is left before it is baked.
 */
export async function refreshEarned(): Promise<void> {
  await Promise.all([refreshBible(), refreshCharacters(), refreshPlaces(), refreshCookies()]).catch(() => {});
}

/**
 * Collects a pop-up's cookie. It counts as collected in memory at once (so the pop-up says so), and is recorded. Its
 * card is downloaded when the stop is baked, together with everything else new.
 */
export async function collectCookie(cookie: LessonCookie, foundIn: string): Promise<void> {
  setProgress((p) => ({ ...p, collected: new Set([...p.collected, targetId(cookie.target)]) }));
  await collectWithSource(cookie, foundIn);
}

/** One verse on the "Cookie baked!" page: its label for numbering, and its words. */
export type ShownVerse = { ref: string; text: string };

/**
 * The words of a baked stop's verses, read from the Bible library, or undefined until the library has them. Verses
 * the translation leaves out are skipped.
 */
export function useStopVerses(stop: LessonStop | undefined): ShownVerse[] | undefined {
  const bible = useBibleLibrary().data;
  return useMemo(() => {
    if (!bible || !stop) return undefined;
    const refs = stopVerseRefs(stop.firstVerse, stop.lastVerse);
    if (!refs.every((ref) => bible.refs.has(ref) && bible.texts[ref] !== undefined)) return undefined;
    return refs.flatMap((ref) => (bible.texts[ref] ? [{ ref, text: bible.texts[ref] }] : []));
  }, [bible, stop]);
}
