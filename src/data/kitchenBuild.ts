// Turns the rows a lesson download brings for the steps after the stops into the lesson's Quality Check (its 5
// lines, with which are burnt sealed away) and its Big Idea paragraphs. Plain functions with no database, so the
// same code can be timed outside the app.

import type { AnswerSeal, BurntFix, QualityCheck } from '@/types/lesson';

/** One Quality Check line row, with its wrong details when it is burnt. */
export type BurntLineRow = {
  line: number;
  verses: string;
  text: string;
  burnt: boolean;
  wrong: { position: number; wrong: string; true_text: string; verse: string }[];
};

/** One Big Idea paragraph row. */
export type BigIdeaRow = { paragraph: number; text: string };

/**
 * DEVELOPMENT ONLY: the Quality Check's answer key inside its seal, read only by lessonSource.checkBurntLine: the
 * burnt lines' numbers and each one's fixes. At hookup the seal is empty and the server keeps the key.
 */
export type QualitySeal = AnswerSeal & { burnt: number[]; fixes: Record<number, BurntFix[]> };

/** Builds the Quality Check from its rows, in passage order. */
export function buildQualityCheck(rows: readonly BurntLineRow[]): QualityCheck {
  const lines = [...rows].sort((a, b) => a.line - b.line);
  const burnt = lines.filter((l) => l.burnt);
  const fixes = Object.fromEntries(
    burnt.map((l) => [l.line, [...l.wrong].sort((a, b) => a.position - b.position).map((w) => ({ wrong: w.wrong, right: w.true_text, verse: w.verse }))]),
  );
  const seal: QualitySeal = { sealed: true, burnt: burnt.map((l) => l.line), fixes };
  return { lines: lines.map((l) => ({ line: l.line, verses: l.verses, text: l.text })), burntCount: burnt.length, seal };
}

/** Puts the Big Idea paragraphs in order. */
export function buildBigIdea(rows: readonly BigIdeaRow[]): string[] {
  return [...rows].sort((a, b) => a.paragraph - b.paragraph).map((r) => r.text);
}
