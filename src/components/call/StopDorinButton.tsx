// "Stop", shown while Papa Dorin answers, only to the person he's answering and to the host (the owner's rule):
// it stops him mid-answer, so asking opens again for everyone.

import { Pressable, StyleSheet, Text } from 'react-native';
import { playSound } from '@/components/common/sounds';
import { call } from '@/theme/callColors';
import { text } from '@/theme/colors';
import { fonts } from '@/theme/text';
import type { PapaDorin } from './usePapaDorin';

/** Props for the stop button. */
type StopDorinButtonProps = {
  /** Papa Dorin: whether this person may stop him, and the stop itself. */
  dorin: PapaDorin;
};

/** The red "Stop" pill; draws nothing for people who may not stop him. */
export function StopDorinButton({ dorin }: StopDorinButtonProps) {
  if (!dorin.canStop) return null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Stop Papa Dorin"
      onPress={() => {
        playSound('tap');
        dorin.stopAnswer();
      }}
      style={({ pressed }) => [styles.stop, pressed && styles.pressed]}
    >
      <Text style={styles.text}>Stop</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  stop: { height: 36, borderRadius: 18, paddingHorizontal: 16, backgroundColor: call.leave, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.8 },
  text: { fontFamily: fonts.black, fontSize: 14, color: text.onDark },
});
