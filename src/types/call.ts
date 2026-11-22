// The shape of a Group Voice Call's shared state: who hosts, what the host is showing everyone, each person's pick
// on a lesson question, and Papa Dorin's trivia game. Everyone's phone and browser read these from LiveKit
// participant attributes, so people who join late see the same screen at once.

/** The start of the host's call identity. The server gives it out, so nobody else can make themselves host. */
export const HOST_PREFIX = 'host-';

/** The start of a guest's call identity. */
export const GUEST_PREFIX = 'guest-';

/** The host's attribute holding what they're showing everyone (JSON of CallShow). */
export const SHOW_ATTRIBUTE = 'call.show';

/** Each person's attribute holding their pick on the lesson question showing now (JSON of LessonPick). */
export const PICK_ATTRIBUTE = 'call.pick';

/** Papa Dorin's attribute holding the trivia game (JSON of TriviaState). */
export const TRIVIA_ATTRIBUTE = 'trivia';

/** What the host is showing everyone. Lobby is the call screen with everyone's avatars. */
export type CallShow =
  | { kind: 'lobby' }
  /** A Bible chapter, with one verse lit up; only the host moves it. `book` is the book's id as the app's Bible uses it. */
  | { kind: 'verse'; book: string; chapter: number; verse: number }
  /**
   * A lesson together: one card at a time. On a choice card, `step` is 'card' while everyone picks, 'result' once
   * the host shows the answer, and 'explain' while Papa Dorin reads the explanation aloud.
   */
  | { kind: 'lesson'; passageId: number; stop: number; card: number; step: 'card' | 'result' | 'explain' }
  /** Trivia hosted by Papa Dorin on a lesson's questions; the game itself is in his TRIVIA_ATTRIBUTE. */
  | { kind: 'trivia'; passageId: number };

/** The verse being shown, when the host is showing one. */
export type VerseShowState = Extract<CallShow, { kind: 'verse' }>;

/** The lesson card being shown, when the host is doing a lesson together. */
export type LessonShowState = Extract<CallShow, { kind: 'lesson' }>;

/** The trivia game being shown. */
export type TriviaShowState = Extract<CallShow, { kind: 'trivia' }>;

/** One person's pick on a lesson choice card: which card, and the positions of the answers they picked. */
export type LessonPick = { passageId: number; stop: number; card: number; answers: number[] };

/** Where Papa Dorin's trivia game is. */
export type TriviaPhase = 'reading' | 'answering' | 'results' | 'explaining' | 'winner';

/** One person's trivia score. */
export type TriviaScore = { identity: string; name: string; score: number };

/**
 * Papa Dorin's trivia game, decided on the server (his program), never on a phone. The right answer and everyone's
 * picks only appear once the phase is 'results' or later.
 */
export type TriviaState = {
  /** Where the game is. */
  phase: TriviaPhase;
  /** The game's title, like the lesson's name ("Joseph's Dreams and His Brothers Sell Him"). */
  title: string;
  /** The question number (1-based) and how many there are. */
  index: number;
  total: number;
  /** The question and its answers, in order (position 1 first). */
  question: string;
  answers: { position: number; text: string }[];
  /** When answering ends (milliseconds since 1970), set once he finishes reading. */
  deadline: number | null;
  /** How many people have answered so far (picks stay hidden until results). */
  answered: number;
  /** The identities of the people who have answered this question so far (never what they picked before results). */
  answeredBy: string[];
  /** After the answers close: the right answer's position, the verses, and who picked what (identity to position). */
  correct: number | null;
  verses: string | null;
  picks: Record<string, number> | null;
  /** After the answers close: the BSB words of the question's verses (`verses` is their reference). */
  verseText: string | null;
  /** Everyone's scores so far, highest first. */
  scores: TriviaScore[];
};

/** The names of the requests the call sends to Papa Dorin's program (LiveKit RPC methods). */
export const DORIN_RPC = {
  /** Hold to talk (anyone). */
  startTurn: 'start_turn',
  endTurn: 'end_turn',
  cancelTurn: 'cancel_turn',
  /** The person he's answering, or the host: stops him mid-answer. */
  stopAnswer: 'stop_answer',
  /** Host only: read a lesson choice card's written explanation aloud. Payload: JSON {passageId, stop, card}. */
  readExplanation: 'read_explanation',
  /** Host only: start trivia on a lesson's questions (payload JSON {passageId}), go on, explain, or end it. */
  triviaStart: 'trivia_start',
  triviaNext: 'trivia_next',
  triviaExplain: 'trivia_explain',
  triviaEnd: 'trivia_end',
  /** Host only: closes the answers now (shows the results) without waiting for the clock or everyone. */
  triviaClose: 'trivia_close',
  /** Anyone: their trivia pick. Payload: JSON {position}. */
  triviaPick: 'trivia_pick',
} as const;
