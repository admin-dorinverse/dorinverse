// The LiveKit call parts the call screens use, on the phone: the hooks and the room come from LiveKit's phone
// library, which plays everyone's voices by itself. The browser gets the same names from livekit.web.ts, so every
// call screen works in both without knowing which one it's in.

import type { ReactNode } from 'react';

export {
  AudioSession,
  LiveKitRoom,
  useIsMuted,
  useIsSpeaking,
  useLocalParticipant,
  useParticipants,
  useRemoteParticipants,
  useRoomContext,
  useVoiceAssistant,
} from '@livekit/react-native';

/** True on the phone, where the loudspeaker can be switched to the earpiece. */
export const CAN_PICK_SPEAKER = true;

/** Props for the voices player. */
type CallAudioProps = {
  /** Nothing goes inside; it only plays sound. */
  children?: ReactNode;
};

/** Plays everyone's voices. On the phone LiveKit already does this, so it draws nothing. */
export function CallAudio(_props: CallAudioProps) {
  return null;
}
