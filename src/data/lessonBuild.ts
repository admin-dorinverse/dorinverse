// Turns the rows a lesson download brings into one lesson: its stops and cards in order, each card's explained words
// and sayings, the collectibles that pop up on its story cards, and each question's answers in the order to show.
// Plain functions with no database, so the same code can be timed outside the app.

import { stopVerseRefs } from '@/data/lessonLibrary';
import type { AnswerSeal, CardIdiom, CardWord, ChoiceCard, Lesson, LessonCard, LessonCookie, QuestionType, StoryCard } from '@/types/lesson';

/** One stop row, with its first and last verse labels. */
export type StopRow = { stop: number; verses: string; from: { osis_ref: string }; to: { osis_ref: string } };

/** One answer row. DEVELOPMENT ONLY: `correct` and `explanation` come down with the lesson; at hookup they stay on the server. */
export type AnswerRow = { position: number; text: string; correct: boolean; blank: number | null; explanation: string | null };

/** One card row, with its answers and the ids of the verses it tells. */
export type CardRow = {
  stop: number;
  card: number;
  kind: 'story' | 'choice';
  verses: string;
  text: string | null;
  question: string | null;
  question_type: QuestionType | null;
  answers: AnswerRow[];
  cv: { verse_id: string }[];
};

/** Which word or saying meaning a card uses. */
export type CardWordRow = { stop: number; card: number; word: string; meaning_no: number };
export type CardIdiomRow = { stop: number; card: number; idiom_id: number; meaning_no: number };

/** A word's meaning, with the word's forms. */
export type WordMeaningRow = { word: string; meaning_no: number; meaning: string; sources: string[] | null; w: { forms: string[] | null } | null };

/** A saying's meaning, with the saying's words. */
export type IdiomMeaningRow = { idiom_id: number; meaning_no: number; meaning: string; sources: string[] | null; i: { idiom: string } | null };

/** A collectible row: what it is, its home card, and the place card it names (for place cookies). */
export type CookieRow = {
  key: string;
  type: 'character' | 'place' | 'prayer' | 'instruction' | 'ten_commandments' | 'prophecy';
  reference: string | null;
  instruction: string | null;
  who: string | null;
  key_line: string | null;
  half: 'promise' | 'fulfillment' | null;
  quote: string | null;
  bible_character_id: string | null;
  place_lookup: string | null;
  passage_id: number | null;
  stop: number | null;
  card: number | null;
  /** The place card it names; `photo` is filled in after download with its photo's address. */
  place: { name: string; line: string; image_path?: string | null; photo?: string | null } | null;
};

/** A character's name, lookup, tag and summary, by database id. */
export type CharacterNames = ReadonlyMap<string, { name: string; lookup: string; tag?: string | null; summary?: string }>;

/** Everything a lesson download brings. */
export type LessonRows = {
  stops: StopRow[];
  cards: CardRow[];
  cardWords: CardWordRow[];
  cardIdioms: CardIdiomRow[];
  wordMeanings: WordMeaningRow[];
  idiomMeanings: IdiomMeaningRow[];
  /** Collectibles whose home card is in this lesson. */
  homeCookies: CookieRow[];
  /** Collectibles told by a verse of this lesson, with the verse ids. */
  verseCookies: { verse_id: string; c: CookieRow | null }[];
  characters: CharacterNames;
  /** The words (BSB) of the verses the stops cover, by verse label. */
  verseTexts: Record<string, string>;
};

/**
 * DEVELOPMENT ONLY: the answer key inside a card's seal, read only by lessonSource.checkAnswer. `right` holds the
 * right answer ids in blank order; `explain` each answer's explanation. At hookup the seal is empty.
 */
export type DevSeal = AnswerSeal & { right: number[]; explain: Record<number, string> };

/** A small repeatable shuffle, so a card's answers always show in the same mixed order. */
function shuffled<T>(items: readonly T[], seed: number): T[] {
  const out = [...items];
  let x = seed % 233280;
  for (let i = out.length - 1; i > 0; i--) {
    x = (x * 9301 + 49297) % 233280;
    const j = Math.floor((x / 233280) * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Turns a collectible row into its pop-up, or null when it cannot be collected (no published character card). */
function toCookie(row: CookieRow, characters: CharacterNames): LessonCookie | null {
  const base = { key: row.key, reference: row.reference };
  switch (row.type) {
    case 'character': {
      const who = row.bible_character_id ? characters.get(row.bible_character_id) : undefined;
      return who
        ? { ...base, target: { kind: 'character', lookup: who.lookup }, label: 'Character card', title: who.name, detail: null, tag: who.tag ?? null, summary: who.summary ?? null }
        : null;
    }
    case 'place':
      return row.place_lookup && row.place
        ? { ...base, target: { kind: 'place', lookup: row.place_lookup }, label: 'Place', title: row.place.name, detail: null, summary: row.place.line, photo: row.place.photo ?? null }
        : null;
    case 'prayer':
      return { ...base, target: { kind: 'cookie', key: row.key }, label: 'Prayer', title: row.who ? `${row.who} prays` : 'A prayer', detail: row.key_line };
    case 'instruction':
      return { ...base, target: { kind: 'cookie', key: row.key }, label: 'Instruction for today', title: row.instruction ?? '', detail: row.who ? `Given by ${row.who}` : null };
    case 'ten_commandments':
      return { ...base, target: { kind: 'cookie', key: row.key }, label: 'Instruction pack', title: 'The Ten Commandments', detail: 'All ten, collected together.' };
    case 'prophecy':
      return { ...base, target: { kind: 'cookie', key: row.key }, label: row.half === 'fulfillment' ? 'Prophecy · fulfillment half' : 'Prophecy · promise half', title: row.quote ?? '', detail: null };
    default:
      return null;
  }
}

/** Builds the lesson from its rows. Cards are in order; True comes first on true or false cards. */
export function buildLesson(id: number, rows: LessonRows): Lesson {
  const spot = (stop: number, card: number) => `${stop}.${card}`;
  const words = new Map<string, WordMeaningRow>(rows.wordMeanings.map((m) => [`${m.word}#${m.meaning_no}`, m]));
  const idioms = new Map<string, IdiomMeaningRow>(rows.idiomMeanings.map((m) => [`${m.idiom_id}#${m.meaning_no}`, m]));
  const cardWords = new Map<string, CardWord[]>();
  for (const w of rows.cardWords) {
    const m = words.get(`${w.word}#${w.meaning_no}`);
    if (!m) continue;
    const list = cardWords.get(spot(w.stop, w.card)) ?? [];
    list.push({ word: w.word, forms: m.w?.forms ?? [w.word], meaning: m.meaning, sources: m.sources ?? [] });
    cardWords.set(spot(w.stop, w.card), list);
  }
  const cardIdioms = new Map<string, CardIdiom[]>();
  for (const i of rows.cardIdioms) {
    const m = idioms.get(`${i.idiom_id}#${i.meaning_no}`);
    if (!m?.i) continue;
    const list = cardIdioms.get(spot(i.stop, i.card)) ?? [];
    list.push({ phrase: m.i.idiom, meaning: m.meaning, sources: m.sources ?? [] });
    cardIdioms.set(spot(i.stop, i.card), list);
  }
  // Collectibles by home card, and by the verses that tell them.
  const homes = new Map<string, CookieRow[]>();
  for (const c of rows.homeCookies) if (c.stop !== null && c.card !== null) homes.set(spot(c.stop, c.card), [...(homes.get(spot(c.stop, c.card)) ?? []), c]);
  const byVerse = new Map<string, CookieRow[]>();
  for (const v of rows.verseCookies) if (v.c) byVerse.set(v.verse_id, [...(byVerse.get(v.verse_id) ?? []), v.c]);

  /** The collectibles that pop up on one story card: its home ones and every one its verses tell. */
  const cookiesOn = (row: CardRow): LessonCookie[] => {
    const found = new Map<string, LessonCookie>();
    for (const c of [...(homes.get(spot(row.stop, row.card)) ?? []), ...row.cv.flatMap((v) => byVerse.get(v.verse_id) ?? [])]) {
      if (found.has(c.key)) continue;
      const cookie = toCookie(c, rows.characters);
      if (cookie) found.set(c.key, cookie);
    }
    return [...found.values()];
  };

  /** Turns one card row into a card. */
  const toCard = (row: CardRow): LessonCard => {
    const w = cardWords.get(spot(row.stop, row.card)) ?? [];
    const i = cardIdioms.get(spot(row.stop, row.card)) ?? [];
    if (row.kind === 'story') {
      const story: StoryCard = { kind: 'story', card: row.card, verses: row.verses, text: row.text ?? '', words: w, idioms: i, cookies: cookiesOn(row) };
      return story;
    }
    const type = row.question_type ?? 'multiple_choice';
    const answers = [...row.answers].sort((a, b) => a.position - b.position);
    const trueFirst = (a: AnswerRow) => (a.text.trim().toLowerCase() === 'true' ? 0 : 1);
    const ordered = type === 'true_false' ? [...answers].sort((a, b) => trueFirst(a) - trueFirst(b)) : shuffled(answers, id * 1009 + row.stop * 101 + row.card * 7);
    const rightRows = answers.filter((a) => a.correct).sort((a, b) => (a.blank ?? 1) - (b.blank ?? 1));
    const seal: DevSeal = { sealed: true, right: rightRows.map((a) => a.position), explain: Object.fromEntries(answers.map((a) => [a.position, a.explanation ?? ''])) };
    const blanks = type === 'fill_blank' ? (rightRows.length >= 2 ? 2 : 1) : 0;
    const choice: ChoiceCard = {
      kind: 'choice',
      card: row.card,
      verses: row.verses,
      question: row.question ?? '',
      type,
      blanks,
      answers: ordered.map((a) => ({ id: a.position, text: a.text })),
      words: w,
      idioms: i,
      seal,
    };
    return choice;
  };

  const stops = [...rows.stops]
    .sort((a, b) => a.stop - b.stop)
    .map((s) => ({
      stop: s.stop,
      verses: s.verses,
      firstVerse: s.from.osis_ref,
      lastVerse: s.to.osis_ref,
      cards: rows.cards.filter((c) => c.stop === s.stop).sort((a, b) => a.card - b.card).map(toCard),
      verseWords: stopVerseRefs(s.from.osis_ref, s.to.osis_ref).flatMap((ref) => (rows.verseTexts[ref] ? [{ ref, text: rows.verseTexts[ref] }] : [])),
    }));
  return { id, stops };
}
