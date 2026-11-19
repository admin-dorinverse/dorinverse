// One stop's player, as in the Constellations design: a close button and the oven bar at the top, the card in the
// middle (Papa Dorin's story, a question, or his fix-round note), and its button at the bottom. After Check the
// result sheet slides up, with Papa Dorin's explanation a tap away. At the end: "Cookie baked!" with the verses.

import { useRef, useState, type ComponentRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { CookieArt } from '@/components/common/cookieArt';
import { playSound } from '@/components/common/sounds';
import { useStopVerses } from '@/data/queries/progress';
import { glass, navy, text } from '@/theme/colors';
import { answerColors, cream, lessonSky } from '@/theme/lessonColors';
import { mixColor } from '@/theme/mixColor';
import { radius } from '@/theme/spacing';
import { fonts } from '@/theme/text';
import type { LessonId, LessonStop } from '@/types/lesson';
import { BakedScreen } from './BakedScreen';
import { ChoiceView } from './ChoiceView';
import { DorinSpeak } from './DorinSpeak';
import { ExplainPage } from './ExplainPage';
import { OvenBar } from './OvenBar';
import { isLastStep } from './playerSteps';
import { ResultSheet } from './ResultSheet';
import { StoryView } from './StoryView';
import { usePlayer } from './usePlayer';

/** Props for the stop player. */
type StopPlayerProps = {
  /** The lesson's number. */
  lessonId: LessonId;
  /** The stop to play. */
  stop: LessonStop;
  /** Where the lesson starts, like "Judges 3", saved with what is collected. */
  foundIn: string;
  /** The constellation's color. */
  color: string;
  /** The constellation's cookie pictures. */
  art: CookieArt;
  /** Leaves the player. */
  onClose: () => void;
};

/** The stop player. */
export function StopPlayer({ lessonId, stop, foundIn, color, art, onClose }: StopPlayerProps) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const player = usePlayer(lessonId, stop);
  const verses = useStopVerses(player.state.finished ? stop : undefined);
  const [explaining, setExplaining] = useState(false);
  const [sheetHeight, setSheetHeight] = useState(0);
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const dorinHeight = height < 700 ? 112 : 150;
  const { step, checked, state } = player;

  /** Goes on from the result sheet or the explain page. */
  const goOn = () => {
    setExplaining(false);
    setSheetHeight(0);
    player.next();
    scroll.current?.scrollTo({ y: 0, animated: false });
  };

  // What the bottom button says: leave at the end, Check on a question, and go on otherwise. None under a result.
  const isCheck = !state.finished && step.kind === 'card' && step.card.kind === 'choice';
  const footLabel = state.finished
    ? 'Back to the stars'
    : step.kind === 'fix'
      ? "Let's fix them"
      : step.card.kind === 'story'
        ? isLastStep(state)
          ? 'Bake this cookie'
          : 'Next'
        : checked
          ? null
          : 'Check';
  const footOn = !isCheck || player.canCheck;
  /** Runs the bottom button. */
  const onFoot = () => {
    if (state.finished) onClose();
    else if (isCheck) player.check();
    else goOn();
  };

  const card = step.kind === 'card' ? step.card : null;
  const rightTexts = checked?.result.rightTexts.join(' · ') ?? '';
  const pickedText = checked && card?.kind === 'choice' && card.type === 'fill_blank' && !checked.result.right ? checked.picked.map((id) => card.answers.find((a) => a.id === id)?.text ?? '').join(' · ') : null;

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
        <OvenBar heat={state.heat} art={art} />
      </View>
      <ScrollView ref={scroll} style={styles.stage} contentContainerStyle={[styles.inner, { paddingBottom: 24 + sheetHeight }]}>
        {state.finished ? (
          <BakedScreen art={art} color={color} range={stop.verses} verses={verses} failed={player.bake === 'failed' || (player.bake === 'done' && !verses)} />
        ) : step.kind === 'fix' ? (
          <DorinSpeak key={step.key} length={step.line.length + 60} height={dorinHeight}>
            <Text style={[styles.fixWords, styles.bold]}>{step.line}</Text>
            <Text style={styles.fixWords}>
              {step.count === 1 ? 'One cookie came out a little underbaked.' : `${step.count} cookies came out a little underbaked.`} Let&apos;s give{' '}
              {step.count === 1 ? 'it' : 'them'} another minute in the oven.
            </Text>
          </DorinSpeak>
        ) : step.card.kind === 'story' ? (
          <StoryView key={step.key} card={step.card} foundIn={foundIn} dorinHeight={dorinHeight} color={color} />
        ) : (
          <ChoiceView key={step.key} card={step.card} round={step.round} picks={player.picks} onPicks={player.setPicks} checked={checked?.result.right} />
        )}
      </ScrollView>
      {footLabel && (
        <View style={[styles.foot, { paddingBottom: 16 + insets.bottom }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !footOn }}
            disabled={!footOn}
            onPress={onFoot}
            style={({ pressed }) => [
              styles.go,
              isCheck
                ? { backgroundColor: answerColors.check, boxShadow: `0 5px 0 ${answerColors.checkShadow}` }
                : { backgroundColor: color, boxShadow: `0 5px 0 ${mixColor(color, 0.6, lessonSky.black)}, 0 0 22px ${mixColor(color, 0.6)}` },
              !footOn && styles.off,
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.goText, isCheck && styles.checkText]}>{footLabel}</Text>
          </Pressable>
        </View>
      )}
      {checked && card && (
        <ResultSheet
          right={checked.result.right}
          reaction={checked.reaction}
          rightText={rightTexts}
          pickedText={pickedText}
          verses={card.verses}
          canExplain={checked.result.explanations.length > 0}
          onExplain={() => setExplaining(true)}
          onContinue={goOn}
          onHeight={(h) => {
            setSheetHeight(h);
            setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 50);
          }}
        />
      )}
      {checked && explaining && <ExplainPage right={checked.result.right} explanations={checked.result.explanations} onBack={() => setExplaining(false)} onContinue={goOn} />}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: lessonSky.player },
  top: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingBottom: 14 },
  close: { width: 40, height: 40, borderRadius: 20, backgroundColor: glass.button, alignItems: 'center', justifyContent: 'center' },
  closeText: { fontFamily: fonts.black, fontSize: 17, color: text.onDark },
  stage: { flex: 1 },
  inner: { paddingTop: 22, paddingHorizontal: 20, width: '100%', maxWidth: 600, alignSelf: 'center' },
  fixWords: { fontFamily: fonts.body, fontSize: 17.5, lineHeight: 27, color: cream.ink },
  bold: { fontFamily: fonts.black, marginBottom: 6 },
  foot: { paddingTop: 10, paddingHorizontal: 18, width: '100%', maxWidth: 596, alignSelf: 'center' },
  go: { borderRadius: radius.button, paddingVertical: 15, paddingHorizontal: 18, alignItems: 'center' },
  goText: { fontFamily: fonts.black, fontSize: 17, letterSpacing: 0.3, color: navy },
  checkText: { color: text.onDark },
  off: { opacity: 0.45 },
  pressed: { transform: [{ translateY: 4 }] },
});
