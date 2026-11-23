// The Approve and Reject buttons under a friend request on the Notifications page. Each plays the tap sound, the
// tapped one shows a spinner while the server answers, and both can't be tapped until it does.

import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { playSound } from '@/components/common/sounds';
import { notifications } from '@/theme/notificationColors';
import { fonts } from '@/theme/text';

/** Which answer is on its way to the server, or null when none is. */
export type AnswerInFlight = 'approve' | 'reject' | null;

/** Props for one answer button. */
type AnswerButtonProps = {
  /** The button's words. */
  label: string;
  /** Gold for Approve, quiet glass for Reject. */
  look: 'approve' | 'reject';
  /** True while this button's answer is on its way: shows a spinner. */
  busy: boolean;
  /** True while either answer is on its way, so neither can be tapped. */
  disabled: boolean;
  /** Runs when tapped, after the tap sound. */
  onPress: () => void;
};

/** One small answer button. */
function AnswerButton({ label, look, busy, disabled, onPress }: AnswerButtonProps) {
  const ink = look === 'approve' ? notifications.approveInk : notifications.rejectInk;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled, busy }}
      disabled={disabled}
      onPress={() => {
        playSound('tap');
        onPress();
      }}
      style={({ pressed }) => [styles.button, styles[look], disabled && !busy && styles.off, pressed && styles.pressed]}
    >
      {busy ? <ActivityIndicator color={ink} /> : <Text style={[styles.label, { color: ink }]}>{label}</Text>}
    </Pressable>
  );
}

/** Props for the pair of answer buttons. */
type RequestButtonsProps = {
  /** Which answer is on its way, or null. */
  inFlight: AnswerInFlight;
  /** Sends the answer: true to approve, false to reject. */
  onAnswer: (approve: boolean) => void;
};

/** Approve and Reject, side by side. */
export function RequestButtons({ inFlight, onAnswer }: RequestButtonsProps) {
  const waiting = inFlight !== null;
  return (
    <View style={styles.row}>
      <AnswerButton label="Approve" look="approve" busy={inFlight === 'approve'} disabled={waiting} onPress={() => onAnswer(true)} />
      <AnswerButton label="Reject" look="reject" busy={inFlight === 'reject'} disabled={waiting} onPress={() => onAnswer(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10 },
  button: { flex: 1, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  approve: { backgroundColor: notifications.approve, boxShadow: `0 3px 0 ${notifications.approveShadow}` },
  reject: { borderWidth: 1, borderColor: notifications.rejectEdge, backgroundColor: notifications.rejectFill },
  label: { fontFamily: fonts.black, fontSize: 15 },
  off: { opacity: 0.5 },
  pressed: { transform: [{ scale: 0.96 }] },
});
