// The result sheet of a lesson question on the call, as in the call mockups' "Lesson together: a question card":
// green with a reaction like "Box-worthy!" when this person's pick was right (pink with "Still doughy" when not),
// "3 of 4 got it", the right answer when missed, its verses, and for the host only "EXPLAIN THE ANSWER" (Papa Dorin
// reads it to everyone) and "CONTINUE". It slides up once.

import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, SlideInDown } from 'react-native-reanimated';
import { playSound } from '@/components/common/sounds';
import { text } from '@/theme/colors';
import { answerColors } from '@/theme/lessonColors';
import { gutter } from '@/theme/spacing';
import { fonts } from '@/theme/text';

/** How the sheet comes in: one smooth slide up. */
const SHEET_IN = SlideInDown.duration(450).easing(Easing.out(Easing.cubic));

/** Props for the result sheet. */
type LessonResultProps = {
  /** True when this person's pick was right, false when missed, null when they didn't pick. */
  right: boolean | null;
  /** The reaction words. */
  reaction: string;
  /** "3 of 4 got it". */
  tally: string;
  /** The right answer's words, shown when this person missed or didn't pick. */
  rightText: string;
  /** The verses the right answer comes from. */
  verses: string;
  /** True for the host, who gets the buttons. */
  isHost: boolean;
  /** The host's name, for "Only Mom sees these two buttons". */
  hostName: string;
  /** True when the question has a written explanation to read. */
  canExplain: boolean;
  /** The host asks Papa Dorin to read the explanation to everyone. */
  onExplain: () => void;
  /** The host goes on to the next card. */
  onContinue: () => void;
};

/** The result sheet. */
export function LessonResult({ right, reaction, tally, rightText, verses, isHost, hostName, canExplain, onExplain, onContinue }: LessonResultProps) {
  const good = right !== false;
  const ink = good ? answerColors.goodInk : answerColors.badInk;
  const edge = good ? answerColors.goodEdge : answerColors.badEdge;
  return (
    <Animated.View entering={SHEET_IN} style={[styles.sheet, { backgroundColor: good ? answerColors.goodFill : answerColors.badFill }]}>
      <View style={styles.head}>
        <View style={[styles.mark, { backgroundColor: good ? answerColors.check : answerColors.badInk }]}>
          <Text style={styles.markText}>{good ? '✓' : '✕'}</Text>
        </View>
        <Text style={[styles.reaction, { color: ink }]}>{reaction}</Text>
        <Text style={[styles.tally, { color: ink }]}>{tally}</Text>
      </View>
      {right !== true && (
        <View>
          <Text style={[styles.small, { color: ink }]}>Correct answer:</Text>
          <Text style={[styles.answer, { color: ink }]}>{rightText}</Text>
        </View>
      )}
      <Text style={[styles.verses, { color: ink }]}>{verses}</Text>
      {isHost ? (
        <>
          {canExplain && (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                playSound('tap');
                onExplain();
              }}
              style={({ pressed }) => [styles.explain, { borderColor: edge }, pressed && styles.pressed]}
            >
              <Text style={[styles.explainText, { color: ink }]}>EXPLAIN THE ANSWER</Text>
              <Text style={[styles.explainLine, { color: ink }]}>Papa Dorin reads it to everyone</Text>
            </Pressable>
          )}
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              playSound('tap');
              onContinue();
            }}
            style={({ pressed }) => [
              styles.go,
              { backgroundColor: good ? answerColors.check : answerColors.missButton, boxShadow: `0 4px 0 ${good ? answerColors.checkShadow : answerColors.badInk}` },
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.goText}>CONTINUE</Text>
          </Pressable>
          <Text style={[styles.only, { color: ink }]}>{canExplain ? `Only ${hostName} sees these two buttons` : `Only ${hostName} sees this button`}</Text>
        </>
      ) : (
        <Text style={[styles.only, { color: ink }]}>{`${hostName} moves the lesson along`}</Text>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sheet: { marginHorizontal: -gutter, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingTop: 18, paddingHorizontal: 18, paddingBottom: 14, gap: 12 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mark: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  markText: { fontFamily: fonts.black, fontSize: 18, color: text.onDark },
  reaction: { flex: 1, fontFamily: fonts.black, fontSize: 22 },
  tally: { fontFamily: fonts.extraBold, fontSize: 12.5 },
  small: { fontFamily: fonts.black, fontSize: 12, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 4 },
  answer: { fontFamily: fonts.extraBold, fontSize: 16 },
  verses: { fontFamily: fonts.extraBold, fontSize: 13, opacity: 0.85 },
  explain: { borderWidth: 2, borderBottomWidth: 4, borderRadius: 14, paddingVertical: 10, alignItems: 'center', gap: 1 },
  explainText: { fontFamily: fonts.black, fontSize: 14, letterSpacing: 0.6 },
  explainLine: { fontFamily: fonts.bold, fontSize: 11.5 },
  go: { borderRadius: 16, paddingVertical: 15, alignItems: 'center' },
  goText: { fontFamily: fonts.black, fontSize: 17, letterSpacing: 0.8, color: text.onDark },
  only: { textAlign: 'center', fontFamily: fonts.extraBold, fontSize: 11.5, marginTop: -4 },
  pressed: { transform: [{ translateY: 3 }] },
});
