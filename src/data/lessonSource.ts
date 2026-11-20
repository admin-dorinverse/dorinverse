// Where the lessons' data comes from. This is the one file that changes at hookup: pages, the store and the queries
// never ask the database directly, only through these functions.
//
// How it will work at hookup:
// - The lesson outline (every lesson's title, range, story and stop count; no cards) comes in the one compressed
//   download right after sign-in, with a version number; the phone downloads it again only when the version changes.
// - A lesson's content comes from the server once, the first time its card shows in a list, without any answer key:
//   no `correct` flags and no explanations. The phone keeps it.
// - checkAnswer sends the card and the pick to the server, which checks it and replies with right or not, the right
//   answers and Papa Dorin's explanation of the pick.
//
// Today (development): everything is read from the database directly. Each answer's `correct` flag and explanation
// come down inside the lesson, sealed in the card, and checkAnswer checks them on the phone. Pages never see them.

import { database } from '@/data/database';
import { placePhotoAddress } from '@/data/placeSource';
import { buildLesson, type CardRow, type CookieRow, type DevSeal, type IdiomMeaningRow, type LessonRows, type StopRow, type WordMeaningRow } from '@/data/lessonBuild';
import { displayReference, startChapterOf, stopVerseRefs } from '@/data/lessonLibrary';
import type { AnswerResult, ChoiceCard, Lesson, LessonId, LessonOutline, LessonType } from '@/types/lesson';

/** The most rows the database sends in one reply. */
const ROW_CAP = 1000;

/** How many verse ids one request asks about: short enough for the web address. */
const VERSES_PER_ASK = 80;

/** How many verse labels one request for verse words asks for (labels go in the web address). */
const TEXTS_PER_ASK = 150;

/** One outline row from the database. */
type OutlineRow = {
  id: number;
  title: string;
  start_ref: string;
  end_ref: string;
  type: LessonType;
  story_group: string | null;
  story_position: string | null;
  stops: { stop: number }[];
};

/** What the collectible requests ask for: the cookie, its home card, and the place card it names. */
const COOKIE_COLUMNS =
  'key, type, reference, instruction, who, key_line, half, quote, bible_character_id, place_lookup, passage_id, stop, card, place:place_card(name, line, image_path)';

/** Downloads every lesson's outline, in Bible order: two requests sent together (the database replies 1,000 rows at most). */
export async function fetchLessonOutlines(): Promise<LessonOutline[]> {
  const pages = [0, ROW_CAP];
  const replies = await Promise.all(
    pages.map((from) =>
      database
        .from('passage')
        .select('id, title, start_ref, end_ref, type, story_group, story_position, stops:passage_stop(stop)')
        .order('id')
        .range(from, from + ROW_CAP - 1),
    ),
  );
  const out: LessonOutline[] = [];
  for (const reply of replies) {
    if (reply.error) throw reply.error;
    for (const r of reply.data as unknown as OutlineRow[]) {
      out.push({
        id: r.id,
        title: r.title,
        reference: displayReference(r.start_ref, r.end_ref),
        startChapter: startChapterOf(r.start_ref),
        type: r.type,
        storyGroup: r.story_group,
        storyPosition: r.story_position,
        stopCount: r.stops.length,
      });
    }
  }
  if (out.length === 0) throw new Error('The lessons could not be read.');
  return out;
}

/** Throws a reply's error, or gives its rows. */
function rowsOf<T>(reply: { data: unknown; error: unknown }): T[] {
  if (reply.error) throw reply.error;
  return (reply.data ?? []) as T[];
}

/**
 * Downloads one lesson in three quick rounds of requests sent together: its stops, cards and pop-up links; then the
 * meanings and the collectibles its story verses tell; then the names of the characters among them.
 */
export async function fetchLesson(id: LessonId): Promise<Lesson> {
  const [stops, cards, cardWords, cardIdioms, homeCookies] = await Promise.all([
    database.from('passage_stop').select('stop, verses, from:verse!from_verse_id(osis_ref), to:verse!to_verse_id(osis_ref)').eq('passage_id', id).then((r) => rowsOf<StopRow>(r)),
    database
      .from('passage_card')
      .select('stop, card, kind, verses, text, question, question_type, answers:card_answer(position, text, correct, blank, explanation), cv:card_verse(verse_id)')
      .eq('passage_id', id)
      .then((r) => rowsOf<CardRow>(r)),
    database.from('card_word').select('stop, card, word, meaning_no').eq('passage_id', id).then((r) => rowsOf<LessonRows['cardWords'][number]>(r)),
    database.from('card_idiom').select('stop, card, idiom_id, meaning_no').eq('passage_id', id).then((r) => rowsOf<LessonRows['cardIdioms'][number]>(r)),
    database.from('sample_cookie').select(COOKIE_COLUMNS).eq('passage_id', id).then((r) => rowsOf<CookieRow>(r)),
  ]);
  if (stops.length === 0 || cards.length === 0) throw new Error('The lesson could not be read.');
  const words = [...new Set(cardWords.map((w) => w.word))];
  const idiomIds = [...new Set(cardIdioms.map((i) => i.idiom_id))];
  const storyVerses = [...new Set(cards.filter((c) => c.kind === 'story').flatMap((c) => c.cv.map((v) => v.verse_id)))];
  const verseAsks: string[][] = [];
  for (let i = 0; i < storyVerses.length; i += VERSES_PER_ASK) verseAsks.push(storyVerses.slice(i, i + VERSES_PER_ASK));
  // The words of every verse the stops cover, so the "Cookie baked!" screen never waits. Hookup: they come in the
  // lesson reply the same way (they are revealed by playing this lesson anyway).
  const stopRefs = stops.flatMap((s) => stopVerseRefs(s.from.osis_ref, s.to.osis_ref));
  const textAsks: string[][] = [];
  for (let i = 0; i < stopRefs.length; i += TEXTS_PER_ASK) textAsks.push(stopRefs.slice(i, i + TEXTS_PER_ASK));
  const [wordMeanings, idiomMeanings, verseCookies, verseTexts] = await Promise.all([
    words.length ? database.from('lesson_word_meaning').select('word, meaning_no, meaning, sources, w:lesson_word(forms)').in('word', words).then((r) => rowsOf<WordMeaningRow>(r)) : [],
    idiomIds.length ? database.from('lesson_idiom_meaning').select('idiom_id, meaning_no, meaning, sources, i:lesson_idiom(idiom)').in('idiom_id', idiomIds).then((r) => rowsOf<IdiomMeaningRow>(r)) : [],
    Promise.all(verseAsks.map((ask) => database.from('sample_cookie_verse').select(`verse_id, c:sample_cookie(${COOKIE_COLUMNS})`).in('verse_id', ask).then((r) => rowsOf<LessonRows['verseCookies'][number]>(r)))).then((l) => l.flat()),
    Promise.all(
      textAsks.map((ask) =>
        database.from('verse_text').select('text, verse!inner(osis_ref)').eq('translation_code', 'BSB').in('verse.osis_ref', ask).then((r) => rowsOf<{ text: string; verse: { osis_ref: string } }>(r)),
      ),
    ).then((l) => Object.fromEntries(l.flat().map((row) => [row.verse.osis_ref, row.text]))),
  ]);
  const characterIds = [...new Set([...homeCookies, ...verseCookies.flatMap((v) => (v.c ? [v.c] : []))].flatMap((c) => (c.bible_character_id ? [c.bible_character_id] : [])))];
  const characters = new Map<string, { name: string; lookup: string; tag: string | null; summary: string }>();
  if (characterIds.length) {
    const named = await database
      .from('character_card')
      .select('bible_character_id, name, name_tag, summary, who:bible_character!inner(lookup)')
      .eq('status', 'published')
      .in('bible_character_id', characterIds);
    type Named = { bible_character_id: string; name: string; name_tag: string | null; summary: string; who: { lookup: string } };
    for (const r of rowsOf<Named>(named)) characters.set(r.bible_character_id, { name: r.name, lookup: r.who.lookup, tag: r.name_tag, summary: r.summary });
  }
  // Each place cookie's photo address, for its quick look.
  for (const c of [...homeCookies, ...verseCookies.flatMap((v) => (v.c ? [v.c] : []))]) {
    if (c.place && c.place_lookup) c.place.photo = c.place.image_path ? placePhotoAddress(c.place_lookup, 'header') : null;
  }
  return buildLesson(id, { stops, cards, cardWords, cardIdioms, wordMeanings, idiomMeanings, homeCookies, verseCookies, characters, verseTexts });
}

/**
 * Checks a pick: one answer id, or one per blank in order. Development: checked on the phone with the sealed key.
 * Hookup: sent to the server, which replies with the same result.
 */
export async function checkAnswer(card: ChoiceCard, picked: readonly number[]): Promise<AnswerResult> {
  const key = card.seal as DevSeal;
  const right = picked.length === key.right.length && picked.every((id, i) => (card.blanks === 2 ? id === key.right[i] : key.right.includes(id)));
  const textOf = (id: number) => card.answers.find((a) => a.id === id)?.text ?? '';
  // Papa Dorin explains what was picked: every missed pick when not right, every pick when right.
  const explained = right ? picked : picked.filter((id, i) => (card.blanks === 2 ? id !== key.right[i] : !key.right.includes(id)));
  const explanations = [...new Set(explained.map((id) => key.explain[id]).filter(Boolean))];
  return { right, rightIds: [...key.right], rightTexts: key.right.map(textOf), explanations };
}
