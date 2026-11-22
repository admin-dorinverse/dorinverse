// Who is talking on the call now, and who talked most recently, for the people strip under a shown verse and the
// small avatars at the top of a lesson. LiveKit says when the talkers change (a few times a second at most), so
// this redraws only then.

import { RoomEvent, type Participant } from 'livekit-client';
import { useEffect, useState } from 'react';
import { useRoomContext } from './livekit';

/** How many recent talkers are remembered, newest first. */
const REMEMBERED = 12;

/** The identities of the people talking now, and of everyone who talked lately, newest first. */
export type Talkers = { now: string[]; recent: string[] };

/** The identities of people (not Papa Dorin) among LiveKit's talkers. */
function idsOf(speakers: Participant[]): string[] {
  return speakers.filter((p) => !p.isAgent).map((p) => p.identity);
}

/** Who is talking now and who talked lately. */
export function useTalkers(): Talkers {
  const lk = useRoomContext();
  const [talkers, setTalkers] = useState<Talkers>(() => {
    const now = idsOf(lk.activeSpeakers);
    return { now, recent: now };
  });
  useEffect(() => {
    const changed = (speakers: Participant[]) => {
      const now = idsOf(speakers);
      setTalkers((t) => ({ now, recent: [...now, ...t.recent.filter((id) => !now.includes(id))].slice(0, REMEMBERED) }));
    };
    lk.on(RoomEvent.ActiveSpeakersChanged, changed);
    return () => {
      lk.off(RoomEvent.ActiveSpeakersChanged, changed);
    };
  }, [lk]);
  return talkers;
}

/** The people in the order the strip shows them: talked most recently first, then everyone else as they joined. */
export function byRecent(people: Participant[], recent: string[]): Participant[] {
  const rank = (p: Participant) => {
    const at = recent.indexOf(p.identity);
    return at < 0 ? REMEMBERED : at;
  };
  return [...people].sort((a, b) => rank(a) - rank(b));
}
