// A lesson question on the call, as in the call mockups: the question on a cream card and its answers, in the
// lesson player's look. While everyone picks, this person's pick turns blue. Once the host checks, the right answer
// turns green (this person's miss red), and each answer shows the avatars of who picked it. Smaller and dimmed while
// Papa Dorin answers someone.

import { Pressable, StyleSheet, Text, View } from 'react-native';
import { playSound } from '@/components/common/sounds';
import { callShowColors as show } from '@/theme/callColors';
import { text } from '@/theme/colors';
import { answerColors, cream } from '@/theme/lessonColors';
import { fonts } from '@/theme/text';
import type { ChoiceCard } from '@/types/lesson';
import { CallAvatar } from './CallPerson';

/** An empty blank: a short line to fill. */
const EMPTY_BLANK = ' ______ ';

/** How many avatars show on an answer before "+N". */
const AVATARS = 4;

/** Props for the avatars on an answer. */
type PickersProps = {
  /** The names of who picked it. */
  names: string[];
  /** The answer's fill, for the ring that keeps the avatars apart. */
  edge: string;
  /** Avatar size. */
  size: number;
};

/** The small overlapping avatars of who picked an answer. */
function Pickers({ names, edge, size }: PickersProps) {
  if (names.length === 0) return null;
  const more = names.length - AVATARS;
  return (
    <View style={styles.pickers} accessibilityLabel={`Picked by ${names.join(', ')}`}>
      {names.slice(0, more > 0 ? AVATARS - 1 : AVATARS).map((n, i) => (
        <View key={`${n}-${i}`} style={[{ borderRadius: size / 2, boxShadow: `0 0 0 2px ${edge}` }, i > 0 && styles.overlap]}>
          <CallAvatar name={n} size={size} />
        </View>
      ))}
      {more > 0 && <Text style={styles.pickersMore}>{`+${more + 1}`}</Text>}
    </View>
  );
}

/** Props for a lesson question. */
type LessonChoiceProps = {
  /** The question. */
  card: ChoiceCard;
  /** Picking, showing the result, or paused (smaller) while Papa Dorin answers someone. */
  mode: 'pick' | 'result' | 'paused';
  /** This person's picks: one answer id, or one per blank (null while empty). */
  mine: (number | null)[];
  /** Changes this person's picks (only while picking). */
  onPick?: (picks: (number | null)[]) => void;
  /** The right answers, once checked. */
  rightIds?: readonly number[];
  /** Who picked each answer (answer id to names), once checked. */
  pickers?: ReadonlyMap<number, string[]>;
};

/** A lesson question and its answers. */
export function LessonChoice({ card, mode, mine, onPick, rightIds = [], pickers }: LessonChoiceProps) {
  const picking = mode === 'pick';
  const small = mode === 'paused';
  const blankCard = card.type === 'fill_blank';
  const tf = card.type === 'true_false';
  const textOf = (id: number | null | undefined) => card.answers.find((a) => a.id === id)?.text;

  /** Picks an answer: the only pick, or the next empty blank. */
  const pick = (id: number) => {
    if (!picking || !onPick) return;
    playSound('tap');
    if (!blankCard || card.blanks < 2) return onPick([id]);
    if (mine.includes(id)) return;
    const empty = mine.indexOf(null);
    onPick(mine.map((p, i) => (i === (empty < 0 ? mine.length - 1 : empty) ? id : p)));
  };
  /** Empties a filled blank while picking. */
  const clearBlank = (i: number) => {
    if (!picking || !onPick || mine[i] === null) return;
    playSound('tap');
    onPick(mine.map((p, j) => (j === i ? null : p)));
  };
  /** An answer's look: idle, picked, or green or red once checked. */
  const lookOf = (id: number) => {
    if (picking) return mine.includes(id) ? 'pick' : 'idle';
    if (rightIds.includes(id)) return 'good';
    return mine.includes(id) ? 'bad' : 'idle';
  };
  const parts = card.question.split('___');
  // In a blank: this person's pick while picking, the right answer once checked.
  const blankWord = (i: number) => (picking ? textOf(mine[i]) : textOf(rightIds[i]));

  return (
    <View style={[styles.wrap, small && styles.wrapSmall]}>
      <View style={[styles.qcard, small && styles.qcardSmall]}>
        <Text style={[styles.question, small && styles.questionSmall]}>
          {blankCard
            ? parts.map((part, i) => (
                <Text key={i}>
                  {part}
                  {i < parts.length - 1 && (
                    <Text onPress={() => clearBlank(i)} style={[styles.blank, blankWord(i) !== undefined && styles.filled]}>
                      {blankWord(i) ?? EMPTY_BLANK}
                    </Text>
                  )}
                </Text>
              ))
            : card.question}
        </Text>
      </View>
      <View style={[styles.answers, small && styles.answersSmall, tf && styles.row, blankCard && styles.words]}>
        {card.answers.map((a) => {
          const look = lookOf(a.id);
          const names = pickers?.get(a.id) ?? [];
          return (
            <Pressable
              key={a.id}
              accessibilityRole="button"
              accessibilityState={{ selected: mine.includes(a.id), disabled: !picking }}
              disabled={!picking}
              onPress={() => pick(a.id)}
              style={[styles.ans, small && styles.ansSmall, tf && styles.tf, blankCard && styles.word, looks[look], small && styles.flat]}
            >
              <Text style={[styles.ansText, small && styles.ansTextSmall, inks[look]]}>{a.text}</Text>
              <Pickers names={names} edge={fills[look]} size={small ? 22 : 24} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** Each look's fill, for the avatars' ring. */
const fills = { idle: 'transparent', pick: answerColors.pickFill, good: answerColors.goodFill, bad: answerColors.badFill } as const;

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  wrapSmall: { gap: 8, opacity: 0.8 },
  qcard: { borderRadius: 22, padding: 18, backgroundColor: cream.card, boxShadow: `0 8px 24px ${show.cardShadow}` },
  qcardSmall: { borderRadius: 20, paddingVertical: 14, paddingHorizontal: 16 },
  question: { fontFamily: fonts.extraBold, fontSize: 17, lineHeight: 25, color: cream.ink },
  questionSmall: { fontSize: 15.5, lineHeight: 22 },
  blank: { color: answerColors.pickEdge, fontFamily: fonts.black },
  filled: { color: answerColors.pickInk, backgroundColor: answerColors.pickFill },
  answers: { gap: 10 },
  answersSmall: { gap: 8 },
  row: { flexDirection: 'row' },
  words: { flexDirection: 'row', flexWrap: 'wrap' },
  ans: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 2, borderRadius: 18, paddingVertical: 13, paddingHorizontal: 14 },
  ansSmall: { borderRadius: 16, paddingVertical: 10 },
  flat: { boxShadow: 'none' },
  tf: { flex: 1, justifyContent: 'center', paddingVertical: 20 },
  word: { paddingVertical: 11 },
  ansText: { flexShrink: 1, flexGrow: 1, fontFamily: fonts.extraBold, fontSize: 16, color: text.onDark },
  ansTextSmall: { fontSize: 15 },
  pickers: { flexDirection: 'row', alignItems: 'center' },
  overlap: { marginLeft: -5 },
  pickersMore: { marginLeft: 4, fontFamily: fonts.black, fontSize: 11, color: text.onDark },
});

/** Each look's answer fill, edge and bottom shadow. */
const looks = StyleSheet.create({
  idle: { borderColor: answerColors.idleEdge, backgroundColor: answerColors.idleFill, boxShadow: `0 4px 0 ${show.answerShadow}` },
  pick: { borderColor: answerColors.pickEdge, backgroundColor: answerColors.pickFill, boxShadow: `0 4px 0 ${answerColors.pickEdge}` },
  good: { borderColor: answerColors.goodEdge, backgroundColor: answerColors.goodFill, boxShadow: `0 4px 0 ${answerColors.goodEdge}` },
  bad: { borderColor: answerColors.badEdge, backgroundColor: answerColors.badFill, boxShadow: `0 4px 0 ${answerColors.badEdge}` },
});

/** Each look's answer words. */
const inks = StyleSheet.create({
  idle: {},
  pick: { color: answerColors.pickInk },
  good: { color: answerColors.goodInk },
  bad: { color: answerColors.badInk },
});
