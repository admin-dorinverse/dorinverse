// One verse in the Verse Memory lists: its reference, a "Memorized" label when the person knows it by heart, and
// the start of its words. Tapping it opens the verse to practice.

import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { playSound } from '@/components/common/sounds';
import type { VerseHit } from '@/data/bibleSearch';
import { reader, text } from '@/theme/colors';
import { fonts, readingFont } from '@/theme/text';
import { verseMemory } from '@/theme/verseMemoryColors';

/** Props for a verse card. */
type VerseCardProps = {
  /** The verse. */
  verse: VerseHit;
  /** True when the person has marked it memorized. */
  memorized: boolean;
  /** Opens the verse. */
  onOpen: (verse: VerseHit) => void;
};

/** A verse card, half a row wide. */
export const VerseCard = memo(function VerseCard({ verse, memorized, onOpen }: VerseCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${verse.label}${memorized ? ', memorized' : ''}`}
      onPress={() => {
        playSound('tap');
        onOpen(verse);
      }}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.head}>
        <Text style={styles.ref} numberOfLines={1}>
          {verse.label}
        </Text>
      </View>
      {memorized && (
        <View style={styles.label}>
          <Text style={styles.labelText}>MEMORIZED</Text>
        </View>
      )}
      <Text style={styles.words} numberOfLines={5}>
        {verse.text}
      </Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 150,
    gap: 6,
    borderRadius: 22,
    padding: 14,
    paddingBottom: 16,
    backgroundColor: reader.surface,
    borderWidth: 1,
    borderColor: reader.edge,
  },
  pressed: { transform: [{ scale: 0.97 }] },
  head: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ref: { flexShrink: 1, fontFamily: readingFont, fontWeight: '700', fontSize: 15, color: text.onDark },
  label: { alignSelf: 'flex-start', borderRadius: 8, paddingVertical: 3, paddingHorizontal: 7, backgroundColor: verseMemory.memorizedFill },
  labelText: { fontFamily: fonts.extraBold, fontSize: 10.5, letterSpacing: 0.4, color: verseMemory.memorizedText },
  words: { fontFamily: readingFont, fontSize: 13.5, lineHeight: 19.5, color: verseMemory.soft },
});
