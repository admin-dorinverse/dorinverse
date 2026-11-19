// The player's order of things for one stop: its cards in order, then a fix round that asks every missed question
// again (after a short "let's correct some mistakes" from Papa Dorin), again and again until all are right. Also the
// oven bar's heat and the code's reaction words. Plain functions, no screen.

import type { ChoiceCard, LessonCard, LessonStop } from '@/types/lesson';

/** Reactions shown after a pick, from answer-explanations.md. They never say "wrong", "fail" or "bad". */
export const REACTIONS = {
  right: ['Baked just right', 'Fine work, baker!', 'Box-worthy!', "That's a keeper!", 'Perfect bake!'],
  missed: ['Underbaked', 'Still doughy', 'Came out burnt'],
} as const;

/** What Papa Dorin says before a fix round: the first round, and any round after. */
const FIX_FIRST = ["Let's correct some mistakes.", "Okay, friend. Let's fix a few cookies."] as const;
const FIX_AGAIN = 'Almost there. A couple more.';

/** Picks one of a list at random. */
export function pickOne<T>(list: readonly T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

/** One step: a card (and the fix round it is asked in, 0 the first time), or Papa Dorin's fix-round note. */
export type PlayStep = { kind: 'card'; key: string; card: LessonCard; round: number } | { kind: 'fix'; key: string; count: number; line: string };

/** Where the player is in a stop. */
export type PlayerState = {
  /** Every step so far, growing as fix rounds are added. */
  steps: PlayStep[];
  /** The step showing. */
  at: number;
  /** Questions missed in this round, to ask again. */
  missed: ChoiceCard[];
  /** The fix round now playing (0 for the first pass). */
  round: number;
  /** How hot the oven bar is, 0 to 1. It never cools. */
  heat: number;
  /** True once every question is right and the last card is done. */
  finished: boolean;
};

/** The start of a stop. */
export function startStop(stop: LessonStop): PlayerState {
  const steps: PlayStep[] = stop.cards.map((card) => ({ kind: 'card', key: `${card.card}`, card, round: 0 }));
  return { steps, at: 0, missed: [], round: 0, heat: 0, finished: steps.length === 0 };
}

/** After a pick is checked: a missed question waits for the fix round, and a right one heats the oven. */
export function afterAnswer(state: PlayerState, card: ChoiceCard, right: boolean): PlayerState {
  if (!right) return { ...state, missed: [...state.missed, card] };
  return { ...state, heat: Math.max(state.heat, (state.at + 1) / state.steps.length) };
}

/** True when moving on from the step showing will finish the stop. */
export function isLastStep(state: PlayerState): boolean {
  return state.at >= state.steps.length - 1 && state.missed.length === 0;
}

/** Moves to the next step, adding a fix round when questions were missed, or finishes the stop. */
export function advance(state: PlayerState): PlayerState {
  if (state.at < state.steps.length - 1) {
    const at = state.at + 1;
    return { ...state, at, heat: Math.max(state.heat, at / state.steps.length) };
  }
  if (state.missed.length > 0) {
    const round = state.round + 1;
    const line = round === 1 ? pickOne(FIX_FIRST) : FIX_AGAIN;
    const fix: PlayStep = { kind: 'fix', key: `fix-${round}`, count: state.missed.length, line };
    const again: PlayStep[] = state.missed.map((card) => ({ kind: 'card', key: `${card.card}-${round}`, card, round }));
    const steps = [...state.steps, fix, ...again];
    return { ...state, steps, at: state.at + 1, missed: [], round, heat: Math.max(state.heat, (state.at + 1) / steps.length) };
  }
  return { ...state, finished: true, heat: 1 };
}

/** The answers in the order to show in a fix round: turned a little each round so they are not in the same spots. */
export function answersForRound<T>(answers: readonly T[], round: number, keepOrder: boolean): readonly T[] {
  if (keepOrder || round === 0 || answers.length < 2) return answers;
  const shift = round % answers.length;
  return [...answers.slice(shift), ...answers.slice(0, shift)];
}
