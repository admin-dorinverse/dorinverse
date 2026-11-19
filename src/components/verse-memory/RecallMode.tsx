// The Recall practice mode, copied from the prototype: the verse shows as first letters and blanks, and the person
// reveals it a word ("+1") or a line (7 words) at a time. Two knobs turn the first letters and the blanks on or off.

import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { playSound } from '@/components/common/sounds';
import { bakery, reader, text } from '@/theme/colors';
import { fonts } from '@/theme/text';
import { indexCard, verseMemory } from '@/theme/verseMemoryColors';
import type { ModeProps } from './HideMode';
import { IndexCard, cardWords } from './IndexCard';
import { Knob } from './Knob';
import { firstLetterPart, letterCount } from './practiceWords';

/** How many words "Whole line" reveals. */
const LINE_WORDS = 7;

/** The Recall mode. */
export function RecallMode({ reference, words }: ModeProps) {
  const [revealed, setRevealed] = useState(0);
  const [letters, setLetters] = useState(true);
  const [blanks, setBlanks] = useState(true);

  /** Reveals more words, never past the end. */
  const reveal = (count: number) => {
    playSound('word');
    setRevealed((r) => Math.min(words.length, r + count));
  };

  /** One word as it shows: itself once revealed, else its hint (or nothing when both hints are off). */
  const shown = (w: string, i: number) => {
    if (i < revealed) return <Text key={i}>{w} </Text>;
    const count = letterCount(w);
    if (letters) {
      return (
        <Text key={i} style={styles.blank}>
          {firstLetterPart(w)}
          {blanks && <Text style={styles.tail}>{'_'.repeat(Math.max(1, count - 1))}</Text>}{' '}
        </Text>
      );
    }
    if (blanks) return <Text key={i} style={styles.blank}>{'_'.repeat(Math.max(2, count))} </Text>;
    return null;
  };

  return (
    <>
      <IndexCard reference={reference}>
        {!letters && !blanks && revealed === 0 ? (
          <Text style={styles.faint}>{reference}</Text>
        ) : (
          <Text style={cardWords}>{words.map(shown)}</Text>
        )}
      </IndexCard>
      <Text style={styles.optLabel}>Tap a reveal option:</Text>
      <View style={styles.revealRow}>
        <RevealButton label="One word" onPress={() => reveal(1)}>
          <Text style={styles.plusOne}>+1</Text>
        </RevealButton>
        <RevealButton label="Whole line" onPress={() => reveal(LINE_WORDS)}>
          <View style={styles.lineMark} />
        </RevealButton>
      </View>
      <View style={styles.knobs}>
        <Knob on={letters} label={letters ? 'First letters on' : 'First letters off'} onToggle={() => setLetters(!letters)} />
        <Knob on={blanks} label={blanks ? 'Blanks on' : 'Blanks off'} onToggle={() => setBlanks(!blanks)} />
      </View>
      <Pressable accessibilityRole="button" onPress={() => setRevealed(0)} hitSlop={10} style={styles.reset}>
        <Text style={styles.resetText}>Reset</Text>
      </Pressable>
    </>
  );
}

/** Props for a square reveal button. */
type RevealButtonProps = {
  /** The words under the button. */
  label: string;
  /** Reveals more of the verse. */
  onPress: () => void;
  /** The button's mark. */
  children: ReactNode;
};

/** A square reveal button with its label under it. */
function RevealButton({ label, onPress, children }: RevealButtonProps) {
  return (
    <View style={styles.revealWrap}>
      <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [styles.square, pressed && styles.squarePressed]}>
        {children}
      </Pressable>
      <Text style={styles.revealLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  blank: { color: indexCard.blank, letterSpacing: 1 },
  tail: { color: indexCard.blankTail },
  faint: { fontFamily: fonts.bold, fontSize: 14, lineHeight: 32, color: indexCard.faint },
  optLabel: { textAlign: 'center', fontFamily: fonts.extraBold, fontSize: 12, color: verseMemory.soft, marginTop: 12 },
  revealRow: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 6 },
  revealWrap: { alignItems: 'center', gap: 4 },
  square: {
    width: 46,
    height: 46,
    borderRadius: 12,
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: reader.edge,
    backgroundColor: reader.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  squarePressed: { transform: [{ translateY: 2 }], borderBottomWidth: 2 },
  plusOne: { fontFamily: fonts.extraBold, fontSize: 15, color: text.onDark },
  lineMark: { width: 20, height: 3, borderRadius: 2, backgroundColor: text.onDark },
  revealLabel: { fontFamily: fonts.extraBold, fontSize: 10, color: verseMemory.soft },
  knobs: { flexDirection: 'row', justifyContent: 'center', gap: 34, marginTop: 16 },
  reset: { alignSelf: 'center', marginTop: 10 },
  resetText: { fontFamily: fonts.extraBold, fontSize: 12, color: bakery.gold },
});
