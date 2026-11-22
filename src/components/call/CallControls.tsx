// The call's bottom bar, as in the call mockups: round Mute and Speaker buttons on the left and the red Leave button
// on the far right, away from the mic so nobody leaves by mistake. Browsers have no earpiece, so they get no Speaker.
// Lesson screens use the small version in their top row instead (mockups B, C and D): just Mute and a round Leave.

import { AudioSession, CAN_PICK_SPEAKER, useLocalParticipant, useRoomContext } from './livekit';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { playSound } from '@/components/common/sounds';
import { call } from '@/theme/callColors';
import { text } from '@/theme/colors';
import { explainColors } from '@/theme/lessonColors';
import { fonts } from '@/theme/text';
import { LeaveIcon, MicIcon, SpeakerIcon } from './CallIcons';

/** Props for the call's buttons. */
type CallControlsProps = {
  /** True for the small top-row version on lesson screens: Mute and a round Leave only. */
  compact?: boolean;
  /** True on the cream Explain the Answer page, where Mute takes the page's cream colors. */
  cream?: boolean;
};

/** The Mute, Speaker and Leave buttons. */
export function CallControls({ compact = false, cream = false }: CallControlsProps) {
  const lk = useRoomContext();
  const { localParticipant, isMicrophoneEnabled } = useLocalParticipant();
  // The call starts on the loudspeaker; turning it off moves the sound to the earpiece.
  const [speaker, setSpeaker] = useState(true);

  /** Turns this person's microphone off or back on. */
  const toggleMute = () => {
    playSound('tap');
    // A call that has just closed can refuse this; nothing to do then.
    localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled).catch(() => {});
  };

  /** Moves the sound between the loudspeaker and the earpiece. */
  const toggleSpeaker = () => {
    playSound('tap');
    const next = !speaker;
    setSpeaker(next);
    void AudioSession.selectAudioOutput(next ? 'speaker' : 'earpiece');
  };

  /** Leaves the call. */
  const leave = () => {
    playSound('tap');
    void lk.disconnect();
  };

  if (compact) {
    return (
      <View style={styles.small}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isMicrophoneEnabled ? 'Mute' : 'Unmute'}
          onPress={toggleMute}
          style={[styles.smallRound, cream && styles.smallCream, !isMicrophoneEnabled && styles.on]}
        >
          <MicIcon color={!isMicrophoneEnabled ? call.ink : cream ? explainColors.ink : text.onDark} off={!isMicrophoneEnabled} size={20} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Leave" onPress={leave} style={[styles.smallRound, styles.smallLeave]}>
          <LeaveIcon color={text.onDark} size={18} />
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.bar}>
      <Pressable accessibilityRole="button" accessibilityLabel={isMicrophoneEnabled ? 'Mute' : 'Unmute'} onPress={toggleMute} style={[styles.round, !isMicrophoneEnabled && styles.on]}>
        <MicIcon color={isMicrophoneEnabled ? text.onDark : call.ink} off={!isMicrophoneEnabled} />
      </Pressable>
      {CAN_PICK_SPEAKER && (
        <Pressable accessibilityRole="button" accessibilityLabel={speaker ? 'Speaker on' : 'Speaker off'} onPress={toggleSpeaker} style={styles.round}>
          <SpeakerIcon color={text.onDark} off={!speaker} />
        </Pressable>
      )}
      <View style={styles.space} />
      <Pressable accessibilityRole="button" onPress={leave} style={styles.leave}>
        <LeaveIcon color={text.onDark} />
        <Text style={styles.leaveText}>Leave</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  round: { width: 56, height: 56, borderRadius: 28, borderWidth: 1, borderColor: call.glassEdge, backgroundColor: call.glassFill, alignItems: 'center', justifyContent: 'center' },
  on: { backgroundColor: text.onDark },
  space: { flex: 1 },
  leave: { height: 56, borderRadius: 28, backgroundColor: call.leave, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 22 },
  leaveText: { fontFamily: fonts.black, fontSize: 16, color: text.onDark },
  small: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  smallRound: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, borderColor: call.glassEdge, backgroundColor: call.glassFill, alignItems: 'center', justifyContent: 'center' },
  smallCream: { borderColor: explainColors.edge, backgroundColor: explainColors.card },
  smallLeave: { borderWidth: 0, backgroundColor: call.leave },
});
