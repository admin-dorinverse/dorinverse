// The plain work behind doing a lesson together on the call, with no screen: finding the card being shown, what comes
// after it, whether a pick is right, the reaction words, and following Papa Dorin through the explanation he reads
// aloud (which sentence he's on, from the words he has said so far).

import { REACTIONS } from '@/components/lesson/playerSteps';
import type { CallShow, LessonShowState } from '@/types/call';
import type { ChoiceCard, Lesson, LessonCard, LessonStop } from '@/types/lesson';

/** The stop and card being shown, or null when the lesson doesn't have them. */
export function cardAt(lesson: Lesson, show: LessonShowState): { stop: LessonStop; card: LessonCard } | null {
  const stop = lesson.stops.find((s) => s.stop === show.stop);
  const card = stop?.cards.find((c) => c.card === show.card);
  return stop && card ? { stop, card } : null;
}

/** What the host shows after this card: the next card in the stop, the next stop's first card, or the call screen. */
export function nextShow(lesson: Lesson, show: LessonShowState): CallShow {
  const stops = [...lesson.stops].sort((a, b) => a.stop - b.stop);
  const at = stops.findIndex((s) => s.stop === show.stop);
  const cards = at >= 0 ? stops[at].cards : [];
  const cardAt = cards.findIndex((c) => c.card === show.card);
  if (cardAt >= 0 && cardAt < cards.length - 1) return { ...show, card: cards[cardAt + 1].card, step: 'card' };
  const next = stops.slice(at + 1).find((s) => s.cards.length > 0);
  if (next) return { ...show, stop: next.stop, card: next.cards[0].card, step: 'card' };
  return { kind: 'lobby' };
}

/** True when a pick (one answer, or one per blank in order) matches the right answers, as the lesson player checks. */
export function isRightPick(card: ChoiceCard, rightIds: readonly number[], picked: readonly number[]): boolean {
  return picked.length === rightIds.length && picked.every((id, i) => (card.blanks === 2 ? id === rightIds[i] : rightIds.includes(id)));
}

/** How many answers a full pick has: one per blank on a two-blank fill-in, otherwise one. */
export function pickSize(card: ChoiceCard): number {
  return card.type === 'fill_blank' && card.blanks === 2 ? 2 : 1;
}

/** The reaction words for a result: the same on every phone for the same card and result. */
export function reactionFor(show: LessonShowState, right: boolean): string {
  const list = right ? REACTIONS.right : REACTIONS.missed;
  return list[(show.passageId + show.stop * 7 + show.card * 13) % list.length];
}

/** One sentence of the explanation: its words, and whether it starts a new paragraph. */
export type ReadSentence = { text: string; opensParagraph: boolean };

/** The explanation split into sentences, so the one he's reading can light up. */
export function sentencesOf(paragraphs: readonly string[]): ReadSentence[] {
  const out: ReadSentence[] = [];
  paragraphs.forEach((p) => {
    const parts = p.match(/[^.!?]+(?:[.!?]+["”’')\]]*\s*|$)/g) ?? [p];
    parts.forEach((text, i) => {
      if (text.trim() !== '') out.push({ text, opensParagraph: i === 0 && out.length > 0 });
    });
  });
  return out;
}

/** Words for matching what he said with what's written: lower case, letters and digits only. */
export function wordsOf(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[^a-z0-9']+/g, ' ')
    .split(' ')
    .filter(Boolean);
}

/** How many of the written words match the end of what he has said in this many words, or -1. */
function matchEnd(written: readonly string[], said: readonly string[], size: number, guess: number): number {
  if (said.length < size) return -1;
  const tail = said.slice(-size);
  let best = -1;
  for (let i = 0; i + size <= written.length; i++) {
    let same = true;
    for (let j = 0; j < size && same; j++) same = written[i + j] === tail[j];
    const end = i + size;
    if (same && (best < 0 || Math.abs(end - guess) < Math.abs(best - guess))) best = end;
  }
  return best;
}

/**
 * How many of the written words he has read, from the words he has said. He reads it word for word, but speech
 * turned into text may write numbers or names differently, so the last few words said are found in the written
 * words, nearest to where the word count alone would put him.
 */
export function wordsRead(written: readonly string[], said: readonly string[]): number {
  const guess = Math.min(said.length, written.length);
  for (const size of [4, 3, 2]) {
    const end = matchEnd(written, said, size, guess);
    if (end >= 0) return end;
  }
  return guess;
}

/** The sentence holding the written word at this place, given each sentence's word count. */
export function sentenceAtWord(counts: readonly number[], word: number): number {
  let total = 0;
  for (let i = 0; i < counts.length; i++) {
    total += counts[i];
    if (word < total) return i;
  }
  return counts.length - 1;
}
