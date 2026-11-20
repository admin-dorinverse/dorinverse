// The lessons' data work that needs no screen: which kind of lesson each constellation holds, readable references,
// the verse labels a stop covers, the lesson list's rows with story-group headings, and splitting a card's words so
// explained words and sayings can be tapped. Plain functions, so the same code can be timed outside the app.

import { BIBLE_OUTLINE } from '@/data/bibleOutline';
import type { VerseRef } from '@/types/bible';
import type { CardIdiom, CardWord, CollectTarget, LessonOutline, LessonType } from '@/types/lesson';

/** The kind of lesson each constellation in the sky holds, by constellation id. */
export const LESSON_TYPE_OF: Readonly<Record<string, LessonType>> = {
  stories: 'Narrative',
  poems: 'Poetry & Wisdom',
  letters: 'Letters',
  prophecies: 'Prophetic',
  parables: 'Parables',
  sermons: 'Sermons',
};

/** A reference split into book, chapter and verse, like ["Judges", 3, 7]. */
function splitRef(ref: string): [string, number, number] | null {
  const found = ref.trim().match(/^(.+?)\s+(\d+):(\d+)/);
  return found ? [found[1], Number(found[2]), Number(found[3])] : null;
}

/** A lesson's range written for people: "Judges 3:7–31", "Genesis 1:1–2:3", or both ends in full across books. */
export function displayReference(start: string, end: string): string {
  const a = splitRef(start);
  const b = splitRef(end);
  if (!a || !b) return start === end ? start : `${start}–${end}`;
  if (start === end) return start;
  if (a[0] !== b[0]) return `${start} – ${end}`;
  if (a[1] !== b[1]) return `${a[0]} ${a[1]}:${a[2]}–${b[1]}:${b[2]}`;
  return `${a[0]} ${a[1]}:${a[2]}–${b[2]}`;
}

/** The book and chapter a lesson starts in, like "Judges 3", for where a collected card was found. */
export function startChapterOf(start: string): string {
  const a = splitRef(start);
  return a ? `${a[0]} ${a[1]}` : start;
}

/** Each book's place in the outline by its code, like "Judg". */
const BOOK_INDEX = new Map(BIBLE_OUTLINE.map((b, i) => [b.code, i]));

/** Every verse label from `first` to `last`, like "Judg.3.7" … "Judg.3.18", crossing chapters and books if needed. */
export function stopVerseRefs(first: VerseRef, last: VerseRef): VerseRef[] {
  const [code, ch, v] = first.split('.');
  const [endCode, endCh, endV] = last.split('.');
  let book = BOOK_INDEX.get(code);
  const endBook = BOOK_INDEX.get(endCode);
  if (book === undefined || endBook === undefined) return [];
  const refs: VerseRef[] = [];
  let chapter = Number(ch);
  let verse = Number(v);
  // A stop is at most a few chapters, so this never runs long; the cap guards against a broken label.
  while (refs.length < 3000) {
    const b = BIBLE_OUTLINE[book];
    refs.push(`${b.code}.${chapter}.${verse}`);
    if (book === endBook && chapter === Number(endCh) && verse === Number(endV)) return refs;
    verse += 1;
    if (verse > (b.chapterVerses[chapter - 1] ?? 0)) {
      verse = 1;
      chapter += 1;
      if (chapter > b.chapterVerses.length) {
        chapter = 1;
        book += 1;
        if (book >= BIBLE_OUTLINE.length) return refs;
      }
    }
  }
  return refs;
}

/** One line of a lesson list: a story-group heading, or a lesson. */
export type LessonRow = { kind: 'group'; key: string; name: string; count: number } | { kind: 'lesson'; key: string; lesson: LessonOutline };

/**
 * The list rows for one kind of lesson, in Bible order. Lessons of the same story sit together under a heading
 * that says how many lessons the story has here. Done once per list, never while scrolling.
 */
export function lessonRows(outlines: readonly LessonOutline[], type: LessonType): LessonRow[] {
  const lessons = outlines.filter((l) => l.type === type);
  const sizes = new Map<string, number>();
  for (const l of lessons) if (l.storyGroup) sizes.set(l.storyGroup, (sizes.get(l.storyGroup) ?? 0) + 1);
  const rows: LessonRow[] = [];
  let group: string | null = null;
  for (const lesson of lessons) {
    if (lesson.storyGroup && lesson.storyGroup !== group) {
      rows.push({ kind: 'group', key: `group-${lesson.id}`, name: lesson.storyGroup, count: sizes.get(lesson.storyGroup) ?? 1 });
    }
    group = lesson.storyGroup;
    rows.push({ kind: 'lesson', key: String(lesson.id), lesson });
  }
  return rows;
}

/** A piece of a card's words: plain, or an explained word or saying (by its place in the card's lists). */
/** A piece of a card's words: plain, or an explained word, saying, or collectible cookie's name (by its place in its list). */
export type TextPiece = { text: string; word?: number; idiom?: number; cookie?: number };

/** True for a letter or digit, so a word is only matched whole. */
function isWordChar(c: string | undefined): boolean {
  return !!c && /[A-Za-z0-9']/.test(c);
}

/** Finds `needle` in `hay` as a whole word or phrase, ignoring case, from `from`; -1 when absent. */
function findWhole(hay: string, lower: string, needle: string, from = 0): number {
  const n = needle.toLowerCase();
  let at = lower.indexOf(n, from);
  while (at >= 0) {
    if (!isWordChar(hay[at - 1]) && !isWordChar(hay[at + n.length])) return at;
    at = lower.indexOf(n, at + 1);
  }
  return -1;
}

/**
 * Splits a card's words so the first use of each explained word (any of its forms), saying, and collectible cookie's
 * name (`cookieNames`, by the cookie's place in its list; null for a cookie with no name to find) can be tapped.
 * Cookie names win, then sayings, then words, when they overlap. Done once per card, when it shows.
 */
export function markText(text: string, words: readonly CardWord[], idioms: readonly CardIdiom[], cookieNames: readonly (string | null)[] = []): TextPiece[] {
  const lower = text.toLowerCase();
  type Mark = { at: number; end: number; word?: number; idiom?: number; cookie?: number };
  const marks: Mark[] = [];
  cookieNames.forEach((name, i) => {
    const at = name ? findWhole(text, lower, name) : -1;
    if (name && at >= 0) marks.push({ at, end: at + name.length, cookie: i });
  });
  idioms.forEach((idiom, i) => {
    const at = findWhole(text, lower, idiom.phrase);
    if (at >= 0) marks.push({ at, end: at + idiom.phrase.length, idiom: i });
  });
  words.forEach((word, i) => {
    const hits = [word.word, ...word.forms].map((f) => ({ at: findWhole(text, lower, f), len: f.length })).filter((h) => h.at >= 0);
    if (hits.length === 0) return;
    const first = hits.reduce((a, b) => (b.at < a.at || (b.at === a.at && b.len > a.len) ? b : a));
    marks.push({ at: first.at, end: first.at + first.len, word: i });
  });
  // In order; at the same spot a cookie name comes first, so it wins.
  marks.sort((a, b) => a.at - b.at || (a.cookie !== undefined ? -1 : b.cookie !== undefined ? 1 : 0));
  const pieces: TextPiece[] = [];
  let pos = 0;
  for (const m of marks) {
    if (m.at < pos) continue;
    if (m.at > pos) pieces.push({ text: text.slice(pos, m.at) });
    pieces.push({ text: text.slice(m.at, m.end), word: m.word, idiom: m.idiom, cookie: m.cookie });
    pos = m.end;
  }
  if (pos < text.length) pieces.push({ text: text.slice(pos) });
  return pieces;
}

/** The one string that names a collected thing, like "place:seirah_1043", used in the collected set. */
export function targetId(target: CollectTarget): string {
  return target.kind === 'cookie' ? `cookie:${target.key}` : `${target.kind}:${target.lookup}`;
}
