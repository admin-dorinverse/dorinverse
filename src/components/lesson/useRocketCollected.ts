// Which baked cookies of a lesson the rocket has taken in, remembered while the app is open, so leaving the orbit
// view and coming back does not ask for them again. Once the Bakery steps have begun, they are all in the box.

import { useState } from 'react';
import type { LessonId } from '@/types/lesson';

/** The cookies taken in per lesson, by stop place from 0, while the app is open. */
const takenIn = new Map<LessonId, Set<number>>();

/** What the orbit view needs: the cookies taken in, whether all are in, and ways to add, finish and (testing) undo. */
export type RocketCollected = { collected: ReadonlySet<number>; allIn: boolean; add: (index: number) => void; finish: () => void; forget: () => void };

/** The rocket's cookies for one lesson. `inBox` is true once the Bakery steps have begun. */
export function useRocketCollected(lessonId: LessonId, stopCount: number, inBox: boolean): RocketCollected {
  const [collected, setCollected] = useState<ReadonlySet<number>>(() => new Set(takenIn.get(lessonId)));
  const [finished, setFinished] = useState(() => (takenIn.get(lessonId)?.size ?? 0) >= stopCount && stopCount > 0);

  /** Adds a cookie the rocket took. */
  const add = (index: number) => {
    const next = new Set(takenIn.get(lessonId));
    next.add(index);
    takenIn.set(lessonId, next);
    setCollected(next);
  };

  const all = new Set(Array.from({ length: stopCount }, (_, i) => i));
  /** Puts every cookie back on its spot, for testing the steps again. */
  const forget = () => {
    takenIn.delete(lessonId);
    setCollected(new Set());
    setFinished(false);
  };

  return { collected: inBox ? all : collected, allIn: inBox || finished, add, finish: () => setFinished(true), forget };
}
