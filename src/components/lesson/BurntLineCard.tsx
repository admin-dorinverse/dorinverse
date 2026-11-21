// One Quality Check line on its own page: which line it is, its cookie, and Papa Dorin's line with its verses on a
// glass card. Once the baker marks it, the cookie shows the answer (dark with black smoke, or lit up with white
// steam), a short line says whether they called it, and a burnt line shows its wrong detail next to the true one.

import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInRight } from 'react-native-reanimated';
import type { AmbientClock } from '@/components/common/useAmbientClock';
import { glass, text } from '@/theme/colors';
import { qualityColors } from '@/theme/lessonColors';
import { radius } from '@/theme/spacing';
import { fonts } from '@/theme/text';
import type { BurntLine, BurntLineResult } from '@/types/lesson';
import { CookieReveal } from './CookieReveal';

/** How a line comes in. */
const LINE_IN = FadeInRight.duration(260);

/** Props for the line page. */
type BurntLineCardProps = {
  /** The line. */
  line: BurntLine;
  /** How many lines there are. */
  count: number;
  /** The baked cookie picture. */
  cookie: number;
  /** The baker's mark and the answer, once marked. */
  answer: { markedBurnt: boolean; result: BurntLineResult } | null;
  /** The page's shared timer, for the smoke and steam. */
  clock: AmbientClock;
};

/** What the answer line says. */
function answerWords(markedBurnt: boolean, burnt: boolean): string {
  if (burnt) return markedBurnt ? 'Burnt! You caught it.' : 'Not quite. This one came out burnt.';
  return markedBurnt ? 'Not quite. This one came out just right.' : 'Fresh! Baked just right.';
}

/** One line, to mark good or burnt. */
export function BurntLineCard({ line, count, cookie, answer, clock }: BurntLineCardProps) {
  const verdict = answer ? (answer.result.burnt ? 'burnt' : 'fresh') : null;
  const calledIt = answer ? answer.markedBurnt === answer.result.burnt : false;
  return (
    <Animated.View entering={LINE_IN} style={styles.wrap}>
      <Text style={styles.which}>
        Line {line.line} of {count}
      </Text>
      <View style={styles.cookie}>
        <CookieReveal source={cookie} size={120} verdict={verdict} clock={clock} />
      </View>
      <View style={styles.card}>
        <Text style={styles.line}>{line.text}</Text>
        <Text style={styles.ref}>{line.verses}</Text>
      </View>
      {answer && (
        <Animated.View entering={FadeIn.duration(300)} style={styles.answer}>
          <Text style={[styles.called, { color: calledIt ? qualityColors.calledIt : qualityColors.missed }]}>{answerWords(answer.markedBurnt, answer.result.burnt)}</Text>
          {answer.result.fixes.map((f, i) => (
            <Text key={i} style={styles.fix}>
              ✗ <Text style={styles.wrong}>{f.wrong}</Text> → ✓ <Text style={styles.right}>{f.right}</Text> <Text style={styles.ref}>({f.verse})</Text>
            </Text>
          ))}
        </Animated.View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 14 },
  which: { fontFamily: fonts.extraBold, fontSize: 13, letterSpacing: 0.8, textTransform: 'uppercase', color: text.goldNote },
  cookie: { paddingTop: 28 },
  card: {
    alignSelf: 'stretch',
    borderRadius: radius.card,
    paddingVertical: 22,
    paddingHorizontal: 20,
    gap: 10,
    backgroundColor: glass.still,
    borderWidth: 1,
    borderColor: glass.border,
    borderTopColor: glass.borderTop,
  },
  line: { fontFamily: fonts.bold, fontSize: 20, lineHeight: 29, color: text.onDark },
  ref: { fontFamily: fonts.extraBold, fontSize: 14, color: text.onDarkSoft },
  answer: { alignSelf: 'stretch', gap: 6, paddingHorizontal: 4 },
  called: { fontFamily: fonts.black, fontSize: 18 },
  fix: { fontFamily: fonts.bold, fontSize: 15.5, lineHeight: 23, color: text.onDarkSoft },
  wrong: { textDecorationLine: 'line-through', color: qualityColors.wrongWords },
  right: { fontFamily: fonts.black, color: qualityColors.rightWords },
});
