// The sheet that slides up after Check, as in the design: green with a reaction like "Box-worthy!" when right, or
// pink with one like "Still doughy" when missed, plus the right answer (and, for a fill-in, the words picked), the
// verses the answer comes from, a button to Papa Dorin's explanation, and Continue. It slides in once.

import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { playSound } from '@/components/common/sounds';
import { text } from '@/theme/colors';
import { answerColors } from '@/theme/lessonColors';
import { fonts } from '@/theme/text';

/** How the sheet comes in: one smooth slide up. */
const SHEET_IN = SlideInDown.duration(450).easing(Easing.out(Easing.cubic));

/** Props for the result sheet. */
type ResultSheetProps = {
  /** True when the pick was right. */
  right: boolean;
  /** The reaction words, picked once when the sheet opens. */
  reaction: string;
  /** The right answer's words, shown when missed. */
  rightText: string;
  /** The words picked, shown when a fill-in is missed; null otherwise. */
  pickedText: string | null;
  /** The verses the right answer comes from. */
  verses: string;
  /** True when Papa Dorin has an explanation to show. */
  canExplain: boolean;
  /** Opens the explanation. */
  onExplain: () => void;
  /** Goes on. */
  onContinue: () => void;
  /** Tells the page how tall the sheet is, so the card above can scroll clear of it. */
  onHeight: (height: number) => void;
};

/** The result sheet. */
export function ResultSheet({ right, reaction, rightText, pickedText, verses, canExplain, onExplain, onContinue, onHeight }: ResultSheetProps) {
  const insets = useSafeAreaInsets();
  const ink = right ? answerColors.goodInk : answerColors.badInk;
  const edge = right ? answerColors.goodEdge : answerColors.badEdge;
  return (
    <Animated.View
      entering={SHEET_IN}
      onLayout={(e) => onHeight(e.nativeEvent.layout.height)}
      style={[styles.sheet, { paddingBottom: 18 + insets.bottom, backgroundColor: right ? answerColors.goodFill : answerColors.badFill }]}
    >
      <View style={styles.inner}>
        <View style={styles.head}>
          <View style={[styles.mark, { backgroundColor: right ? answerColors.check : answerColors.badInk }]}>
            <Text style={styles.markText}>{right ? '✓' : '✕'}</Text>
          </View>
          <Text style={[styles.reaction, { color: ink }]}>{reaction}</Text>
        </View>
        {!right && (
          <View>
            <Text style={[styles.small, { color: ink }]}>Correct answer:</Text>
            <Text style={[styles.answer, { color: ink }]}>{rightText}</Text>
            {pickedText && <Text style={[styles.picked, { color: ink }]}>{`You picked: ${pickedText}`}</Text>}
          </View>
        )}
        <Text style={[styles.verses, { color: ink }]}>{verses}</Text>
        {canExplain && (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              playSound('tap');
              onExplain();
            }}
            style={({ pressed }) => [styles.explain, { borderColor: edge }, pressed && styles.pressed]}
          >
            <Text style={[styles.explainText, { color: ink }]}>{right ? 'EXPLAIN THE ANSWER' : 'EXPLAIN THE MISTAKE'}</Text>
          </Pressable>
        )}
        <Pressable
          accessibilityRole="button"
          onPress={onContinue}
          style={({ pressed }) => [
            styles.go,
            { backgroundColor: right ? answerColors.check : answerColors.missButton, boxShadow: `0 4px 0 ${right ? answerColors.checkShadow : answerColors.badInk}` },
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.goText}>CONTINUE</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 6, paddingTop: 18, paddingHorizontal: 18, borderTopLeftRadius: 22, borderTopRightRadius: 22 },
  inner: { width: '100%', maxWidth: 560, alignSelf: 'center', gap: 12 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mark: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  markText: { fontFamily: fonts.black, fontSize: 18, color: text.onDark },
  reaction: { fontFamily: fonts.black, fontSize: 22 },
  small: { fontFamily: fonts.black, fontSize: 12, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 4 },
  answer: { fontFamily: fonts.extraBold, fontSize: 16 },
  picked: { fontFamily: fonts.bold, fontSize: 14, marginTop: 4 },
  verses: { fontFamily: fonts.extraBold, fontSize: 13, opacity: 0.85 },
  explain: { borderWidth: 2, borderBottomWidth: 4, borderRadius: 14, paddingVertical: 12, alignItems: 'center' },
  explainText: { fontFamily: fonts.black, fontSize: 14, letterSpacing: 0.6 },
  go: { borderRadius: 16, paddingVertical: 15, alignItems: 'center' },
  goText: { fontFamily: fonts.black, fontSize: 17, letterSpacing: 0.8, color: text.onDark },
  pressed: { transform: [{ translateY: 3 }] },
});
