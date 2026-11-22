// The host's "Quiet, please" button under the host's tools: one tap turns off everyone else's microphone at once
// (each person can turn theirs back on). A short note says how it went, then goes away.

import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { playSound } from '@/components/common/sounds';
import { call } from '@/theme/callColors';
import { text } from '@/theme/colors';
import { fonts } from '@/theme/text';
import { MicIcon } from './CallIcons';

/** How long the note under the button stays. */
const NOTE_MS = 4000;

/** Props for the Quiet button. */
type QuietButtonProps = {
  /** Turns off everyone else's microphone; gives back how many were turned off. */
  onQuiet: () => Promise<number>;
};

/** "Quiet, please": mutes everyone but the host. */
export function QuietButton({ onQuiet }: QuietButtonProps) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');

  // The note goes away after a moment.
  useEffect(() => {
    if (!note) return;
    const gone = setTimeout(() => setNote(''), NOTE_MS);
    return () => clearTimeout(gone);
  }, [note]);

  /** Asks the server to mute everyone else, and says how it went. */
  const quiet = () => {
    if (busy) return;
    playSound('tap');
    setBusy(true);
    setNote('');
    onQuiet()
      .then((n) => setNote(n === 0 ? 'Everyone else is already quiet.' : 'Everyone else is muted. They can unmute themselves.'))
      .catch((e: unknown) => setNote(e instanceof Error ? e.message : 'That didn’t work. Try again.'))
      .finally(() => setBusy(false));
  };

  return (
    <View style={styles.wrap}>
      <Pressable accessibilityRole="button" accessibilityLabel="Quiet, please: mute everyone else" onPress={quiet} style={styles.button}>
        {busy ? <ActivityIndicator color={text.onDark} /> : <MicIcon color={text.onDark} size={20} off />}
        <View>
          <Text style={styles.label}>Quiet, please</Text>
          <Text style={styles.line}>Mutes everyone else. They can unmute.</Text>
        </View>
      </Pressable>
      {note !== '' && <Text style={styles.note}>{note}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  button: { height: 56, borderRadius: 18, borderWidth: 1, borderColor: call.glassEdge, backgroundColor: call.glassFillSoft, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16 },
  label: { fontFamily: fonts.extraBold, fontSize: 14.5, color: text.onDark },
  line: { fontFamily: fonts.bold, fontSize: 12, color: text.onDarkSoft },
  note: { fontFamily: fonts.bold, fontSize: 13, color: text.goldNote, textAlign: 'center' },
});
