// The LiveKit call parts the call screens use, in the browser (the web join page for guests without the app): the
// same names as livekit.ts, from LiveKit's browser library. Browsers have no phone audio session or earpiece, so
// those do nothing here, and the voices play through LiveKit's audio player, with a button if Safari blocks sound.

import { LiveKitRoom as BrowserRoom, RoomAudioRenderer, StartAudio, type LiveKitRoomProps } from '@livekit/components-react';
import { createElement, Fragment } from 'react';
import { call } from '@/theme/callColors';
import { fonts } from '@/theme/text';

export {
  useIsMuted,
  useIsSpeaking,
  useLocalParticipant,
  useParticipants,
  useRemoteParticipants,
  useRoomContext,
  useVoiceAssistant,
} from '@livekit/components-react';

/** LiveKit's room, filling the page the way the call screens expect (its wrapper is a plain box otherwise). */
export function LiveKitRoom(props: LiveKitRoomProps) {
  return createElement(BrowserRoom, { ...props, style: { display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 } });
}

/** False in the browser: there's no earpiece to switch to. */
export const CAN_PICK_SPEAKER = false;

/** The phone's audio session; browsers handle their own sound, so each step does nothing. */
export const AudioSession = {
  startAudioSession: async () => {},
  stopAudioSession: async () => {},
  selectAudioOutput: async (_output: string) => {},
};

/** The style of the "Tap to hear the call" button Safari may need: gold, round, across the bottom. */
const START_AUDIO_STYLE = {
  position: 'fixed',
  left: 16,
  right: 16,
  bottom: 96,
  height: 52,
  border: 0,
  borderRadius: 26,
  background: call.talking,
  color: call.ink,
  fontFamily: fonts.black,
  fontSize: 16,
  zIndex: 10,
} as const;

/** Plays everyone's voices in the browser, with a button to tap if the browser is holding the sound back. */
export function CallAudio() {
  return createElement(Fragment, null, createElement(RoomAudioRenderer), createElement(StartAudio, { label: 'Tap to hear the call', style: START_AUDIO_STYLE }));
}
