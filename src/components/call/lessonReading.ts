// Papa Dorin reading a question's explanation aloud to everyone: the host's request to his program (calling him in
// first if he's away), and, on every phone, which sentence he's on as he reads and when he's done, from the words
// he says. Sentences are lit from what he has actually said, so the screen never runs ahead of his voice.

import type { Participant, Room } from 'livekit-client';
import { RoomEvent } from 'livekit-client';
import { useMemo, useState } from 'react';
import { wakePapaDorin } from '@/data/callSource';
import { DORIN_RPC, type LessonShowState } from '@/types/call';
import { sentenceAtWord, sentencesOf, wordsOf, wordsRead, type ReadSentence } from './lessonFlow';
import type { PapaDorin } from './usePapaDorin';

/** How long the host waits for him to arrive after calling him in. */
const ARRIVE_MS = 45_000;

/** How many times the request is sent while his program starts up, and the wait between tries. */
const TRIES = 6;
const RETRY_MS = 1500;

/** How long one request waits for his answer. */
const ANSWER_MS = 15_000;

/** Papa Dorin, when he's on the call. */
function agentOf(lk: Room): Participant | undefined {
  return [...lk.remoteParticipants.values()].find((p) => p.isAgent);
}

/** Waits for Papa Dorin to join the call. */
function arrival(lk: Room): Promise<Participant> {
  return new Promise((resolve, reject) => {
    const here = agentOf(lk);
    if (here) return resolve(here);
    const joined = (p: Participant) => {
      if (!p.isAgent) return;
      clearTimeout(giveUp);
      lk.off(RoomEvent.ParticipantConnected, joined);
      resolve(p);
    };
    const giveUp = setTimeout(() => {
      lk.off(RoomEvent.ParticipantConnected, joined);
      reject(new Error('Papa Dorin could not be reached.'));
    }, ARRIVE_MS);
    lk.on(RoomEvent.ParticipantConnected, joined);
  });
}

/** Asks Papa Dorin to read this card's explanation aloud to everyone (the host only), calling him in if he's away. */
export async function askToRead(lk: Room, show: LessonShowState): Promise<void> {
  if (!agentOf(lk)) await wakePapaDorin(lk.name);
  const agent = await arrival(lk);
  const payload = JSON.stringify({ passageId: show.passageId, stop: show.stop, card: show.card });
  let last: unknown = null;
  for (let i = 0; i < TRIES; i++) {
    let reply: string;
    try {
      reply = await lk.localParticipant.performRpc({ destinationIdentity: agent.identity, method: DORIN_RPC.readExplanation, payload, responseTimeout: ANSWER_MS });
    } catch (e) {
      // Just after he joins, his program may not take requests yet.
      last = e;
      await new Promise((r) => setTimeout(r, RETRY_MS));
      continue;
    }
    if (reply === 'ok') return;
    throw new Error(reply === 'no explanation' ? 'Papa Dorin has no explanation written for this one.' : 'Papa Dorin could not read it.');
  }
  throw last instanceof Error ? last : new Error('Papa Dorin could not read it.');
}

/** Where he is in the explanation: the sentences, the one he's on (-1 before he starts), and whether he's done. */
export type Reading = { sentences: ReadSentence[]; at: number; done: boolean; started: boolean };

/** What he had said when the reading began on this phone, and whether he has started and finished since. */
type Mark = { active: boolean; base: number; talked: boolean; done: boolean };

/** Follows his reading of `paragraphs` while `active` (the explain step is showing). */
export function useReading(paragraphs: readonly string[], dorin: PapaDorin, active: boolean): Reading {
  const said = [dorin.words.saidBefore, dorin.words.saidNow].filter(Boolean).join(' ');
  const talking = dorin.status === 'talking';
  const [mark, setMark] = useState<Mark>({ active, base: said.length, talked: false, done: false });
  // Kept up while drawing, so the page never draws a step behind: a new reading, his first words, his last.
  if (mark.active !== active) setMark({ active, base: said.length, talked: false, done: false });
  else if (active && !mark.talked && talking) setMark({ ...mark, talked: true });
  else if (active && mark.talked && !mark.done && !talking && dorin.status !== 'thinking') setMark({ ...mark, done: true });

  const sentences = useMemo(() => sentencesOf(paragraphs), [paragraphs]);
  const counts = useMemo(() => sentences.map((s) => wordsOf(s.text).length), [sentences]);
  const written = useMemo(() => sentences.flatMap((s) => wordsOf(s.text)), [sentences]);
  // Only what he said since the reading began counts (a new question clears his words, then all of it counts).
  const spoken = said.length >= mark.base ? said.slice(mark.base) : said;
  const read = useMemo(() => wordsRead(written, wordsOf(spoken)), [written, spoken]);
  const at = mark.done || read === 0 ? -1 : sentenceAtWord(counts, read - 1);
  return { sentences, at, done: mark.done, started: mark.talked };
}
