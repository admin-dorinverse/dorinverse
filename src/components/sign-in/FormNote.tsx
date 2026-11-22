// A short line on a sign-in card saying what went wrong, or good news like "Check your email". Screen readers
// read it out as soon as it shows.

import { StyleSheet, Text } from 'react-native';
import { account } from '@/theme/accountColors';
import { fonts } from '@/theme/text';

/** Props for the note. */
type FormNoteProps = {
  /** The line; nothing shows while it's empty. */
  note: string;
  /** Good news instead of a problem. */
  good?: boolean;
};

/** The card's note line. */
export function FormNote({ note, good = false }: FormNoteProps) {
  if (!note) return null;
  return (
    <Text style={[styles.note, good && styles.good]} accessibilityLiveRegion="polite" accessibilityRole="alert">
      {note}
    </Text>
  );
}

const styles = StyleSheet.create({
  note: { fontFamily: fonts.bold, fontSize: 13.5, lineHeight: 19, color: account.problem, textAlign: 'center' },
  good: { color: account.good },
});
