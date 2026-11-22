// Papa Dorin's trivia game on a call, decided here and never on a phone: he reads each question and its answers
// aloud, the clock starts once he has finished, everyone picks once, and the answers close at the deadline or when
// everyone has picked. Then the right answer, the verses, everyone's picks and the scores go out. Every phone
// draws the game from his TRIVIA_ATTRIBUTE (JSON of the app's TriviaState in src/types/call.ts).

import { loadTrivia } from './lessonText.mjs';

/** Papa Dorin's attribute holding the game (the app's TRIVIA_ATTRIBUTE). */
export const TRIVIA_ATTRIBUTE = 'trivia';

/** How long everyone has to pick, from when he finishes reading. */
const ANSWER_MS = 20_000;

/** The points for a right answer. A wrong answer or no answer scores nothing. */
const POINTS = 100;

/** The letters the answers are read with, by position. */
const LETTERS = ['A', 'B', 'C', 'D'];

/**
 * "Papa Dorin, explain it" is on: the owner approved the exact words sent to Claude (EXPLAIN_REQUEST) on
 * 2026-11-21. Set to false to turn it off; trivia_explain then answers 'not approved'.
 */
export const EXPLAIN_APPROVED = true;

/**
 * The whole message Claude gets when the host taps "Papa Dorin, explain it", sent as if the host had asked him (his
 * notes stay his whole prompt). Approved by the owner word for word on 2026-11-21; don't change it without their yes.
 */
export const EXPLAIN_REQUEST = ({ question, answer, verses, verseText }) =>
  `Papa Dorin, explain it.\n\nQuestion: ${question}\nRight answer: ${answer}\n${verses} (BSB): ${verseText}`;

/** The places he names when he cheers: the top three. */
const CHEER_PLACES = ['Winner', 'Second', 'Third'];

/**
 * The whole message Claude gets when trivia ends, so Papa Dorin cheers the winner out loud, sent as if a baker had
 * asked (his notes stay his whole prompt). Approved by the owner word for word on 2026-11-21; don't change it
 * without their yes. Only the places that have someone are listed (a game of two has no third).
 */
export const CHEER_REQUEST = (top) =>
  `Papa Dorin, cheer for the winner.\n\n${top.map((s, i) => `${CHEER_PLACES[i]}: ${s.name}, ${s.score} points`).join('\n')}`;

/** A question and its answers as he reads them: "Question? A, Ten. B, Twenty." */
function readingText(q) {
  const answers = q.answers.map((a) => `${LETTERS[a.position - 1]}, ${a.text.replace(/[.!?]*$/, '')}.`);
  return [q.question, ...answers].join(' ');
}

/**
 * The trivia game for one call. `publish` puts the state on his attribute (null clears it), `speak` says words
 * aloud and returns the speech, `reply` has him answer a message as if a baker asked it, `stopSpeaking` cuts him
 * off, and `people` lists who is on the call (not agents) as {identity, name}.
 */
export function createTrivia({ publish, speak, reply, stopSpeaking, people }) {
  /** The game running now, or null. */
  let game = null;
  /** Counts each new step, so a step that finishes late (a reading that ends after "next") does nothing. */
  let step = 0;
  /** The answer clock. */
  let clock = null;

  /** Everyone's scores, highest first, with everyone on the call included (newcomers at 0). */
  const scores = () => {
    for (const p of people()) if (!game.scores.has(p.identity)) game.scores.set(p.identity, { name: p.name, score: 0 });
    return [...game.scores]
      .map(([identity, s]) => ({ identity, name: s.name, score: s.score }))
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  };

  /** Sends the game as every phone should see it; the right answer and picks stay null until the results. */
  const send = () => {
    const q = game.questions[game.index];
    const shown = game.phase === 'results' || game.phase === 'explaining' || game.phase === 'winner';
    return publish({
      phase: game.phase,
      title: game.title,
      index: game.index + 1,
      total: game.questions.length,
      question: q.question,
      answers: q.answers.map((a) => ({ position: a.position, text: a.text })),
      deadline: game.deadline,
      answered: game.picks.size,
      answeredBy: [...game.picks.keys()],
      correct: shown ? q.answers.find((a) => a.correct).position : null,
      verses: shown ? q.verses : null,
      picks: shown ? Object.fromEntries(game.picks) : null,
      verseText: shown ? q.verseText || null : null,
      scores: scores(),
    });
  };

  /**
   * Stops the clock and any speech in progress. Each call starts a new step at once (so anything still waiting from
   * the step before does nothing), and resolves once his speech has stopped.
   */
  const settle = () => {
    clearTimeout(clock);
    clock = null;
    step += 1;
    return stopSpeaking();
  };

  /** Reads question `index` aloud, then opens the answers with the clock running. */
  const ask = async (index) => {
    const stopped = settle();
    const mine = step;
    // He finishes stopping before he reads, so the stop can't cut the reading off.
    await stopped;
    if (mine !== step || !game) return;
    Object.assign(game, { index, phase: 'reading', deadline: null, picks: new Map() });
    await send();
    try {
      await speak(readingText(game.questions[index])).waitForPlayout();
    } catch {
      // Cut off (by "next" or "end"); the step check below decides what happens.
    }
    if (mine !== step || !game) return;
    game.phase = 'answering';
    game.deadline = Date.now() + ANSWER_MS;
    clock = setTimeout(() => void close(mine), ANSWER_MS);
    await send();
  };

  /** Closes the answers: right pickers score, and the results go out. */
  const close = async (mine) => {
    if (!game || mine !== step || game.phase !== 'answering') return;
    clearTimeout(clock);
    const right = game.questions[game.index].answers.find((a) => a.correct).position;
    for (const [identity, position] of game.picks) if (position === right) game.scores.get(identity).score += POINTS;
    game.phase = 'results';
    await send();
  };

  return {
    /** True while a question is being read or answered (he doesn't take questions then). */
    get busy() {
      return !!game && (game.phase === 'reading' || game.phase === 'answering');
    },

    /** Host: starts trivia on a lesson's questions. */
    async start(passageId) {
      const loaded = await loadTrivia(passageId);
      if (!loaded) return 'no questions';
      await settle();
      game = { ...loaded, index: 0, phase: 'reading', deadline: null, picks: new Map(), scores: new Map() };
      void ask(0);
      return 'ok';
    },

    /** Anyone: their pick, once per question, only while answering. */
    async pick(identity, name, position) {
      if (!game || game.phase !== 'answering') return 'closed';
      if (game.picks.has(identity)) return 'already picked';
      if (!game.questions[game.index].answers.some((a) => a.position === position)) return 'no such answer';
      game.picks.set(identity, position);
      if (!game.scores.has(identity)) game.scores.set(identity, { name, score: 0 });
      const everyone = people().every((p) => game.picks.has(p.identity));
      if (everyone) await close(step);
      else await send();
      return 'ok';
    },

    /** Host: closes the answers now, without waiting for the clock or for everyone to pick. */
    async closeNow() {
      if (!game || game.phase !== 'answering') return 'not now';
      await close(step);
      return 'ok';
    },

    /** Host: the next question, or the winner after the last one. */
    async next() {
      if (!game || (game.phase !== 'results' && game.phase !== 'explaining')) return 'not now';
      if (game.index + 1 < game.questions.length) {
        void ask(game.index + 1);
        return 'ok';
      }
      await settle();
      game.phase = 'winner';
      await send();
      // He cheers the winner out loud.
      reply(CHEER_REQUEST(scores().slice(0, CHEER_PLACES.length)));
      return 'ok';
    },

    /** Host: he explains the right answer (needs the owner's approval), or with payload 'stop', stops explaining. */
    async explain(payload) {
      if (!EXPLAIN_APPROVED) return 'not approved';
      if (!game || (game.phase !== 'results' && game.phase !== 'explaining')) return 'not now';
      await settle();
      if (payload === 'stop') {
        game.phase = 'results';
        await send();
        return 'ok';
      }
      const q = game.questions[game.index];
      game.phase = 'explaining';
      await send();
      reply(EXPLAIN_REQUEST({ question: q.question, answer: q.answers.find((a) => a.correct).text, verses: q.verses, verseText: q.verseText }));
      return 'ok';
    },

    /** Host: ends the game and clears it from every phone. */
    async end() {
      await settle();
      game = null;
      await publish(null);
      return 'ok';
    },
  };
}
