// The shape of a lesson: the short outline every lesson list shows, one lesson's full content (its stops and
// cards, the words and sayings explained on them, the collectibles found on them, its Quality Check lines and its
// Big Idea), and what checking an answer, checking the Quality Check and baking a stop give back.

import type { VerseRef } from '@/types/bible';

/** A lesson's number in the database, like 228 for Judges 3:7–31. */
export type LessonId = number;

/** The six kinds of passages; each constellation holds one kind. */
export type LessonType = 'Narrative' | 'Poetry & Wisdom' | 'Letters' | 'Prophetic' | 'Parables' | 'Sermons';

/** One lesson as the lists show it, without its cards. */
export type LessonOutline = {
  /** Its number, also its page address. */
  id: LessonId;
  /** Its title, like "Othniel, Ehud, and Shamgar Save Israel". */
  title: string;
  /** Where it runs, written for people, like "Judges 3:7–31". */
  reference: string;
  /** Where it starts as a short place for collections, like "Judges 3". */
  startChapter: string;
  /** Its kind of passage. */
  type: LessonType;
  /** The story it is part of, like "Creation and the Fall", or null when it stands alone. */
  storyGroup: string | null;
  /** Its place in that story, like "1 of 3", or null. */
  storyPosition: string | null;
  /** How many stops (cookies to bake) it has. */
  stopCount: number;
};

/** A word explained on a card: tap it to see its meaning. */
export type CardWord = {
  /** The word as listed, like "tribute". */
  word: string;
  /** Every form the card may use, like ["tribute", "tributes"]. */
  forms: string[];
  /** What it means here, for about a 5th-grade reader. */
  meaning: string;
  /** Where the meaning comes from, like "BSB footnote". */
  sources: string[];
};

/** A saying explained on a card, like "cut off". */
export type CardIdiom = {
  /** The saying's words. */
  phrase: string;
  /** What it means here. */
  meaning: string;
  /** The commentaries the meaning was written from. */
  sources: string[];
};

/** Where a collected cookie lands: the Characters, Places, or the cookie pages (prophecy, instructions, prayers). */
export type CollectTarget = { kind: 'character'; lookup: string } | { kind: 'place'; lookup: string } | { kind: 'cookie'; key: string };

/** A collectible shown as a pop-up on a story card until the person collects it. */
export type LessonCookie = {
  /** Its database key, like "place:seirah_1043". */
  key: string;
  /** Where it lands once collected. */
  target: CollectTarget;
  /** The small heading on its pop-up, like "Character card" or "Prayer". */
  label: string;
  /** Its name or main line, like "Eglon" or "The Ten Commandments". */
  title: string;
  /** A line or two about it (exact Bible words where it quotes), or null. */
  detail: string | null;
  /** Where it is written, like "Judges 13:8", or null. */
  reference: string | null;
  /** For its quick look: a character's tag (like "son of Gera") and a character's or place's short summary. */
  tag?: string | null;
  summary?: string | null;
  /** For a place's quick look: the web address of its photo, or null when it has none. */
  photo?: string | null;
};

/** Papa Dorin's turn: he tells the next piece of the passage. */
export type StoryCard = {
  /** What kind of card it is. */
  kind: 'story';
  /** Its number in the stop, from 1. */
  card: number;
  /** The verses it tells, like "Judges 3:7-8". */
  verses: string;
  /** What Papa Dorin says. */
  text: string;
  /** Words explained on it. */
  words: CardWord[];
  /** Sayings explained on it. */
  idioms: CardIdiom[];
  /** Collectibles that may pop up on it. */
  cookies: LessonCookie[];
};

/** The three kinds of questions. */
export type QuestionType = 'multiple_choice' | 'true_false' | 'fill_blank';

/** One answer the person can pick: an id to send back, and its words. Whether it is right is never here. */
export type AnswerOption = { id: number; text: string };

/**
 * What lets the answer be checked. Pages never look inside: they hand it back with the card. Development: it holds
 * the answer key. Hookup: it is empty and the server checks.
 */
export type AnswerSeal = { readonly sealed: true };

/** The person's turn: a question and its answers. */
export type ChoiceCard = {
  /** What kind of card it is. */
  kind: 'choice';
  /** Its number in the stop, from 1. */
  card: number;
  /** The verses of its right answer, shown after a pick. */
  verses: string;
  /** The question; a fill-in has "___" for each blank. */
  question: string;
  /** Which kind of question it is. */
  type: QuestionType;
  /** How many blanks a fill-in has (1 or 2); 0 for the other kinds. */
  blanks: 0 | 1 | 2;
  /** The answers, already in the order to show (True first on a true or false card). */
  answers: AnswerOption[];
  /** Words explained on it. */
  words: CardWord[];
  /** Sayings explained on it. */
  idioms: CardIdiom[];
  /** Hand this back to check an answer. */
  seal: AnswerSeal;
};

/** Any card in a stop. */
export type LessonCard = StoryCard | ChoiceCard;

/** One stop: a stretch of the passage that bakes one cookie. */
export type LessonStop = {
  /** Its number, from 1. */
  stop: number;
  /** The verses it covers, like "Judges 3:7-18". */
  verses: string;
  /** Its first and last verse labels, like "Judg.3.7". */
  firstVerse: VerseRef;
  lastVerse: VerseRef;
  /** Its cards, in order. */
  cards: LessonCard[];
  /**
   * The words of its verses (BSB), in order, for the "Cookie baked!" screen. They come down with the lesson, so the
   * screen shows them at once. Verses the translation leaves out are left out.
   */
  verseWords: { ref: VerseRef; text: string }[];
};

/** One Quality Check line: Papa Dorin's retelling of a moment. Whether it is burnt is not in it. */
export type BurntLine = {
  /** Its number, from 1, in passage order. */
  line: number;
  /** The verses it tells, like "Jonah 1:1-3". */
  verses: string;
  /** The line as the baker sees it. */
  text: string;
};

/** The Quality Check (Burnt Cookies): 5 lines, some burnt, with the answer key sealed like a choice card's. */
export type QualityCheck = { lines: BurntLine[]; burntCount: number; seal: AnswerSeal };

/** One wrong detail in a burnt line: the wrong words, the true words, and the verse with the true words. */
export type BurntFix = { wrong: string; right: string; verse: string };

/** What checking one Quality Check line gives back: whether it was burnt, and its fixes when it was. */
export type BurntLineResult = { burnt: boolean; fixes: BurntFix[] };

/** One lesson's full content, downloaded once and kept on the phone. */
export type Lesson = {
  id: LessonId;
  stops: LessonStop[];
  /** The Quality Check, played after the last stop. */
  qualityCheck: QualityCheck;
  /** Papa Dorin's Big Idea for the passage, one entry per paragraph. */
  bigIdea: string[];
};

/** The steps after the stops, in order. A lesson's progress counts how many are done. */
export const KITCHEN_STEPS = ['quality-check', 'big-idea', 'sign-box'] as const;

/** What checking an answer gives back. */
export type AnswerResult = {
  /** True when the pick is right. */
  right: boolean;
  /** The ids of the right answers (one, or one per blank in order). */
  rightIds: number[];
  /** The right answers' words, in blank order. */
  rightTexts: string[];
  /** Papa Dorin's explanation of what was picked: one paragraph per pick that needs it. */
  explanations: string[];
};

/** The person's lesson progress: stops baked per lesson, and what they have collected. */
export type LessonProgress = {
  /** How many stops are baked in each lesson started; stops bake in order. */
  baked: Readonly<Record<LessonId, number>>;
  /** How many of the steps after the stops (KITCHEN_STEPS) are done in each lesson; they are done in order. */
  kitchen: Readonly<Record<LessonId, number>>;
  /** Every collected thing as "character:lookup", "place:lookup" or "cookie:key". */
  collected: ReadonlySet<string>;
};

/** What baking a stop gives back. */
export type StopBaked = {
  /** How many stops of the lesson are baked now. */
  bakedStops: number;
  /** The verses this stop revealed for the first time. */
  revealed: VerseRef[];
};
