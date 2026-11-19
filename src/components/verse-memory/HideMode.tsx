// The Read and Hide practice modes. Read shows the whole verse. Hide covers a few random words at a time with
// "Hide more"; holding "Hold to reveal" shows them until the finger lifts. Once every word is hidden, the next tap
// starts again with a new order.

import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { playSound } from '@/components/common/sounds';
import { indexCard } from '@/theme/verseMemoryColors';
import { IndexCard, cardWords } from './IndexCard';
import { PracticeButton } from './PracticeButton';
import { hideStep, shuffled } from './practiceWords';

/** Props for a practice mode. */
export type ModeProps = {
  /** The verse reference, like "John 3:16". */
  reference: string;
  /** The verse's words. */
  words: readonly string[];
};

/** The Read mode: the verse, plain. */
export function ReadMode({ reference, words }: ModeProps) {
  return (
    <IndexCard reference={reference}>
      <Text style={cardWords}>{words.join(' ')}</Text>
    </IndexCard>
  );
}

/** The Hide mode. */
export function HideMode({ reference, words }: ModeProps) {
  // The order words get hidden in, and how many are hidden. It starts with the first few already hidden.
  const [state, setState] = useState(() => ({ order: shuffled(words.map((_, i) => i)), hidden: hideStep(0, words.length) }));
  const [peek, setPeek] = useState(false);
  const covered = new Set(state.order.slice(0, state.hidden));

  /** Hides a few more words, or starts again once all are hidden. */
  const hideMore = () => {
    setState((s) => (s.hidden >= words.length ? { order: shuffled(s.order), hidden: 0 } : { order: s.order, hidden: hideStep(s.hidden, words.length) }));
  };

  return (
    <>
      <IndexCard reference={reference}>
        <Text style={cardWords}>
          {words.map((w, i) => (
            <Text key={i}>
              <Text style={covered.has(i) ? (peek ? styles.peek : styles.hidden) : null}>{w}</Text>
              {i < words.length - 1 ? ' ' : ''}
            </Text>
          ))}
        </Text>
      </IndexCard>
      <View style={styles.controls}>
        <PracticeButton label="Hide more" onPress={hideMore} />
        <PracticeButton
          label="👁 Hold to reveal"
          look="ghost"
          held={peek}
          onPressIn={() => {
            playSound('tap');
            setPeek(true);
          }}
          onPressOut={() => setPeek(false)}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  hidden: { backgroundColor: indexCard.hidden, color: indexCard.hidden },
  peek: { backgroundColor: indexCard.peekFill, color: indexCard.peekText },
  controls: { gap: 8, marginTop: 14 },
});
