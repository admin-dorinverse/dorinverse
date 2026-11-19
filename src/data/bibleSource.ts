// Where the Bible reader's data comes from. This is the one file that changes at hookup: pages never ask
// the database or the sample data directly, only through these functions.
//
// The outline (books, chapters, verse counts; no words) ships inside the app in bibleOutline.ts, so the
// book list never waits. Everything else is downloaded once, saved on the phone, and read from there.
//
// How it will work at hookup:
// - When a lesson is finished, the server's reply carries the verses it revealed: their words and footnotes, plus
//   the word lengths of the still-covered verses in those chapters. The phone saves them; nothing else is downloaded.
// - A new phone (or a reinstall) downloads everything the person has earned in one compressed file right after
//   sign-in, then never again. Covered verses always arrive as word lengths only; their words never reach the phone.
//
// Today (development): the revealed list is sample data, and fetchEarnedVerses below stands in for both of the
// above by asking the database directly, in one round of requests sent together.

import { BIBLE_OUTLINE } from '@/data/bibleOutline';
import { database } from '@/data/database';
import { earnedVerses } from '@/data/progressSource';
import { sampleRevealedVerses } from '@/data/sample/revealedVerses';
import type { BibleOutline, Footnote, VerseRef } from '@/types/bible';

/** The translation the reader shows. */
export const READER_TRANSLATION = 'BSB';

/** The Bible's outline, shipped inside the app. */
export const bibleOutline: BibleOutline = BIBLE_OUTLINE;

/** How many labels one request asks for. Small enough for the web address, and under the 1,000-row reply cap. */
const LABELS_PER_ASK = 250;

/** A verse's text row from the database, with its label. */
type TextRow = { text: string; verse: { osis_ref: string } };

/** A footnote row from the database, with its verse's label. */
type NoteRow = { position: number; after: string; text: string; verse: { osis_ref: string } };

/**
 * What the phone gets for the verses it needs: words and footnotes of revealed verses, word lengths of covered ones.
 * Footnotes may be missing when they could not be read; they are then asked for again on the next start.
 */
export type EarnedVerses = { texts: Record<VerseRef, string>; shapes: Record<VerseRef, number[]>; notes: Record<VerseRef, Footnote[]> };

/**
 * The labels of every verse the person has revealed. Development: the sample list plus the verses revealed by baking
 * lesson stops (kept by progressSource). Hookup: the server.
 */
export async function fetchRevealedRefs(): Promise<VerseRef[]> {
  return [...new Set([...sampleRevealedVerses, ...(await earnedVerses())])];
}

/**
 * Downloads the verses the phone is missing, all requests sent at once. A verse the translation leaves out
 * comes back as an empty string (revealed) or an empty list (covered), so it is never asked for again.
 *
 * DEVELOPMENT ONLY: covered verses' words are downloaded here just to count their letters, then thrown away
 * and never saved. At hookup the server sends covered verses as word lengths only.
 */
export async function fetchEarnedVerses(revealed: readonly VerseRef[], covered: readonly VerseRef[]): Promise<EarnedVerses> {
  const all = [...revealed, ...covered];
  const asks: VerseRef[][] = [];
  for (let i = 0; i < all.length; i += LABELS_PER_ASK) asks.push(all.slice(i, i + LABELS_PER_ASK));
  const noteAsks: VerseRef[][] = [];
  for (let i = 0; i < revealed.length; i += LABELS_PER_ASK) noteAsks.push(revealed.slice(i, i + LABELS_PER_ASK));
  // Words and footnotes are asked for together, in one round.
  const [replies, noteReplies] = await Promise.all([
    Promise.all(
      asks.map((labels) =>
        database.from('verse_text').select('text, verse!inner(osis_ref)').eq('translation_code', READER_TRANSLATION).in('verse.osis_ref', labels),
      ),
    ),
    Promise.all(noteAsks.map((labels) => database.from('bsb_footnote').select('position, after, text, verse!inner(osis_ref)').in('verse.osis_ref', labels))),
  ]);
  const words: Record<VerseRef, string> = {};
  for (const reply of replies) {
    if (reply.error) throw reply.error;
    for (const row of reply.data as unknown as TextRow[]) words[row.verse.osis_ref] = row.text;
  }
  // No words at all means the database would not share them; saving that would hide the verses for good.
  if (all.length > 0 && Object.keys(words).length === 0) throw new Error('The Bible verses could not be read.');
  const out: EarnedVerses = { texts: {}, shapes: {}, notes: {} };
  for (const ref of revealed) out.texts[ref] = words[ref] ?? '';
  // Footnotes are kept only if every footnote request worked; otherwise they are left missing and asked for again.
  if (noteReplies.every((reply) => !reply.error)) {
    const rows = noteReplies.flatMap((reply) => reply.data as unknown as NoteRow[]).sort((a, b) => a.position - b.position);
    for (const ref of revealed) out.notes[ref] = [];
    for (const row of rows) out.notes[row.verse.osis_ref]?.push({ after: row.after, text: row.text });
  }
  for (const ref of covered) out.shapes[ref] = wordLengths(words[ref] ?? '');
  return out;
}

/** The length of each word in a verse, like [2, 3, 9] for "In the beginning". */
export function wordLengths(text: string): number[] {
  return text.split(/\s+/).filter(Boolean).map((w) => w.length);
}
