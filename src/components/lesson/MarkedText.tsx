// A card's words with its explained words and sayings marked, as in the design: purple with a dotted underline
// until tapped, a solid underline after. Tapping one opens its meaning.

import { useMemo } from 'react';
import { StyleSheet, Text, type TextStyle } from 'react-native';
import { markText } from '@/data/queries/lessons';
import { cream } from '@/theme/lessonColors';
import { fonts } from '@/theme/text';
import type { CardIdiom, CardWord } from '@/types/lesson';

/** What was tapped: a word or a saying, by its place in the card's list. */
export type MarkTap = { kind: 'word'; index: number } | { kind: 'idiom'; index: number };

/** Props for marked words. */
type MarkedTextProps = {
  /** The words to show. */
  text: string;
  /** The card's explained words. */
  words: readonly CardWord[];
  /** The card's explained sayings. */
  idioms: readonly CardIdiom[];
  /** Words and sayings already opened, as "word:2" or "idiom:0", shown with a solid underline. */
  seen: ReadonlySet<string>;
  /** Opens a word's or saying's meaning. */
  onTap: (tap: MarkTap) => void;
  /** The text style. */
  style: TextStyle;
};

/** The words with taps on the explained ones. */
export function MarkedText({ text, words, idioms, seen, onTap, style }: MarkedTextProps) {
  const pieces = useMemo(() => markText(text, words, idioms), [text, words, idioms]);
  return (
    <Text style={style}>
      {pieces.map((p, i) => {
        const tap: MarkTap | null = p.word !== undefined ? { kind: 'word', index: p.word } : p.idiom !== undefined ? { kind: 'idiom', index: p.idiom } : null;
        if (!tap) return p.text;
        const opened = seen.has(`${tap.kind}:${tap.index}`);
        return (
          <Text key={i} accessibilityRole="button" accessibilityHint="Shows what it means" onPress={() => onTap(tap)} style={[styles.mark, opened && styles.opened]}>
            {p.text}
          </Text>
        );
      })}
    </Text>
  );
}

const styles = StyleSheet.create({
  mark: {
    fontFamily: fonts.extraBold,
    color: cream.word,
    textDecorationLine: 'underline',
    textDecorationStyle: 'dotted',
    textDecorationColor: cream.wordLine,
  },
  opened: { textDecorationStyle: 'solid' },
});
