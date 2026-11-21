// The Quality Check (Burnt Cookies), one line at a time: Papa Dorin says what to do, then each of his 5 lines shows
// on its own with Good and Burnt buttons. Marking a line checks it at once: its cookie goes dark with black smoke if
// it was burnt, or lights up with white steam if it was fresh. The cookies across the top keep the score. After the
// last line, the button goes on to the Big Idea.

import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { CookieArt } from '@/components/common/cookieArt';
import { playSound } from '@/components/common/sounds';
import { useAmbientClock } from '@/components/common/useAmbientClock';
import { checkBurntLine } from '@/data/queries/lessons';
import { glass, navy, text } from '@/theme/colors';
import { cream, lessonSky, qualityColors } from '@/theme/lessonColors';
import { mixColor } from '@/theme/mixColor';
import { radius } from '@/theme/spacing';
import { fonts } from '@/theme/text';
import type { BurntLineResult, QualityCheck } from '@/types/lesson';
import { BurntCookie } from './BurntCookie';
import { BurntLineCard } from './BurntLineCard';
import { DorinSpeak } from './DorinSpeak';

/** Props for the Quality Check. */
type QualityCheckPlayerProps = {
  /** The lesson's Quality Check. */
  check: QualityCheck;
  /** The constellation's color. */
  color: string;
  /** The constellation's cookie pictures. */
  art: CookieArt;
  /** Leaves without finishing. */
  onClose: () => void;
  /** Goes on to the Big Idea. */
  onDone: () => void;
};

/** One marked line: what the baker said, and the answer. */
type Answer = { markedBurnt: boolean; result: BurntLineResult };

/** The smoke and steam drift slowly; 20 ticks a second is plenty. */
function calm(): boolean {
  'worklet';
  return false;
}

/** The Quality Check player. */
export function QualityCheckPlayer({ check, color, art, onClose, onDone }: QualityCheckPlayerProps) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const clock = useAmbientClock(calm);
  const [at, setAt] = useState(-1);
  const [answers, setAnswers] = useState<Record<number, Answer>>({});
  const checking = useRef(false);
  const { lines, burntCount } = check;
  const line = at >= 0 ? lines[at] : null;
  const answer = line ? (answers[line.line] ?? null) : null;
  const last = at === lines.length - 1;
  const dorinHeight = height < 700 ? 104 : 140;

  /** Marks the line showing good or burnt, and checks it at once. */
  const mark = (markedBurnt: boolean) => {
    if (!line || answer || checking.current) return;
    checking.current = true;
    void checkBurntLine(check, line.line, markedBurnt)
      .then((result) => {
        playSound(result.burnt ? 'burn' : 'right');
        if (markedBurnt !== result.burnt) setTimeout(() => playSound('wrong'), 350);
        setAnswers((a) => ({ ...a, [line.line]: { markedBurnt, result } }));
      })
      .finally(() => {
        checking.current = false;
      });
  };

  /** Goes on: the first line, the next line, or the Big Idea. */
  const next = () => {
    if (at >= 0 && last) return onDone();
    playSound('next');
    setAt(at + 1);
  };

  const shadow = `0 5px 0 ${mixColor(color, 0.6, lessonSky.black)}, 0 0 22px ${mixColor(color, 0.6)}`;
  return (
    <View style={[styles.page, { paddingTop: insets.top + 12 }]}>
      <View style={styles.top}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => {
            playSound('tap');
            onClose();
          }}
          style={styles.close}
        >
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
        <Text style={styles.title}>Quality Check</Text>
        <View style={styles.dots}>
          {lines.map((l, i) => {
            const a = answers[l.line];
            return (
              <View key={l.line} style={[styles.dot, i === at && [styles.dotHere, { borderColor: color }], !a && i !== at && styles.dotLater]}>
                <BurntCookie source={art.baked} size={24} burnt={a?.result.burnt === true} />
              </View>
            );
          })}
        </View>
      </View>
      <ScrollView style={styles.stage} contentContainerStyle={styles.inner}>
        {line ? (
          <BurntLineCard key={line.line} line={line} count={lines.length} cookie={art.baked} answer={answer} clock={clock} />
        ) : (
          <DorinSpeak length={160} height={dorinHeight}>
            <Text style={[styles.say, styles.bold]}>One last look before these go in the box.</Text>
            <Text style={styles.say}>
              I&apos;ll tell the passage again in {lines.length} lines. {burntCount} came out burnt: each has a detail that isn&apos;t right. Mark each line Good or
              Burnt.
            </Text>
          </DorinSpeak>
        )}
      </ScrollView>
      <View style={[styles.foot, { paddingBottom: 16 + insets.bottom }]}>
        {line && !answer ? (
          <View style={styles.pair}>
            <Pressable accessibilityRole="button" onPress={() => mark(false)} style={({ pressed }) => [styles.go, styles.half, { backgroundColor: color, boxShadow: shadow }, pressed && styles.pressed]}>
              <Text style={styles.goText}>Good</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => mark(true)} style={({ pressed }) => [styles.go, styles.half, styles.burnt, pressed && styles.pressed]}>
              <Text style={[styles.goText, styles.light]}>Burnt</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable accessibilityRole="button" onPress={next} style={({ pressed }) => [styles.go, { backgroundColor: color, boxShadow: shadow }, pressed && styles.pressed]}>
            <Text style={styles.goText}>{!line ? "Let's look" : last ? 'On to the Big Idea' : 'Next'}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: lessonSky.player },
  top: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingBottom: 14 },
  close: { width: 40, height: 40, borderRadius: 20, backgroundColor: glass.button, alignItems: 'center', justifyContent: 'center' },
  closeText: { fontFamily: fonts.black, fontSize: 17, color: text.onDark },
  title: { flex: 1, fontFamily: fonts.black, fontSize: 19, color: text.onDark },
  dots: { flexDirection: 'row', gap: 4 },
  dot: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  dotHere: { borderWidth: 2 },
  dotLater: { opacity: 0.35 },
  stage: { flex: 1 },
  inner: { paddingTop: 22, paddingBottom: 24, paddingHorizontal: 20, width: '100%', maxWidth: 600, alignSelf: 'center' },
  say: { fontFamily: fonts.body, fontSize: 17.5, lineHeight: 27, color: cream.ink },
  bold: { fontFamily: fonts.black, marginBottom: 6 },
  foot: { paddingTop: 10, paddingHorizontal: 18, width: '100%', maxWidth: 596, alignSelf: 'center' },
  pair: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
  go: { borderRadius: radius.button, paddingVertical: 15, paddingHorizontal: 18, alignItems: 'center' },
  burnt: { backgroundColor: qualityColors.burnt, boxShadow: `0 5px 0 ${qualityColors.burntShadow}` },
  goText: { fontFamily: fonts.black, fontSize: 17, letterSpacing: 0.3, color: navy },
  light: { color: text.onDark },
  pressed: { transform: [{ translateY: 4 }] },
});
