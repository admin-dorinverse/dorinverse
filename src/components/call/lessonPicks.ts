// Everyone's picks on the lesson question showing now. Each person writes their own pick to their own call
// attribute (PICK_ATTRIBUTE), so nobody can change anyone else's, and everyone's phone reads all of them. This
// redraws only when someone's attributes change.

import { RoomEvent, type Participant } from 'livekit-client';
import { useEffect, useMemo, useState } from 'react';
import { PICK_ATTRIBUTE, type LessonPick, type LessonShowState } from '@/types/call';
import { useRoomContext } from './livekit';

/** A person's pick, when it's on the card showing now and holds at least one answer. */
function pickOf(person: Participant, show: LessonShowState): number[] | null {
  const raw = person.attributes[PICK_ATTRIBUTE];
  if (!raw) return null;
  try {
    const pick = JSON.parse(raw) as LessonPick;
    const here = pick.passageId === show.passageId && pick.stop === show.stop && pick.card === show.card;
    return here && Array.isArray(pick.answers) && pick.answers.length > 0 ? pick.answers : null;
  } catch {
    return null;
  }
}

/** Everyone's picks on this card (identity to their answers), and how this person sends theirs. */
export function usePicks(show: LessonShowState, people: Participant[]) {
  const lk = useRoomContext();
  // Counts attribute changes, so the picks are read again when anyone's change.
  const [changes, setChanges] = useState(0);
  useEffect(() => {
    const changed = () => setChanges((n) => n + 1);
    lk.on(RoomEvent.ParticipantAttributesChanged, changed);
    return () => {
      lk.off(RoomEvent.ParticipantAttributesChanged, changed);
    };
  }, [lk]);

  const { passageId, stop, card } = show;
  const picks = useMemo(() => {
    void changes;
    const here = { passageId, stop, card } as LessonShowState;
    const found = new Map<string, number[]>();
    for (const p of people) {
      const answers = pickOf(p, here);
      if (answers) found.set(p.identity, answers);
    }
    return found;
  }, [people, changes, passageId, stop, card]);

  /** Sends this person's pick for the card (an empty list takes it back). */
  const send = (answers: number[]) => {
    const pick: LessonPick = { passageId, stop, card, answers };
    void lk.localParticipant.setAttributes({ [PICK_ATTRIBUTE]: JSON.stringify(pick) }).catch(() => {});
  };

  return { picks, send };
}
