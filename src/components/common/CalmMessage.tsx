// A calm message on a glass card, for when a page can't show what was asked: a code that isn't working, no
// internet, or a universe that is only for friends. It has a short title, a line or two of words and one button.

import { StyleSheet, Text } from 'react-native';
import { AuthButton } from './AuthButton';
import { GlassSurface } from './Glass';
import { text } from '@/theme/colors';
import { radius } from '@/theme/spacing';
import { fonts, textStyles } from '@/theme/text';

/** Props for a calm message. */
type CalmMessageProps = {
  /** The short title, like "This code isn't working". */
  title: string;
  /** A line or two saying what happened and what to do. */
  words: string;
  /** The button's words, like "Try again" or "Back". */
  buttonLabel: string;
  /** Runs when the button is tapped. */
  onPress: () => void;
  /** True while the button's work runs: it shows a spinner. */
  busy?: boolean;
};

/** A glass card with a title, a few words and one quiet button. */
export function CalmMessage({ title, words, buttonLabel, onPress, busy = false }: CalmMessageProps) {
  return (
    <GlassSurface style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <Text style={[textStyles.body, styles.words]}>{words}</Text>
      <AuthButton look="quiet" label={buttonLabel} busy={busy} onPress={onPress} />
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.card, padding: 20, gap: 12 },
  title: { fontFamily: fonts.black, fontSize: 20, color: text.onDark, textAlign: 'center' },
  words: { color: text.onDarkSoft, textAlign: 'center' },
});
