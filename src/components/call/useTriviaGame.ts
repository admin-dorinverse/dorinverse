// Papa Dorin's trivia game as the call screens see it: the game his program publishes on his TRIVIA_ATTRIBUTE,
// this person's own pick (kept on this phone, since picks stay hidden until the results), and the requests to his
// program. The host's phone also brings him in if he's away and starts the game once he's there.

import { useEffect, useRef, useState } from 'react';
import { wakePapaDorin } from '@/data/callSource';
import { DORIN_RPC, TRIVIA_ATTRIBUTE, type TriviaState } from '@/types/call';
import { useRoomContext, useVoiceAssistant } from './livekit';

/**
 * "Papa Dorin, explain it" shows: the owner approved the words it sends to Claude (2026-11-21). It goes with
 * EXPLAIN_APPROVED in scripts/app/papa-dorin-call/trivia.mjs; turn both off together.
 */
export const EXPLAIN_SHOWN = true;

/** How long people have to answer, matching ANSWER_MS in the call program. Only the clock ring uses it. */
export const ANSWER_SECONDS = 20;

/** Reads the game from his attribute; nothing there, or something unreadable, means no game. */
function gameOf(raw: string | undefined): TriviaState | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as TriviaState;
  } catch {
    return null;
  }
}

/** The trivia game, this person's pick, and what the screens can ask of his program. */
export function useTriviaGame(passageId: number, isHost: boolean) {
  const lk = useRoomContext();
  const { agent, agentAttributes } = useVoiceAssistant();
  const game = gameOf(agentAttributes?.[TRIVIA_ATTRIBUTE]);
  const [note, setNote] = useState('');
  // This person's pick, for the question it was made on (so it clears on the next question).
  const [pick, setPick] = useState<{ index: number; position: number } | null>(null);
  const started = useRef(false);
  const dorin = agent?.identity;

  /** Sends his program a request; its answer is 'ok' or a short reason. */
  const ask = async (method: string, payload: string): Promise<string> => {
    if (!dorin) return 'away';
    try {
      return await lk.localParticipant.performRpc({ destinationIdentity: dorin, method, payload });
    } catch {
      return 'unreachable';
    }
  };

  // The host's phone brings him in if he's away.
  useEffect(() => {
    if (!isHost || agent) return;
    wakePapaDorin(lk.name).catch((e: unknown) => setNote(e instanceof Error ? e.message : 'Papa Dorin could not be reached.'));
  }, [isHost, agent, lk]);

  // Once he's here, the host's phone starts the game, unless one is already going (the host's page reloaded).
  // If he leaves mid-game (his game goes with him), the game starts again when he's back.
  useEffect(() => {
    if (!dorin) started.current = false;
    if (!isHost || !dorin || started.current) return;
    started.current = true;
    if (game) return;
    void ask(DORIN_RPC.triviaStart, JSON.stringify({ passageId })).then((answer) => {
      if (answer === 'no questions') setNote('This lesson has no trivia questions yet.');
      else if (answer !== 'ok') setNote('Papa Dorin could not start the trivia. Try again.');
    });
    // Runs once when he arrives; ask and game are read at that moment on purpose.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, dorin, passageId]);

  const myPick = pick && game && pick.index === game.index ? pick.position : null;

  return {
    /** The game, or null before it starts. */
    game,
    /** True once Papa Dorin is on the call. */
    here: !!agent,
    /** A note for when something went wrong. */
    note,
    /** The answer this person picked on this question, or null. */
    myPick,
    /** Picks an answer (once per question, only while answering). */
    choose(position: number) {
      if (!game || game.phase !== 'answering' || myPick !== null) return;
      setPick({ index: game.index, position });
      void ask(DORIN_RPC.triviaPick, JSON.stringify({ position })).then((answer) => {
        if (answer !== 'ok' && answer !== 'already picked') setPick(null);
      });
    },
    /** Host: shows the answer now, without waiting for the clock or for everyone. */
    closeNow: () => void ask(DORIN_RPC.triviaClose, ''),
    /** Host: the next question, or the winner after the last one. */
    next: () => void ask(DORIN_RPC.triviaNext, ''),
    /** Host: he explains the right answer. */
    explain: () => void ask(DORIN_RPC.triviaExplain, ''),
    /** Host: he stops explaining. */
    stopExplaining: () => void ask(DORIN_RPC.triviaExplain, 'stop'),
    /** Host: ends the game for everyone. */
    end: () => ask(DORIN_RPC.triviaEnd, ''),
  };
}

/** The trivia game as the screens get it from useTriviaGame. */
export type TriviaGame = ReturnType<typeof useTriviaGame>;
