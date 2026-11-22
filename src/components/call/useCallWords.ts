// The words on the call that the screens show: what Papa Dorin hears from the person asking him, and what he says
// as he says it. LiveKit sends both as live text in pieces; this keeps them together and redraws at most 20 times a
// second while they stream in.

import { useRoomContext } from './livekit';
import { useEffect, useRef, useState } from 'react';

/** LiveKit's topic for spoken words turned into text. */
const TOPIC = 'lk.transcription';

/** How often the words on screen are redrawn while they stream in (20 times a second). */
const REDRAW_MS = 50;

/** The words to show: the question he heard, what he already said, and the part he's saying now. */
export type CallWords = { heard: string; saidBefore: string; saidNow: string };

/** Nothing heard or said yet. */
const NONE: CallWords = { heard: '', saidBefore: '', saidNow: '' };

/** The latest question Papa Dorin heard and his answer so far, for one call. */
export function useCallWords(dorinIdentity: string | undefined): CallWords {
  const lk = useRoomContext();
  const [words, setWords] = useState<CallWords>(NONE);
  const latest = useRef<CallWords>(NONE);
  // The question comes in pieces, each re-sent as it firms up; kept by piece, in order.
  const heardPieces = useRef(new Map<string, string>());
  const redraw = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    /** Redraws soon, not on every little piece. */
    const soon = () => {
      redraw.current ??= setTimeout(() => {
        redraw.current = null;
        setWords(latest.current);
      }, REDRAW_MS);
    };
    lk.registerTextStreamHandler(TOPIC, async (reader, from) => {
      const attrs = reader.info.attributes ?? {};
      const dorin = dorinIdentity ? lk.remoteParticipants.get(dorinIdentity) : undefined;
      const hisTracks = new Set([...(dorin?.trackPublications.values() ?? [])].map((t) => t.trackSid));
      // His own speech is about his own voice; anything else he sends is what he heard someone say.
      const isHisSpeech = from.identity === dorinIdentity && hisTracks.has(attrs['lk.transcribed_track_id'] ?? '');
      const piece = attrs['lk.segment_id'] ?? reader.info.id;
      if (isHisSpeech) {
        // A new sentence: the one before moves into what he already said.
        const before = [latest.current.saidBefore, latest.current.saidNow].filter(Boolean).join(' ');
        latest.current = { ...latest.current, saidBefore: before, saidNow: '' };
      } else if (heardPieces.current.size > 0 && latest.current.saidNow !== '') {
        // A new question after an answer: start fresh, so an old answer never shows under it.
        heardPieces.current.clear();
        latest.current = NONE;
      }
      let text = '';
      try {
        for await (const chunk of reader) {
          text += chunk;
          if (isHisSpeech) {
            latest.current = { ...latest.current, saidNow: text };
          } else {
            heardPieces.current.set(piece, text);
            latest.current = { ...latest.current, heard: [...heardPieces.current.values()].join(' ').trim() };
          }
          soon();
        }
      } catch {
        // The words stopped mid-stream because the call ended, this person left, or Papa Dorin left or was stopped.
        // LiveKit reports that as "Room disconnected in the middle of receiving data"; what came in so far stays.
      }
    });
    return () => {
      lk.unregisterTextStreamHandler(TOPIC);
      if (redraw.current) clearTimeout(redraw.current);
      redraw.current = null;
    };
  }, [lk, dorinIdentity]);

  return words;
}
