// The Clue Book, opened by tapping the red book in the sky: the Weekly Word. Today's clue stays hidden behind a
// "Collect clue" button until the person taps it, so a clue is only ever collected on purpose. It shows the week's seven days, every clue collected
// so far (missed days stay empty), and a box to guess the word with 3 tries a day. From Sunday evening it shows the
// word and all seven clues with their references, the missed ones in red. Last week's results sit at the bottom. Everything comes from src/data/mysterySource.ts.

import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { DrillHeader } from '@/components/common/DrillHeader';
import { playSound } from '@/components/common/sounds';
import { useAmbientClock } from '@/components/common/useAmbientClock';
import { ClueCard, DAY_NAMES } from '@/components/mystery/ClueCard';
import { DayStrip } from '@/components/mystery/DayStrip';
import { GuessBox } from '@/components/mystery/GuessBox';
import { LastWeek } from '@/components/mystery/LastWeek';
import { WordReveal } from '@/components/mystery/WordReveal';
import { MYSTERY_TEST_DAY_MS } from '@/data/devTesting';
import { collectTodaysClue, guessWord, markRevealSeen, restartTestWeek, useMysteryWeek } from '@/data/mysterySource';
import { reader } from '@/theme/colors';
import { mystery } from '@/theme/mysteryColors';
import { fonts } from '@/theme/text';

/** True while the pages slide in, so the page's timer ticks 60 times a second then. */
function pagesBusy(time: number): boolean {
  'worklet';
  return time < 1200;
}

/** The Clue Book page. */
export default function MysteryPage() {
  const router = useRouter();
  const clock = useAmbientClock(pagesBusy);
  const week = useMysteryWeek();

  /** Puts today's clue in the book. Only the "Collect clue" button does this; opening the book never does. */
  const collect = () => {
    if (collectTodaysClue()) playSound('collect');
  };

  // Seeing the reveal stops the red book from calling for it.
  useEffect(() => {
    if (week.revealed && markRevealSeen()) playSound('reveal');
  }, [week.id, week.revealed]);

  const shown = week.clues.filter((c) => c.day <= week.today);
  const solvedNote = week.solvedOn === null ? '' : `Solved on ${DAY_NAMES[week.solvedOn - 1]}`;

  return (
    <View style={styles.page}>
      <DrillHeader title="Clue Book" onBack={() => router.back()} />
      <KeyboardAvoidingView style={styles.body} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <DayStrip clues={week.clues} today={week.today} />
          {week.revealed && week.word !== null && <WordReveal key={week.id} word={week.word} note={solvedNote} clock={clock} />}
          <View style={styles.list}>
            {shown.map((c, i) => (
              <ClueCard key={`${week.id}:${c.day}`} clue={c} fresh={week.newClue === c.day} index={i} clock={clock} onCollect={collect} />
            ))}
          </View>
          {week.lastWeek && <LastWeek key={week.id} past={week.lastWeek} clock={clock} />}
          {MYSTERY_TEST_DAY_MS !== null && (
            <Pressable accessibilityRole="button" onPress={restartTestWeek} style={styles.test}>
              <Text style={styles.testText}>Test: start the week over</Text>
            </Pressable>
          )}
        </ScrollView>
        {!week.revealed && <GuessBox key={week.id} triesLeft={week.triesLeft} solvedWord={week.solvedOn === null ? null : week.word} solvedNote={solvedNote} onGuess={guessWord} />}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: reader.page },
  body: { flex: 1 },
  content: { gap: 16, paddingTop: 6, paddingBottom: 20, paddingHorizontal: 14, width: '100%', maxWidth: 620, alignSelf: 'center' },
  list: { gap: 10 },
  test: { alignSelf: 'center', borderRadius: 999, borderWidth: 1, borderColor: mystery.missedEdge, paddingVertical: 8, paddingHorizontal: 14 },
  testText: { fontFamily: fonts.extraBold, fontSize: 12, color: mystery.soft },
});
