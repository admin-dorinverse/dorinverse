// How loud the microphone is right now, for the joining screen's mic check, before the call starts. It listens with
// the app's own recorder (expo-audio, as Verse Memory does) with level reading on, and redraws at most 20 times a
// second, only when the number of lit bars changes and only while the app is on screen. The recorder stops, and the
// app's usual sound setting comes back, when the joining screen closes.
//
// Why not LiveKit's level reader: on Android, a microphone's level only reaches it once the call's audio engine is
// sending, which starts after joining, so before joining its bars never moved.

import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder } from 'expo-audio';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

/** How often the bars can change (20 times a second). */
const REDRAW_MS = 50;

/** The recorder: small and low quality (nothing is kept), with the sound level reported. */
const CHECK_RECORDING = { ...RecordingPresets.LOW_QUALITY, isMeteringEnabled: true };

/** While checking: the microphone on, and other apps' music and the app's sounds (Test sound) still playing. */
const CHECKING_AUDIO = { allowsRecording: true, playsInSilentMode: true, interruptionMode: 'mixWithOthers' } as const;

/** The app's usual sound setting afterwards (as in sounds.ts). */
const USUAL_AUDIO = { allowsRecording: false, playsInSilentMode: false, interruptionMode: 'mixWithOthers' } as const;

/** The quietest level counted, in decibels; everything quieter shows no bars. Speech is roughly -40 to -10. */
const QUIETEST_DB = -55;

/** The mic check's state: how many of its bars are lit, and whether the microphone could not be opened. */
export type MicLevel = { lit: number; failed: boolean };

/** The microphone's level as lit bars, out of `bars`. */
export function useMicLevel(bars: number): MicLevel {
  const recorder = useAudioRecorder(CHECK_RECORDING);
  const [lit, setLit] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let gone = false;
    let timer: ReturnType<typeof setInterval> | null = null;
    let shown = 0;

    (async () => {
      try {
        const permission = await requestRecordingPermissionsAsync();
        if (!permission.granted) throw new Error('no microphone');
        await setAudioModeAsync(CHECKING_AUDIO);
        await recorder.prepareToRecordAsync();
        if (gone) return;
        recorder.record();
        timer = setInterval(() => {
          if (AppState.currentState !== 'active') return;
          const db = recorder.getStatus().metering ?? QUIETEST_DB;
          const level = Math.max(0, Math.min(1, (db - QUIETEST_DB) / -QUIETEST_DB));
          const next = Math.round(level * bars);
          if (next !== shown) {
            shown = next;
            setLit(next);
          }
        }, REDRAW_MS);
      } catch {
        if (!gone) setFailed(true);
      }
    })();

    return () => {
      gone = true;
      if (timer) clearInterval(timer);
      // The recorder may already be let go by its hook here, so a failed stop is fine to ignore.
      try {
        if (recorder.isRecording) recorder.stop().catch(() => {});
      } catch {}
      setAudioModeAsync(USUAL_AUDIO).catch(() => {});
    };
  }, [recorder, bars]);

  return { lit, failed };
}
