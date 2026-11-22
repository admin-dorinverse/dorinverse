// Papa Dorin on the call, as the app sees him: whether he's here, on his way, listening, thinking or talking, who
// is asking him, and his words. Holding his picture (or tapping it, with Tap to talk) asks him something (and
// calls him in first if he's away). One person at a time: while someone asks or he answers, asking is closed for
// everyone else. The person he's answering, or the host, can stop him.
// The bell rings when he's about to speak, and everyone else is turned down on this phone while he talks.

import { useRemoteParticipants, useRoomContext, useVoiceAssistant } from './livekit';
import { RoomEvent, type Participant } from 'livekit-client';
import { useEffect, useRef, useState } from 'react';
import { playSound } from '@/components/common/sounds';
import { wakePapaDorin } from '@/data/callSource';
import { DORIN_RPC, HOST_PREFIX } from '@/types/call';
import { useCallWords } from './useCallWords';

/** How loud the others are while Papa Dorin talks (1 is normal). */
const OTHERS_WHILE_HE_TALKS = 0.3;

/** The longest he listens to one question (2 minutes) before answering it on his own. */
const LONGEST_QUESTION_MS = 2 * 60 * 1000;

/** What Papa Dorin is doing, as the screens show it. */
export type DorinStatus = 'away' | 'coming' | 'ready' | 'listening' | 'thinking' | 'talking';

/** What he's doing, from whether he's here, was called, someone holds him, and LiveKit's agent state. */
function statusOf(here: boolean, called: boolean, held: boolean, state: string): DorinStatus {
  if (!here) return called ? 'coming' : 'away';
  if (held) return 'listening';
  if (state === 'thinking') return 'thinking';
  if (state === 'speaking') return 'talking';
  return 'ready';
}

/** Papa Dorin's state on the call, and the hold-to-ask actions. */
export function usePapaDorin(room: string) {
  const lk = useRoomContext();
  const { agent, state, agentAttributes } = useVoiceAssistant();
  const others = useRemoteParticipants();
  const words = useCallWords(agent?.identity);
  const [called, setCalled] = useState(false);
  const [holding, setHolding] = useState(false);
  const [note, setNote] = useState('');
  // True while this person's finger is on his picture; read when he arrives mid-hold.
  const fingerDown = useRef(false);
  // The start of a question still on its way to him, so letting go always comes after it.
  const starting = useRef<Promise<boolean> | null>(null);

  // Who is asking him: the person he's listening to, or the one he's answering.
  const askerId = agentAttributes?.asker ?? '';
  const someoneHolds = agentAttributes?.holding === 'yes';
  const asker: Participant | undefined = askerId === lk.localParticipant.identity ? lk.localParticipant : lk.remoteParticipants.get(askerId);
  const status = statusOf(!!agent, called, holding || someoneHolds, state);
  const me = lk.localParticipant.identity;
  const isHost = me.startsWith(HOST_PREFIX);
  const answering = state === 'thinking' || state === 'speaking';
  const askerName = asker ? (askerId === me ? 'you' : asker.name || 'someone') : '';
  // Asking is closed while someone else holds him, or while he's talking (answering, or reading something out).
  const closed = (someoneHolds && !holding) || (!holding && answering);
  /** Why asking is closed now, for the ask buttons; empty while it's open. */
  const closedLine = !closed
    ? ''
    : someoneHolds
      ? `${asker?.name || 'Someone'} is asking him now`
      : askerName
        ? `Wait until he's done answering ${askerName}`
        : "Wait until he's done talking";
  // The person he's answering, or the host, can stop him while he answers.
  const canStop = answering && !someoneHolds && (isHost || (askerId !== '' && askerId === me));

  /** Sends him one of the hold-to-talk signals; false when he refused it. */
  const signal = async (to: string, method: 'start_turn' | 'end_turn' | 'cancel_turn'): Promise<boolean> =>
    (await lk.localParticipant.performRpc({ destinationIdentity: to, method, payload: '' })) === 'ok';

  /** Starts listening to this person, once he's on the call. */
  const begin = (to: string) => {
    starting.current = (async () => {
      await lk.localParticipant.setMicrophoneEnabled(true);
      const ok = await signal(to, 'start_turn');
      if (!ok) {
        setHolding(false);
        setNote("Someone else is asking him, or he's still answering. Try again when he's done.");
      }
      return ok;
    })().catch(() => {
      setHolding(false);
      setNote('Papa Dorin could not hear you. Try again.');
      return false;
    });
  };

  // When he arrives he's no longer "on his way"; if this person is still holding his picture, he listens to them.
  useEffect(() => {
    const arrived = (p: Participant) => {
      if (!p.isAgent) return;
      setCalled(false);
      if (fingerDown.current) begin(p.identity);
    };
    lk.on(RoomEvent.ParticipantConnected, arrived);
    return () => {
      lk.off(RoomEvent.ParticipantConnected, arrived);
    };
    // begin only uses the room and refs, so it doesn't need to restart this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lk]);

  // The bell, as he starts to speak.
  useEffect(() => {
    if (state === 'speaking') playSound('ding');
  }, [state]);

  // Everyone else is turned down while he talks, on this phone only.
  useEffect(() => {
    const quiet = state === 'speaking';
    for (const p of others) if (p.identity !== agent?.identity) p.setVolume(quiet ? OTHERS_WHILE_HE_TALKS : 1);
  }, [state, others, agent]);

  /** Their finger goes down on his picture: he listens to them only (after coming in, if he was away). */
  const startAsking = () => {
    if (closed) {
      setNote(closedLine);
      return;
    }
    setNote('');
    fingerDown.current = true;
    setHolding(true);
    if (agent) return begin(agent.identity);
    setCalled(true);
    wakePapaDorin(room).catch((e: unknown) => {
      setCalled(false);
      setHolding(false);
      setNote(e instanceof Error ? e.message : 'Papa Dorin could not be reached.');
    });
  };

  /** Their finger comes up: he answers what he heard (or, if he hadn't started listening, nothing happens). */
  const stopAsking = () => {
    fingerDown.current = false;
    const pending = starting.current;
    starting.current = null;
    setHolding(false);
    const to = agent?.identity;
    if (to) void pending?.then((ok) => (ok ? signal(to, 'end_turn') : false)).catch(() => false);
  };

  // With Tap to talk, someone may forget to tap Done; after a long question he answers anyway and stops listening.
  const stopRef = useRef(stopAsking);
  useEffect(() => {
    stopRef.current = stopAsking;
  });
  useEffect(() => {
    if (!holding) return;
    const cap = setTimeout(() => stopRef.current(), LONGEST_QUESTION_MS);
    return () => clearTimeout(cap);
  }, [holding]);

  /** Stops him mid-answer (only for the person he's answering, or the host). */
  const stopAnswer = () => {
    if (!agent || !canStop) return;
    lk.localParticipant.performRpc({ destinationIdentity: agent.identity, method: DORIN_RPC.stopAnswer, payload: '' }).catch(() => {});
  };

  return { status, asker, holding, words, note, startAsking, stopAsking, closed, closedLine, canStop, stopAnswer };
}

/** Papa Dorin on the call, as the screens get him from usePapaDorin. */
export type PapaDorin = ReturnType<typeof usePapaDorin>;
