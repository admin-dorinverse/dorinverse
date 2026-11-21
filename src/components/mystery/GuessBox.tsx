// The bottom of the Clue Book: three dots for today's tries, a box to type a guess and a gold Guess button. A wrong
// guess shakes the box. When the tries run out the box goes away until tomorrow, and once the word is guessed it
// shows the word in green instead.

import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { playSound } from '@/components/common/sounds';
import { TRIES_A_DAY } from '@/data/mysterySource';
import { text } from '@/theme/colors';
import { mystery } from '@/theme/mysteryColors';
import { fonts } from '@/theme/text';
import type { GuessResult } from '@/types/mystery';

/** The longest a guess may be. */
const MAX_CHARS = 40;

/** Props for the guess box. */
type GuessBoxProps = {
  /** Guesses left today. */
  triesLeft: number;
  /** The word, once the person has guessed it; null until then. */
  solvedWord: string | null;
  /** One line under a guessed word, like the day it was solved. */
  solvedNote: string;
  /** Checks a guess and says how it went. */
  onGuess: (guess: string) => GuessResult;
};

/** The tries, the text box and the Guess button. */
export function GuessBox({ triesLeft, solvedWord, solvedNote, onGuess }: GuessBoxProps) {
  const insets = useSafeAreaInsets();
  const [guess, setGuess] = useState('');
  const [note, setNote] = useState('');
  const shift = useSharedValue(0);
  const shake = useAnimatedStyle(() => ({ transform: [{ translateX: shift.get() }] }));
  const ready = guess.trim().length > 0 && triesLeft > 0;

  /** Sends the guess; a wrong one shakes the box and says how many tries are left. */
  const press = () => {
    if (!ready) return;
    const result = onGuess(guess.trim());
    if (result.outcome === 'right') return playSound('right');
    if (result.outcome === 'closed') return;
    playSound('wrong');
    setGuess('');
    setNote(result.triesLeft > 0 ? `Not it. ${result.triesLeft} ${result.triesLeft === 1 ? 'try' : 'tries'} left today` : '');
    shift.set(withSequence(withTiming(-9, { duration: 60 }), withTiming(9, { duration: 90 }), withTiming(-6, { duration: 80 }), withTiming(0, { duration: 70 })));
  };

  if (solvedWord !== null) {
    return (
      <View style={[styles.form, { paddingBottom: insets.bottom + 12 }]}>
        <View style={styles.solved}>
          <Text style={styles.solvedKicker}>YOU GOT IT</Text>
          <Text style={styles.solvedWord}>{solvedWord.toUpperCase()}</Text>
          <Text style={styles.solvedNote}>{solvedNote}</Text>
        </View>
      </View>
    );
  }
  return (
    <View style={[styles.form, { paddingBottom: insets.bottom + 12 }]}>
      <View style={styles.triesRow} accessibilityLabel={`${triesLeft} of ${TRIES_A_DAY} tries left today`}>
        {Array.from({ length: TRIES_A_DAY }, (_, i) => (
          <View key={i} style={[styles.try, i < triesLeft && styles.tryOn]} />
        ))}
        <Text style={styles.tries}>
          {triesLeft === 0 ? 'No tries left today' : note || `${triesLeft} ${triesLeft === 1 ? 'try' : 'tries'} left today`}
        </Text>
      </View>
      {triesLeft > 0 && (
        <Animated.View style={[styles.row, shake]}>
          <TextInput
            value={guess}
            onChangeText={setGuess}
            onSubmitEditing={press}
            placeholder="Guess the word…"
            placeholderTextColor={mystery.inputHint}
            maxLength={MAX_CHARS}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
            accessibilityLabel="Your guess"
            style={styles.input}
          />
          <Pressable accessibilityRole="button" accessibilityLabel="Guess" disabled={!ready} onPress={press} style={({ pressed }) => [styles.button, !ready && styles.off, pressed && styles.pressed]}>
            <Text style={styles.buttonText}>Guess</Text>
          </Pressable>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: 10, paddingTop: 10, paddingHorizontal: 14, width: '100%', maxWidth: 620, alignSelf: 'center' },
  triesRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  try: { width: 12, height: 12, borderRadius: 6, borderWidth: 1.5, borderColor: mystery.missedEdge },
  tryOn: { backgroundColor: mystery.accent, borderColor: mystery.accent },
  tries: { flex: 1, marginLeft: 4, fontFamily: fonts.extraBold, fontSize: 13, lineHeight: 17, color: mystery.soft },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: { flex: 1, minWidth: 0, height: 48, borderWidth: 1.5, borderColor: mystery.inputEdge, borderRadius: 24, backgroundColor: mystery.inputFill, paddingHorizontal: 16, fontFamily: fonts.bold, fontSize: 16, color: text.onDark },
  button: { height: 48, borderRadius: 24, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: mystery.gold, boxShadow: '0 3px 0 rgba(0,0,0,0.35)' },
  buttonText: { fontFamily: fonts.black, fontSize: 15, color: mystery.buttonInk },
  off: { opacity: 0.4 },
  pressed: { transform: [{ scale: 0.96 }] },
  solved: { alignItems: 'center', gap: 2, borderRadius: 20, borderWidth: 1.5, borderColor: mystery.rightEdge, backgroundColor: mystery.rightFill, paddingVertical: 12, paddingHorizontal: 16 },
  solvedKicker: { fontFamily: fonts.black, fontSize: 12, letterSpacing: 1.2, color: mystery.rightInk },
  solvedWord: { fontFamily: fonts.black, fontSize: 28, letterSpacing: 3, color: text.onDark },
  solvedNote: { fontFamily: fonts.body, fontSize: 13.5, lineHeight: 18, textAlign: 'center', color: mystery.soft },
});
