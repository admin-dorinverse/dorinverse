// A choice card in the player, as in the design: the question on a cream card, then its answers. Multiple choice
// lists three answers; true or false shows True and False side by side; fill in the blank puts the tapped word in
// the blank (two blanks fill in order, and tapping a filled blank empties it). After Check, the picks turn green or
// red; on a miss the right answer shows in the result sheet.

import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, FadeInDown } from 'react-native-reanimated';
import { playSound } from '@/components/common/sounds';
import { text } from '@/theme/colors';
import { answerColors, cream } from '@/theme/lessonColors';
import { fonts } from '@/theme/text';
import type { ChoiceCard } from '@/types/lesson';
import { MarkedText, type MarkTap } from './MarkedText';
import { answersForRound } from './playerSteps';
import { WordSheet } from './WordSheet';

/** How the question card comes in: one small pop. */
const CARD_IN = FadeInDown.duration(400).easing(Easing.out(Easing.back(1.2)));

/** An empty blank: a short line to fill. Spaces can't be used: phones don't underline spaces, so the gap vanished. */
const EMPTY_BLANK = ' ______ ';

/** Props for a choice card. */
type ChoiceViewProps = {
  /** The card. */
  card: ChoiceCard;
  /** The fix round it is asked in (0 the first time); the answers move a little each round. */
  round: number;
  /** The picks so far: one answer id, or one per blank (null while empty). */
  picks: (number | null)[];
  /** Changes the picks. */
  onPicks: (picks: (number | null)[]) => void;
  /** After Check: whether the picks were right. Undefined before. */
  checked?: boolean;
};

/** A choice card. */
export function ChoiceView({ card, round, picks, onPicks, checked }: ChoiceViewProps) {
  const [tap, setTap] = useState<MarkTap | null>(null);
  const [seen, setSeen] = useState<ReadonlySet<string>>(new Set());
  const answers = answersForRound(card.answers, round, card.type === 'true_false');
  const done = checked !== undefined;
  const blankCard = card.type === 'fill_blank';
  const textOf = (id: number | null) => card.answers.find((a) => a.id === id)?.text;

  /** Opens a word's or saying's meaning. */
  const openTap = (t: MarkTap) => {
    playSound('word');
    setSeen((s) => new Set([...s, `${t.kind}:${t.index}`]));
    setTap(t);
  };
  /** Picks an answer: the only pick, or the next empty blank. */
  const pick = (id: number) => {
    if (done) return;
    playSound('tap');
    if (!blankCard || card.blanks < 2) return onPicks([id]);
    if (picks.includes(id)) return;
    const empty = picks.indexOf(null);
    onPicks(picks.map((p, i) => (i === (empty < 0 ? picks.length - 1 : empty) ? id : p)));
  };
  /** Empties a filled blank. */
  const clearBlank = (i: number) => {
    if (done || picks[i] === null) return;
    playSound('tap');
    onPicks(picks.map((p, j) => (j === i ? null : p)));
  };
  /** An answer's look: idle, picked, or green or red after Check. */
  const lookOf = (id: number) => (!picks.includes(id) ? null : !done ? styles.sel : checked ? styles.good : styles.bad);
  const inkOf = (id: number) => (!picks.includes(id) ? null : !done ? styles.selInk : checked ? styles.goodInk : styles.badInk);

  // The question, with each "___" turned into a blank showing its picked word.
  const parts = card.question.split('___');
  return (
    <View>
      <Animated.View entering={CARD_IN} style={styles.qcard}>
        {blankCard ? (
          <Text style={styles.question}>
            {parts.map((part, i) => (
              <Text key={i}>
                <MarkedText text={part} words={card.words} idioms={card.idioms} seen={seen} onTap={openTap} style={styles.question} />
                {i < parts.length - 1 && (
                  <Text onPress={() => clearBlank(i)} style={[styles.blank, picks[i] !== null && picks[i] !== undefined && [styles.filled, styles.filledInk]]}>
                    {textOf(picks[i] ?? null) ?? EMPTY_BLANK}
                  </Text>
                )}
              </Text>
            ))}
          </Text>
        ) : (
          <MarkedText text={card.question} words={card.words} idioms={card.idioms} seen={seen} onTap={openTap} style={styles.question} />
        )}
      </Animated.View>
      <View style={[styles.answers, card.type === 'true_false' && styles.row, blankCard && styles.wrap]}>
        {answers.map((a) => (
          <Pressable
            key={a.id}
            accessibilityRole="button"
            accessibilityState={{ selected: picks.includes(a.id), disabled: done }}
            disabled={done}
            onPress={() => pick(a.id)}
            style={[styles.ans, card.type === 'true_false' && styles.tf, blankCard && styles.word, lookOf(a.id)]}
          >
            <Text style={[styles.ansText, card.type === 'true_false' && styles.tfText, inkOf(a.id)]}>{a.text}</Text>
          </Pressable>
        ))}
      </View>
      <WordSheet card={card} tap={tap} onClose={() => setTap(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  qcard: { borderRadius: 22, paddingVertical: 20, paddingHorizontal: 20, marginBottom: 26, backgroundColor: cream.card, boxShadow: '0 8px 24px rgba(0,0,0,0.3)' },
  question: { fontFamily: fonts.extraBold, fontSize: 18, lineHeight: 27, color: cream.ink },
  blank: { color: answerColors.pickEdge, fontFamily: fonts.black },
  filledInk: { color: answerColors.pickInk, textDecorationLine: 'underline', textDecorationColor: answerColors.pickEdge },
  filled: { backgroundColor: answerColors.pickFill },
  answers: { gap: 12 },
  row: { flexDirection: 'row' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  ans: {
    borderWidth: 2,
    borderColor: answerColors.idleEdge,
    backgroundColor: answerColors.idleFill,
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 18,
    boxShadow: '0 4px 0 rgba(0,0,0,0.25)',
  },
  tf: { flex: 1, alignItems: 'center', paddingVertical: 22, paddingHorizontal: 12 },
  word: { paddingVertical: 12, paddingHorizontal: 16 },
  ansText: { fontFamily: fonts.extraBold, fontSize: 16.5, color: text.onDark },
  tfText: { fontSize: 19 },
  sel: { backgroundColor: answerColors.pickFill, borderColor: answerColors.pickEdge, boxShadow: `0 4px 0 ${answerColors.pickEdge}` },
  selInk: { color: answerColors.pickInk },
  good: { backgroundColor: answerColors.goodFill, borderColor: answerColors.goodEdge, boxShadow: `0 4px 0 ${answerColors.goodEdge}` },
  goodInk: { color: answerColors.goodInk },
  bad: { backgroundColor: answerColors.badFill, borderColor: answerColors.badEdge, boxShadow: `0 4px 0 ${answerColors.badEdge}` },
  badInk: { color: answerColors.badInk },
});
