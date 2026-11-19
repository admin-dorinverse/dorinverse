// The Record practice mode: the person records themselves saying the verse. The microphone gets ready first, then a
// short beep says "go", and recording starts only once the beep has ended, so the beep is never on the recording.
// While recording, other apps' music pauses and the app's sounds hush. Done plays it back once, then offers Replay,
// Clear (start over) and Redo (record again right away). The recording stays on the phone until the next one.

import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
} from 'expo-audio';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { hushSounds, playSound } from '@/components/common/sounds';
import { fonts } from '@/theme/text';
import { indexCard, verseMemory } from '@/theme/verseMemoryColors';
import type { ModeProps } from './HideMode';
import { IndexCard, cardWords } from './IndexCard';
import { PracticeButton } from './PracticeButton';

/** Where recording is: not started, getting the microphone ready, recording, or finished (Play, Clear or Redo). */
type RecordStage = 'idle' | 'starting' | 'recording' | 'done';

/** How long to wait after the start beep before recording (ms): the beep's length, plus room for it to fade. */
const AFTER_BEEP_MS = 350;

/** Waits a number of milliseconds. */
const wait = (ms: number) => new Promise((done) => setTimeout(done, ms));

/** The app's usual sound setting: quiet on silent, mixed with the person's music (as in sounds.ts). */
const USUAL_AUDIO = { allowsRecording: false, playsInSilentMode: false, interruptionMode: 'mixWithOthers' } as const;

/** While recording: the microphone on, and other apps' music paused. */
const RECORDING_AUDIO = { allowsRecording: true, playsInSilentMode: true, interruptionMode: 'doNotMix' } as const;

/** After recording: other apps' music stays paused, so the recording can be heard clearly. */
const LISTENING_AUDIO = { allowsRecording: false, playsInSilentMode: true, interruptionMode: 'doNotMix' } as const;

/** The Record mode. */
export function RecordMode({ reference, words }: ModeProps) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const player = useAudioPlayer(null);
  const playing = useAudioPlayerStatus(player).playing;
  const [stage, setStage] = useState<RecordStage>('idle');
  const [note, setNote] = useState('');

  // Leaving the mode or the page stops any recording, lets the app's sounds play and lets other music mix again.
  useEffect(
    () => () => {
      // The recorder may already be let go by its hook here, so a failed check is fine to ignore.
      try {
        if (recorder.isRecording) recorder.stop().catch(() => {});
      } catch {}
      hushSounds(false);
      setAudioModeAsync(USUAL_AUDIO).catch(() => {});
    },
    [recorder],
  );

  /** Asks for the microphone if needed, then starts a new recording. */
  const start = async () => {
    player.pause();
    const permission = await requestRecordingPermissionsAsync();
    if (!permission.granted) {
      setNote('The microphone is off for this app. Turn it on in Settings to record.');
      return;
    }
    setNote('');
    setStage('starting');
    try {
      await setAudioModeAsync(RECORDING_AUDIO);
      await recorder.prepareToRecordAsync();
      // The beep plays before the sounds hush, and recording starts only after it has ended.
      playSound('word');
      await wait(AFTER_BEEP_MS);
      hushSounds(true);
      recorder.record();
      setStage('recording');
    } catch {
      hushSounds(false);
      setStage('idle');
      setNote('Recording could not start. Try again.');
    }
  };

  /** Stops recording and plays it back once. */
  const stop = async () => {
    setStage('done');
    setNote('');
    try {
      await recorder.stop();
      await setAudioModeAsync(LISTENING_AUDIO);
      if (recorder.uri) {
        player.replace({ uri: recorder.uri });
        player.play();
      }
    } catch {}
    hushSounds(false);
  };

  /** Plays the recording again from the start. It waits for the jump back to the start, or it would play from the end. */
  const play = async () => {
    player.pause();
    try {
      await player.seekTo(0);
    } catch {}
    player.play();
  };

  /** Throws the recording away and starts over. */
  const clear = () => {
    player.pause();
    setStage('idle');
    setNote('');
    setAudioModeAsync(USUAL_AUDIO).catch(() => {});
  };

  return (
    <>
      <IndexCard reference={reference}>
        {stage === 'recording' || stage === 'starting' ? (
          // While the microphone gets ready the card says so; the microphone picture shows only once it records.
          <View style={styles.recording}>
            {stage === 'starting' ? (
              <Text style={styles.getReady}>Get ready…</Text>
            ) : (
              <>
                <Text style={styles.mic}>🎙️</Text>
                <Text style={styles.recordingRef}>Recording…</Text>
              </>
            )}
          </View>
        ) : (
          <Text style={cardWords}>{words.join(' ')}</Text>
        )}
      </IndexCard>
      <View style={styles.controls}>
        {stage === 'idle' && <PracticeButton label="🎙️ Record" onPress={start} />}
        {stage === 'recording' && <PracticeButton label="⏹️ Done" look="red" onPress={stop} />}
        {stage === 'done' && (
          <View style={styles.choices}>
            <View style={styles.choice}>
              <PracticeButton label="▶️ Replay" onPress={play} />
            </View>
            <View style={styles.choice}>
              <PracticeButton label="Clear" look="ghost" onPress={clear} />
            </View>
            <View style={styles.choice}>
              <PracticeButton label="🎙️ Redo" look="ghost" onPress={start} />
            </View>
          </View>
        )}
      </View>
      {(playing || note !== '') && <Text style={styles.note}>{playing ? 'Playing back…' : note}</Text>}
    </>
  );
}

const styles = StyleSheet.create({
  recording: { alignItems: 'center', paddingVertical: 30 },
  mic: { fontSize: 34 },
  getReady: { fontFamily: fonts.black, fontSize: 22, lineHeight: 66, color: indexCard.reference },
  recordingRef: { fontFamily: fonts.black, fontSize: 18, marginTop: 6, color: indexCard.reference },
  controls: { marginTop: 14, alignItems: 'center' },
  choices: { flexDirection: 'row', gap: 8, width: '100%' },
  choice: { flex: 1 },
  note: { textAlign: 'center', fontFamily: fonts.bold, fontSize: 13, color: verseMemory.soft, marginTop: 12 },
});
