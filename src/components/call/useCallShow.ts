// What the host is showing everyone (the call screen, a verse, a lesson, or trivia), read from the host's attribute
// on the call so everyone, including people who join late, sees the same thing. The host changes it with `setShow`.

import type { Participant } from 'livekit-client';
import { RoomEvent } from 'livekit-client';
import { useEffect, useState } from 'react';
import { HOST_PREFIX, SHOW_ATTRIBUTE, type CallShow } from '@/types/call';
import { useRoomContext } from './livekit';

/** The call screen with everyone's avatars, before the host shows anything. */
const LOBBY: CallShow = { kind: 'lobby' };

/** The host on the call (or undefined while they're away). */
function hostOf(people: Participant[]): Participant | undefined {
  return people.find((p) => p.identity.startsWith(HOST_PREFIX));
}

/** Reads what a host's attribute says is showing; anything unreadable counts as the call screen. */
function showOf(host: Participant | undefined): CallShow {
  const raw = host?.attributes[SHOW_ATTRIBUTE];
  if (!raw) return LOBBY;
  try {
    return JSON.parse(raw) as CallShow;
  } catch {
    return LOBBY;
  }
}

/** What's showing, whether this person is the host, and (for the host) how to change it. */
export function useCallShow() {
  const lk = useRoomContext();
  const everyone = (): Participant[] => [lk.localParticipant, ...lk.remoteParticipants.values()];
  const [show, setShown] = useState<CallShow>(() => showOf(hostOf(everyone())));
  const isHost = lk.localParticipant.identity.startsWith(HOST_PREFIX);

  // Follows the host's attribute as it changes, and when the host joins or leaves.
  useEffect(() => {
    const look = () => setShown(showOf(hostOf([lk.localParticipant, ...lk.remoteParticipants.values()])));
    lk.on(RoomEvent.ParticipantAttributesChanged, look);
    lk.on(RoomEvent.ParticipantConnected, look);
    lk.on(RoomEvent.ParticipantDisconnected, look);
    lk.on(RoomEvent.Connected, look);
    return () => {
      lk.off(RoomEvent.ParticipantAttributesChanged, look);
      lk.off(RoomEvent.ParticipantConnected, look);
      lk.off(RoomEvent.ParticipantDisconnected, look);
      lk.off(RoomEvent.Connected, look);
    };
  }, [lk]);

  /** The host shows something new to everyone (does nothing for guests). */
  const setShow = (next: CallShow) => {
    if (!isHost) return;
    setShown(next);
    // A call that has just closed can refuse this; nothing to do then.
    lk.localParticipant.setAttributes({ [SHOW_ATTRIBUTE]: JSON.stringify(next) }).catch(() => {});
  };

  return { show, isHost, setShow };
}
