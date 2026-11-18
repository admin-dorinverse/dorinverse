// The Ten Commandments pack on the Instructions page: all ten, numbered, each in its exact Bible words with its
// reference. Shown only when the person has collected the pack.

import { StyleSheet, Text, View } from 'react-native';
import { instructions, reader, text } from '@/theme/colors';
import { fonts, readingFont } from '@/theme/text';
import type { CommandmentsCookie } from '@/types/cookie';

/** Props for the pack. */
type CommandmentsPackProps = {
  /** The collected pack. */
  pack: CommandmentsCookie;
};

/** The Ten Commandments card. */
export function CommandmentsPack({ pack }: CommandmentsPackProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.kicker}>THE TEN COMMANDMENTS · EXODUS 20</Text>
      {pack.lines.map((line) => (
        <View key={line.position} style={styles.line}>
          <Text style={styles.number}>{line.position}</Text>
          <View style={styles.body}>
            <Text style={styles.words}>{line.text}</Text>
            <Text style={styles.ref}>{line.reference}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 20, padding: 16, gap: 12, backgroundColor: instructions.chipOn, borderWidth: 1, borderColor: instructions.accent },
  kicker: { fontFamily: fonts.black, fontSize: 12.5, letterSpacing: 0.8, color: instructions.accent },
  line: { flexDirection: 'row', gap: 12 },
  number: { width: 24, fontFamily: fonts.black, fontSize: 20, lineHeight: 24, color: instructions.accent, textAlign: 'right' },
  body: { flex: 1, gap: 2 },
  words: { fontFamily: readingFont, fontSize: 16.5, lineHeight: 23, color: reader.text },
  ref: { fontFamily: fonts.extraBold, fontSize: 12.5, color: text.onDarkSoft },
});
