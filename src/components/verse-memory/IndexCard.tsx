// The cream index card a verse is practiced on, as in the prototype: the reference and translation over a red
// line, then the verse's words on ruled lines. Each practice mode fills the card with its own version of the words.

import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { READER_TRANSLATION } from '@/data/queries/bible';
import { fonts, readingFont } from '@/theme/text';
import { indexCard } from '@/theme/verseMemoryColors';

/** Props for the index card. */
type IndexCardProps = {
  /** The verse reference, like "John 3:16". */
  reference: string;
  /** What is written on the card. */
  children: ReactNode;
};

/** The index card. */
export function IndexCard({ reference, children }: IndexCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Text style={styles.reference}>{reference}</Text>
        <Text style={styles.translation}>{READER_TRANSLATION}</Text>
      </View>
      <View style={styles.lines}>{children}</View>
    </View>
  );
}

/** The text style of the card's words, for modes that write on it. */
export const cardWords = {
  fontFamily: readingFont,
  fontSize: 17,
  lineHeight: 32,
  color: indexCard.ink,
} as const;

const styles = StyleSheet.create({
  card: {
    backgroundColor: indexCard.paper,
    borderWidth: 1,
    borderColor: indexCard.edge,
    borderRadius: 6,
    overflow: 'hidden',
    boxShadow: `0 1px 0 ${indexCard.edge}, 0 5px 12px rgba(90,60,20,0.14)`,
  },
  head: { flexDirection: 'row', alignItems: 'baseline', gap: 8, paddingTop: 12, paddingHorizontal: 16, paddingBottom: 7, borderBottomWidth: 2, borderBottomColor: indexCard.headLine },
  reference: { flexShrink: 1, fontFamily: readingFont, fontWeight: '700', fontSize: 16, color: indexCard.reference },
  translation: { marginLeft: 'auto', fontFamily: fonts.extraBold, fontSize: 10.5, color: indexCard.translation },
  lines: { minHeight: 120, paddingTop: 8, paddingHorizontal: 16, paddingBottom: 14 },
});
