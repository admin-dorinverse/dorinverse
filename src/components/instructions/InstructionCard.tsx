// One collected command on the Instructions page: its exact Bible words, who said or wrote it, its reference, and
// the reason the verse gives, when it gives one.

import { StyleSheet, Text, View } from 'react-native';
import { instructions, reader, text } from '@/theme/colors';
import { fonts, readingFont } from '@/theme/text';
import type { InstructionCookie } from '@/types/cookie';

/** Props for one command. */
type InstructionCardProps = {
  /** The command to show. */
  cookie: InstructionCookie;
};

/** A command's card. */
export function InstructionCard({ cookie }: InstructionCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.words}>{cookie.words}</Text>
      <Text style={styles.meta}>
        <Text style={styles.who}>{cookie.who}</Text> · {cookie.reference}
      </Text>
      {cookie.reason && (
        <Text style={styles.reason}>
          <Text style={styles.why}>Why: </Text>
          {cookie.reason}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 20, padding: 16, gap: 6, marginBottom: 12, backgroundColor: reader.surface, borderWidth: 1, borderColor: reader.edge },
  words: { fontFamily: readingFont, fontSize: 18, lineHeight: 26, color: reader.text },
  meta: { fontFamily: fonts.extraBold, fontSize: 13, color: instructions.soft },
  who: { color: instructions.accent },
  reason: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: text.onDarkSoft },
  why: { fontFamily: fonts.black, color: instructions.accent },
});
