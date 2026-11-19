// The button at the top right of a verse being practiced: "＋ Mark memorized", or "✓ Memorized" once it is. Tapping
// "✓ Memorized" asks first, in a sheet, before taking the verse off the list.

import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { GlassSheet } from '@/components/common/GlassSheet';
import { playSound } from '@/components/common/sounds';
import { markMemorized, unmarkMemorized, useMemorizedVerses } from '@/data/storage/memorizedVerses';
import { reader, text } from '@/theme/colors';
import { fonts } from '@/theme/text';
import { verseMemory } from '@/theme/verseMemoryColors';
import type { VerseRef } from '@/types/bible';
import { PracticeButton } from './PracticeButton';

/** Props for the memorized button. */
type MemorizedButtonProps = {
  /** The verse. */
  verseRef: VerseRef;
  /** The verse's reference as people read it, like "John 3:16". */
  label: string;
};

/** The memorized button and its "Remove?" sheet. */
export function MemorizedButton({ verseRef, label }: MemorizedButtonProps) {
  const memorized = useMemorizedVerses().includes(verseRef);
  const [asking, setAsking] = useState(false);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          playSound(memorized ? 'tap' : 'collect');
          if (memorized) setAsking(true);
          else markMemorized(verseRef);
        }}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      >
        <Text style={[styles.label, memorized && styles.known]}>{memorized ? '✓ Memorized' : '＋ Mark memorized'}</Text>
      </Pressable>
      <GlassSheet open={asking} onClose={() => setAsking(false)} title="Remove from Memorized?">
        <Text style={styles.note}>{label} will leave your Memorized list. You can always mark it again.</Text>
        <View style={styles.choices}>
          <PracticeButton
            label="Remove"
            look="red"
            onPress={() => {
              unmarkMemorized(verseRef);
              setAsking(false);
            }}
          />
          <PracticeButton label="Keep it" look="ghost" onPress={() => setAsking(false)} />
        </View>
      </GlassSheet>
    </>
  );
}

const styles = StyleSheet.create({
  button: { borderRadius: 10, borderWidth: 1, borderBottomWidth: 3, borderColor: reader.edge, backgroundColor: reader.surface, paddingVertical: 6, paddingHorizontal: 10 },
  pressed: { transform: [{ translateY: 2 }], borderBottomWidth: 1 },
  label: { fontFamily: fonts.extraBold, fontSize: 11.5, color: text.onDark },
  known: { color: verseMemory.memorizedText },
  choices: { gap: 8 },
  note: { fontFamily: fonts.body, fontSize: 15, lineHeight: 21, color: text.onDarkSoft, marginBottom: 14 },
});
