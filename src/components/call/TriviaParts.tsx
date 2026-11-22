// Pieces the trivia screens share, as in the call mockups: the heading ("FAMILY TRIVIA · JOSEPH", "Question 3 of
// 8") with the score chip, the green right-answer box, the host's gold and glass buttons with "ONLY MOM SEES
// THESE" above them, and the answers' letters.

import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { call, callTriviaColors } from '@/theme/callColors';
import { text } from '@/theme/colors';
import { fonts } from '@/theme/text';
import type { TriviaState } from '@/types/call';
import { RightIcon, TrophyIcon } from './TriviaIcons';

/** The letter an answer is read with, by its position (1 is A). */
export const letterOf = (position: number) => 'ABCD'[position - 1] ?? '?';

/** The right answer, as "B · Twenty". */
export function rightAnswerOf(game: TriviaState): string {
  const right = game.answers.find((a) => a.position === game.correct);
  return right ? `${letterOf(right.position)} · ${right.text}` : '';
}

/** Props for the heading. */
type TriviaHeaderProps = {
  /** The game. */
  game: TriviaState;
  /** This person's score, shown in a chip on the right when given. */
  score?: number;
  /** Centers it, as on the winner screen, with `children` under it instead of the question number. */
  centered?: boolean;
  /** What goes under the small heading instead of "Question 3 of 8". */
  children?: ReactNode;
};

/** "FAMILY TRIVIA · <lesson>", then "Question 3 of 8" (or what's given), with the score chip. */
export function TriviaHeader({ game, score, centered = false, children }: TriviaHeaderProps) {
  return (
    <View style={styles.header}>
      <View style={[styles.headWords, centered && styles.centered]}>
        <Text style={styles.kicker} numberOfLines={1}>{`FAMILY TRIVIA · ${game.title.toUpperCase()}`}</Text>
        {children ?? <Text style={styles.count}>{`Question ${game.index} of ${game.total}`}</Text>}
      </View>
      {score !== undefined && (
        <View style={styles.score}>
          <TrophyIcon color={text.goldNote} />
          <Text style={styles.scoreText}>{`You: ${score}`}</Text>
        </View>
      )}
    </View>
  );
}

/** Props for the right-answer box. */
type RightAnswerProps = {
  /** The game, in its results. */
  game: TriviaState;
  /** How many got it right; leaves it out when not given (the explaining screen). */
  gotIt?: number;
};

/** The green box: a check, the right answer, its verses, and how many got it. */
export function RightAnswer({ game, gotIt }: RightAnswerProps) {
  const big = gotIt !== undefined;
  return (
    <View style={[styles.right, big ? styles.rightBig : styles.rightSmall]}>
      <RightIcon color={callTriviaColors.right} size={big ? 26 : 22} />
      {big ? (
        <View style={styles.rightWords}>
          <Text style={styles.rightAnswer}>{rightAnswerOf(game)}</Text>
          <Text style={styles.rightVerses}>{game.verses}</Text>
        </View>
      ) : (
        <Text style={[styles.rightAnswer, styles.rightWords, styles.rightAnswerSmall]}>{rightAnswerOf(game)}</Text>
      )}
      {big ? <Text style={styles.gotIt}>{`${gotIt} got it`}</Text> : <Text style={styles.rightVersesSmall}>{game.verses}</Text>}
    </View>
  );
}

/** Props for the host's buttons. */
type HostButtonsProps = {
  /** The host's name, for "ONLY MOM SEES THESE". */
  hostName: string;
  /** The buttons. */
  children: ReactNode;
};

/** The host's buttons under "ONLY <HOST> SEES THESE". */
export function HostButtons({ hostName, children }: HostButtonsProps) {
  return (
    <View style={styles.hostButtons}>
      <Text style={styles.onlyHost}>{`ONLY ${hostName.toUpperCase()} SEES THESE`}</Text>
      {children}
    </View>
  );
}

/** Props for a trivia button. */
type TriviaButtonProps = {
  /** Its words. */
  label: string;
  /** Gold (the main one) or glass. */
  gold?: boolean;
  /** Its height: 60, 56, 52, 48 or 44 in the mockups. */
  height: number;
  /** A picture before the words. */
  before?: ReactNode;
  /** A picture after the words. */
  after?: ReactNode;
  /** The tap. */
  onPress: () => void;
};

/** A round button: gold with a darker edge, or glass. */
export function TriviaButton({ label, gold = false, height, before, after, onPress }: TriviaButtonProps) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={[styles.button, { height, borderRadius: height / 2 }, gold ? styles.gold : styles.glass]}>
      {before}
      <Text style={[styles.buttonText, gold ? styles.goldText : styles.glassText, height < 50 && styles.smallText]}>{label}</Text>
      {after}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headWords: { flex: 1, gap: 2 },
  centered: { alignItems: 'center' },
  kicker: { fontFamily: fonts.extraBold, fontSize: 12, letterSpacing: 1.2, color: call.kicker },
  count: { fontFamily: fonts.black, fontSize: 19, color: text.onDark },
  score: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, backgroundColor: call.glassFill, paddingVertical: 7, paddingHorizontal: 12 },
  scoreText: { fontFamily: fonts.extraBold, fontSize: 13, color: text.onDark },
  right: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: callTriviaColors.right, backgroundColor: callTriviaColors.rightFill },
  rightBig: { gap: 12, borderRadius: 18, paddingVertical: 12, paddingHorizontal: 14 },
  rightSmall: { gap: 10, borderRadius: 16, paddingVertical: 10, paddingHorizontal: 14 },
  rightWords: { flex: 1 },
  rightAnswer: { fontFamily: fonts.black, fontSize: 17, color: text.onDark },
  rightAnswerSmall: { fontSize: 16 },
  rightVerses: { fontFamily: fonts.bold, fontSize: 12.5, color: text.onDarkSoft },
  rightVersesSmall: { fontFamily: fonts.extraBold, fontSize: 12.5, color: text.onDarkSoft },
  gotIt: { fontFamily: fonts.black, fontSize: 13, color: callTriviaColors.right },
  hostButtons: { gap: 8 },
  onlyHost: { fontFamily: fonts.extraBold, fontSize: 11.5, letterSpacing: 1.2, color: callTriviaColors.soft },
  button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  gold: { backgroundColor: call.talking, boxShadow: `0 4px 0 ${call.joinShadow}` },
  glass: { borderWidth: 1, borderColor: call.glassEdge, backgroundColor: call.glassFill },
  buttonText: { fontFamily: fonts.black, fontSize: 17 },
  goldText: { color: call.ink },
  glassText: { color: text.onDark, fontSize: 16 },
  smallText: { fontFamily: fonts.extraBold, fontSize: 14.5 },
});
