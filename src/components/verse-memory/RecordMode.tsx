// The Record practice mode, copied from the prototype: the person records themselves saying the verse, and it
// plays back as soon as they tap Done. The recording stays on the phone and is replaced by the next one.

import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioPlayer, useAudioRecorder } from 'expo-audio';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { fonts } from '@/theme/text';
import { indexCard, verseMemory } from '@/theme/verseMemoryColors';
import type { ModeProps } from './HideMode';
import { IndexCard, cardWords } from './IndexCard';
import { PracticeButton } from './PracticeButton';

/** Where recording is: not started, recording now, or finished and playing back. */
type RecordStage = 'idle' | 'recording' | 'done';

/** The app's usual sound setting: quiet on silent, mixed with the person's music (as in sounds.ts). */
const USUAL_AUDIO = { allowsRecording: false, playsInSilentMode: false, interruptionMode: 'mixWithOthers' } as const;

/** The Record mode. */
export function RecordMode({ reference, words }: ModeProps) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const player = useAudioPlayer(null);
  const [stage, setStage] = useState<RecordStage>('idle');
  const [note, setNote] = useState('');

  // Leaving the mode or the page stops any recording and puts the sound setting back.
  useEffect(
    () => () => {
      // The recorder may already be let go by its hook here, so a failed check is fine to ignore.
      try {
        if (recorder.isRecording) recorder.stop().catch(() => {});
      } catch {}
      setAudioModeAsync(USUAL_AUDIO).catch(() => {});
    },
    [recorder],
  );

  /** Asks for the microphone if needed, then starts recording. */
  const start = async () => {
    player.pause();
    const permission = await requestRecordingPermissionsAsync();
    if (!permission.granted) {
      setNote('The microphone is off for this app. Turn it on in Settings to record.');
      return;
    }
    setNote('Recording…');
    setStage('recording');
    try {
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch {
      setStage('idle');
      setNote('Recording could not start. Try again.');
    }
  };

  /** Stops recording and plays it back. */
  const stop = async () => {
    setStage('done');
    try {
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      if (recorder.uri) {
        player.replace({ uri: recorder.uri });
        player.play();
        setNote('Playing back…');
      } else setNote('');
    } catch {
      setNote('');
    }
  };

  return (
    <>
      <IndexCard reference={reference}>
        {stage === 'recording' ? (
          <View style={styles.recording}>
            <Text style={styles.mic}>🎙️</Text>
            <Text style={styles.recordingRef}>{reference}</Text>
          </View>
        ) : (
          <Text style={cardWords}>{words.join(' ')}</Text>
        )}
      </IndexCard>
      <View style={styles.controls}>
        {stage === 'idle' && <PracticeButton label="🎙️ Record" onPress={start} />}
        {stage === 'recording' && <PracticeButton label="⏹️ Done" look="red" onPress={stop} />}
        {stage === 'done' && <PracticeButton label="🎙️ Record again" look="ghost" onPress={start} />}
      </View>
      {note !== '' && <Text style={styles.note}>{note}</Text>}
    </>
  );
}

const styles = StyleSheet.create({
  recording: { alignItems: 'center', paddingVertical: 30 },
  mic: { fontSize: 34 },
  recordingRef: { fontFamily: fonts.extraBold, fontSize: 15, marginTop: 6, color: indexCard.faint },
  controls: { marginTop: 14, alignItems: 'center' },
  note: { textAlign: 'center', fontFamily: fonts.bold, fontSize: 13, color: verseMemory.soft, marginTop: 12 },
});
