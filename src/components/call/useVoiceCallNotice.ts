// Keeps this person on the voice call while the app is in the background (say, while sending the invite link):
// on Android it shows the ongoing "Voice call in progress" notice for as long as the call page is open. Android
// drops a background app's connection without it. On iPhone and in the browser it does nothing.

import { RoomEvent, Track, type LocalTrackPublication, type Room } from 'livekit-client';
import { useEffect } from 'react';
import { startVoiceCallService, stopVoiceCallService } from '../../../modules/voice-call-service';

/** The notice's title. */
const NOTICE_TITLE = 'Voice call in progress';

/** The notice's second line. */
const NOTICE_BODY = 'Tap to go back to the call.';

/** Shows the call notice while the call page is open, and lets it use the microphone once the mic is turned on. */
export function useVoiceCallNotice(room: Room) {
  // Up when the call opens, down when this person leaves or the call ends (the page closes either way).
  useEffect(() => {
    startVoiceCallService(NOTICE_TITLE, NOTICE_BODY);
    return () => stopVoiceCallService();
  }, []);

  // The first time the microphone goes on, the phone has allowed it, so the notice is started again to cover it.
  useEffect(() => {
    /** Restarts the notice when this person's microphone joins the call. */
    const micOn = (pub: LocalTrackPublication) => {
      if (pub.source === Track.Source.Microphone) startVoiceCallService(NOTICE_TITLE, NOTICE_BODY);
    };
    room.on(RoomEvent.LocalTrackPublished, micOn);
    return () => {
      room.off(RoomEvent.LocalTrackPublished, micOn);
    };
  }, [room]);
}
