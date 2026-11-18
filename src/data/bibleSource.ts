// Where the Bible reader's data comes from. This is the one file that changes at hookup: pages never ask
// the database or the sample data directly, only these four functions.
//
// Today (development): the revealed list is sample data, and covered verses' word lengths are worked out
// here from their text, which is then thrown away. At hookup: the revealed list comes from the server, and the
// server sends covered verses as word lengths only, so their words never reach the phone.

import { database } from '@/data/database';
import { sampleRevealedVerses } from '@/data/sample/revealedVerses';
import type { BibleOutline, VerseRef } from '@/types/bible';

/** The translation the reader shows. */
export const READER_TRANSLATION = 'BSB';

/** The most rows the database sends in one reply, and the most labels asked for at once. */
const PAGE_ROWS = 1000;
const LABELS_PER_ASK = 100;

/** A book row from the database. */
type BookRow = { id: string; order: number; name: string; abbreviation: string; testament: 'OT' | 'NT' };

/** A chapter row from the database. */
type ChapterRow = { book_id: string; chapter_number: number; verse_count: number };

/** A verse's text row from the database, with its label. */
type TextRow = { text: string; verse: { osis_ref: string } };

/** Downloads the Bible's outline: every book with how many verses each chapter has. No words. */
export async function fetchOutline(): Promise<BibleOutline> {
  const books = await database.from('book').select('id, order, name, abbreviation, testament').order('order');
  if (books.error) throw books.error;
  // An empty reply means the database would not share the outline; it must never be saved as the outline.
  if (books.data.length === 0) throw new Error('The Bible outline could not be read.');
  const chapters: ChapterRow[] = [];
  for (let from = 0; ; from += PAGE_ROWS) {
    const page = await database.from('chapter').select('book_id, chapter_number, verse_count').range(from, from + PAGE_ROWS - 1);
    if (page.error) throw page.error;
    chapters.push(...(page.data as ChapterRow[]));
    if (page.data.length < PAGE_ROWS) break;
  }
  return (books.data as BookRow[]).map((b) => {
    const own = chapters.filter((c) => c.book_id === b.id).sort((x, y) => x.chapter_number - y.chapter_number);
    return { order: b.order, name: b.name, code: b.abbreviation, testament: b.testament, chapterVerses: own.map((c) => c.verse_count) };
  });
}

/** The labels of every verse the person has revealed. Development: the sample list. Hookup: the server. */
export async function fetchRevealedRefs(): Promise<VerseRef[]> {
  return [...sampleRevealedVerses];
}

/** Downloads the words of revealed verses, by label. A verse the translation leaves out is simply missing. */
export async function fetchVerseTexts(refs: readonly VerseRef[]): Promise<Record<VerseRef, string>> {
  const out: Record<VerseRef, string> = {};
  for (let i = 0; i < refs.length; i += LABELS_PER_ASK) {
    const batch = refs.slice(i, i + LABELS_PER_ASK);
    const reply = await database
      .from('verse_text')
      .select('text, verse!inner(osis_ref)')
      .eq('translation_code', READER_TRANSLATION)
      .in('verse.osis_ref', batch);
    if (reply.error) throw reply.error;
    for (const row of reply.data as unknown as TextRow[]) out[row.verse.osis_ref] = row.text;
  }
  return out;
}

/**
 * The word lengths of covered verses in one chapter, by verse number, so the page can draw them at their real shape.
 * Development: worked out here from the text, which is not kept. Hookup: the server sends the lengths only.
 */
export async function fetchCoveredShapes(code: string, chapter: number, verses: readonly number[]): Promise<Record<number, number[]>> {
  if (verses.length === 0) return {};
  const texts = await fetchVerseTexts(verses.map((v) => `${code}.${chapter}.${v}`));
  const out: Record<number, number[]> = {};
  for (const [ref, text] of Object.entries(texts)) out[Number(ref.split('.')[2])] = wordLengths(text);
  return out;
}

/** The length of each word in a verse, like [2, 3, 9] for "In the beginning". */
export function wordLengths(text: string): number[] {
  return text.split(/\s+/).filter(Boolean).map((w) => w.length);
}
