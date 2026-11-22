// What the Group Voice Call shows from the database besides the lessons: a Bible chapter's words (BSB) for "Show a
// verse", and the written explanation of a lesson question's right answer, which Papa Dorin reads aloud on the call.
// A chapter is downloaded when the host shows it and kept in memory only, so it works the same in the browser.

import { BIBLE_OUTLINE } from '@/data/bibleOutline';
import { database } from '@/data/database';
import { checkAnswer } from '@/data/lessonSource';
import type { BibleBook } from '@/types/bible';
import type { ChoiceCard } from '@/types/lesson';

/** The translation the call shows. */
const TRANSLATION = 'BSB';

/** One verse on the call's chapter card: its number and words. */
export type CallVerse = { number: number; text: string };

/** A verse's words row from the database, with its label. */
type TextRow = { text: string; verse: { osis_ref: string } };

/** The book with this code (like "Gen"), or undefined. */
export function bookOf(code: string): BibleBook | undefined {
  return BIBLE_OUTLINE.find((b) => b.code === code);
}

/**
 * Downloads one chapter's words in a single request (the longest chapter, Psalm 119, has 176 verses). Verses the
 * translation leaves out are left out, so the list holds only verses with words.
 */
export async function fetchChapter(code: string, chapter: number): Promise<CallVerse[]> {
  const count = bookOf(code)?.chapterVerses[chapter - 1] ?? 0;
  if (count === 0) throw new Error('That chapter is not in the Bible.');
  const labels = Array.from({ length: count }, (_, i) => `${code}.${chapter}.${i + 1}`);
  const reply = await database.from('verse_text').select('text, verse!inner(osis_ref)').eq('translation_code', TRANSLATION).in('verse.osis_ref', labels);
  if (reply.error) throw reply.error;
  const verses = (reply.data as unknown as TextRow[])
    .map((row) => ({ number: Number(row.verse.osis_ref.split('.')[2]), text: row.text.trim() }))
    .filter((v) => v.text !== '')
    .sort((a, b) => a.number - b.number);
  if (verses.length === 0) throw new Error('The chapter could not be read.');
  return verses;
}

/**
 * The right answer of a question, and Papa Dorin's written explanation of it (one paragraph per right answer).
 * Asked the same way the lesson player checks a pick, so the page never looks inside the answer key.
 */
export async function rightAnswerOf(card: ChoiceCard): Promise<{ rightIds: number[]; explanation: string[] }> {
  const first = card.answers[0]?.id;
  if (first === undefined) return { rightIds: [], explanation: [] };
  const { rightIds } = await checkAnswer(card, [first]);
  const { explanations } = await checkAnswer(card, rightIds);
  return { rightIds, explanation: explanations };
}
