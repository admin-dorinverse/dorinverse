// The Bank practice mode, copied from the prototype: the person builds the verse word by word, picking each next
// word from five choices. A wrong pick flashes red; the last word finishes the verse.

import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { playSound } from '@/components/common/sounds';
import { reader, text } from '@/theme/colors';
import { fonts, readingFont } from '@/theme/text';
import { indexCard, verseMemory } from '@/theme/verseMemoryColors';
import type { ModeProps } from './HideMode';
import { IndexCard, cardWords } from './IndexCard';
import { PracticeButton } from './PracticeButton';
import { bankChoices } from './practiceWords';

/** How long a wrong pick stays red (ms). */
const WRONG_MS = 350;

/** The Bank mode. */
export function BankMode({ reference, words }: ModeProps) {
  const [built, setBuilt] = useState(0);
  const [wrong, setWrong] = useState<string | null>(null);
  const done = built >= words.length;
  // The choices are picked once for each word, so they stay put while the person thinks.
  const choices = useMemo(() => (built < words.length ? bankChoices(words, built) : []), [words, built]);

  /** Checks a picked word against the next word of the verse. */
  const pick = (word: string) => {
    if (word === words[built]) {
      playSound(built + 1 >= words.length ? 'collect' : 'word');
      setBuilt(built + 1);
      return;
    }
    playSound('wrong');
    setWrong(word);
    setTimeout(() => setWrong((w) => (w === word ? null : w)), WRONG_MS);
  };

  return (
    <>
      <IndexCard reference={reference}>
        <Text style={[cardWords, styles.built]}>{built ? words.slice(0, built).join(' ') : ' '}</Text>
      </IndexCard>
      {done ? (
        <View style={styles.after}>
          <PracticeButton label="Build it again" look="ghost" onPress={() => setBuilt(0)} />
          <Text style={styles.complete}>Verse complete — hidden in your heart. 🎉</Text>
        </View>
      ) : (
        <>
          <View style={styles.bank}>
            {choices.map((w, i) => (
              <Pressable
                key={`${built}-${i}`}
                accessibilityRole="button"
                onPress={() => pick(w)}
                style={({ pressed }) => [styles.word, wrong === w && styles.wrong, pressed && styles.wordPressed]}
              >
                <Text style={styles.wordText}>{w}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.note}>
            Word {built + 1} of {words.length}
          </Text>
        </>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  built: { color: indexCard.done },
  bank: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 18 },
  word: { borderRadius: 12, borderWidth: 2, borderBottomWidth: 4, borderColor: reader.edge, backgroundColor: reader.surface, paddingVertical: 11, paddingHorizontal: 14 },
  wordPressed: { transform: [{ translateY: 2 }], borderBottomWidth: 2 },
  wrong: { borderColor: verseMemory.wrongEdge, backgroundColor: verseMemory.wrongFill },
  wordText: { fontFamily: readingFont, fontWeight: '700', fontSize: 14, color: text.onDark },
  note: { textAlign: 'center', fontFamily: fonts.bold, fontSize: 13, color: verseMemory.soft, marginTop: 12 },
  after: { marginTop: 14, gap: 12 },
  complete: { textAlign: 'center', fontFamily: fonts.black, fontSize: 14, color: verseMemory.memorizedText },
});
