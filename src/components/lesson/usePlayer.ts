// The player's moves for one stop: picking answers, Check (the answer is checked by the data layer; the player only
// sees the result), Continue, the fix rounds, and baking the stop at the end, which reveals its verses and lets the
// collections pick up what was collected. Leaving early still lets collections pick up what was collected.

import { useEffect, useRef, useState } from 'react';
import { playSound } from '@/components/common/sounds';
import { checkAnswer } from '@/data/queries/lessons';
import { bakeStop, refreshEarned } from '@/data/queries/progress';
import type { AnswerResult, LessonId, LessonStop } from '@/types/lesson';
import { advance, afterAnswer, isLastStep, pickOne, REACTIONS, startStop, type PlayerState, type PlayStep } from './playerSteps';

/** A checked pick: the result, the reaction words, and what was picked. */
export type Checked = { result: AnswerResult; reaction: string; picked: number[] };

/** Where baking the stop is: not yet, on its way, done, or it could not reach the Bible. */
export type BakeState = 'none' | 'baking' | 'done' | 'failed';

/** What the player shows and can do. */
export type Player = {
  /** Where the stop is. */
  state: PlayerState;
  /** The step showing. */
  step: PlayStep;
  /** The picks on the choice card showing. */
  picks: (number | null)[];
  /** Changes the picks. */
  setPicks: (picks: (number | null)[]) => void;
  /** True when every blank (or the one answer) is picked, so Check can be tapped. */
  canCheck: boolean;
  /** The checked pick, or null before Check. */
  checked: Checked | null;
  /** Checks the picks. */
  check: () => void;
  /** Goes on: the next card, a fix round, or the end. */
  next: () => void;
  /** Where baking is. */
  bake: BakeState;
};

/** No picks yet for a step: one empty spot, or two for a two-blank fill-in. */
function emptyPicks(step: PlayStep | undefined): (number | null)[] {
  return step?.kind === 'card' && step.card.kind === 'choice' && step.card.blanks === 2 ? [null, null] : [null];
}

/** Runs one stop of a lesson. */
export function usePlayer(lessonId: LessonId, stop: LessonStop): Player {
  const [state, setState] = useState(() => startStop(stop));
  const step = state.steps[Math.min(state.at, state.steps.length - 1)];
  const [picksFor, setPicksFor] = useState<{ key: string; picks: (number | null)[] }>({ key: step.key, picks: emptyPicks(step) });
  const picks = picksFor.key === step.key ? picksFor.picks : emptyPicks(step);
  const [checked, setChecked] = useState<Checked | null>(null);
  const [bake, setBake] = useState<BakeState>('none');
  const checking = useRef(false);

  // Leaving before the stop is baked: let the collections pick up anything collected on its cards.
  const baked = useRef(false);
  useEffect(() => () => void (baked.current ? undefined : refreshEarned()), []);

  /** Checks the picks with the data layer and shows the result. */
  const check = () => {
    if (step.kind !== 'card' || step.card.kind !== 'choice' || checking.current || checked) return;
    const card = step.card;
    const picked = picks.filter((p): p is number => p !== null);
    checking.current = true;
    void checkAnswer(card, picked)
      .then((result) => {
        playSound(result.right ? 'right' : 'wrong');
        setState((s) => afterAnswer(s, card, result.right));
        setChecked({ result, reaction: pickOne(result.right ? REACTIONS.right : REACTIONS.missed), picked });
      })
      .finally(() => {
        checking.current = false;
      });
  };

  /** Goes on; at the end of the stop, bakes it. */
  const next = () => {
    const finishing = isLastStep(state);
    setChecked(null);
    setState(advance(state));
    if (!finishing) {
      playSound('next');
      return;
    }
    playSound('reveal');
    baked.current = true;
    setBake('baking');
    bakeStop(lessonId, stop)
      .then(() => setBake('done'))
      .catch(() => setBake('failed'));
  };

  const canCheck = step.kind === 'card' && step.card.kind === 'choice' && picks.every((p) => p !== null) && !checked;
  return { state, step, picks, setPicks: (p) => setPicksFor({ key: step.key, picks: p }), canCheck, checked, check, next, bake };
}
