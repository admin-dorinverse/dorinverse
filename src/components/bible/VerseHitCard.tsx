// One verse in the full search results: its reference in gold and its words, with the searched words highlighted.

import { memo } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { playSound } from '@/components/common/sounds';
import type { VerseHit } from '@/data/bibleSearch';
import { reader } from '@/theme/colors';
import { fonts, readingFont } from '@/theme/text';

/** Props for a verse result. */
type VerseHitCardProps = {
  /** The matching verse. */
  hit: VerseHit;
  /** The searched words, to highlight. */
  query: string;
  /** Opens the verse in the reader. */
  onPress: (hit: VerseHit) => void;
};

/** Makes typed words safe to look for exactly, so signs like "?" or "(" are matched as themselves. */
function escapeForPattern(words: string): string {
  return words.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** A verse result card. */
export const VerseHitCard = memo(function VerseHitCard({ hit, query, onPress }: VerseHitCardProps) {
  const q = query.trim();
  const parts = q ? hit.text.split(new RegExp(`(${escapeForPattern(q)})`, 'gi')) : [hit.text];
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        playSound('tap');
        onPress(hit);
      }}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <Text style={styles.ref}>{hit.label}</Text>
      <Text style={styles.text}>
        {parts.map((part, i) =>
          i % 2 === 1 ? (
            <Text key={i} style={styles.mark}>
              {part}
            </Text>
          ) : (
            part
          ),
        )}
      </Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: { borderRadius: 20, padding: 14, marginBottom: 10, backgroundColor: reader.surface, borderWidth: 1, borderColor: reader.edge, borderTopColor: 'rgba(255,255,255,0.26)' },
  pressed: { opacity: 0.7 },
  ref: { fontFamily: fonts.black, fontSize: 14, color: reader.verseNumber, marginBottom: 4 },
  text: { fontFamily: readingFont, fontSize: 15.5, lineHeight: 23, color: reader.text },
  mark: { backgroundColor: reader.highlight },
});
