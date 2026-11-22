// Trivia's results, as in the call mockups (screen 6): the question, the green right answer with its verses and how
// many got it, then a bar for each answer with how many picked it and their avatars. The host also gets
// "Papa Dorin, explain it" (once the owner approves it) and "Next question"; everyone else sees the results only.

import { Image } from 'expo-image';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { PAPA_DORIN } from '@/components/common/cookieArt';
import { call, callTriviaColors, callShowColors } from '@/theme/callColors';
import { text } from '@/theme/colors';
import { fonts } from '@/theme/text';
import type { TriviaScore, TriviaState } from '@/types/call';
import { CallAvatar } from './CallPerson';
import { AnswerShape, NextIcon } from './TriviaIcons';
import { HostButtons, letterOf, RightAnswer, TriviaButton, TriviaHeader } from './TriviaParts';

/** How many avatars fit on one bar. */
const AVATARS = 8;

/** Props for the results screen. */
type TriviaResultsProps = {
  /** The game, in its results. */
  game: TriviaState;
  /** The host's name, or null for everyone but the host (who then gets no buttons). */
  hostName: string | null;
  /** True when the explain button may show. */
  canExplain: boolean;
  /** Host: he explains the right answer. */
  onExplain: () => void;
  /** Host: next question (or the winner after the last). */
  onNext: () => void;
  /** Host: ends the game early. */
  onEnd: () => void;
};

/** The results screen. */
export function TriviaResults({ game, hostName, canExplain, onExplain, onNext, onEnd }: TriviaResultsProps) {
  const picks = Object.entries(game.picks ?? {});
  const names = new Map(game.scores.map((s: TriviaScore) => [s.identity, s.name]));
  const gotIt = picks.filter(([, p]) => p === game.correct).length;
  const last = game.index >= game.total;
  return (
    <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
      <TriviaHeader game={game} />
      <Text style={styles.question}>{game.question}</Text>
      <RightAnswer game={game} gotIt={gotIt} />
      <View style={styles.bars}>
        {game.answers.map((a) => {
          const pickers = picks.filter(([, p]) => p === a.position).map(([identity]) => names.get(identity) ?? 'Guest');
          const share = picks.length ? Math.round((pickers.length / picks.length) * 100) : 0;
          const right = a.position === game.correct;
          const i = a.position - 1;
          return (
            <View key={a.position} style={styles.bar}>
              <View style={styles.barHead}>
                <AnswerShape position={a.position} color={callTriviaColors.tiles[i]} size={14} />
                <Text style={[styles.barLabel, right && styles.barLabelRight, share === 0 && styles.barLabelNone]}>{`${letterOf(a.position)} · ${a.text}`}</Text>
                <Text style={[styles.barShare, right && styles.barLabelRight, share === 0 && styles.barLabelNone]}>{`${share}%`}</Text>
              </View>
              <View style={[styles.track, right && styles.trackRight]}>
                {share > 0 && <View style={[styles.fill, { width: `${share}%`, backgroundColor: callTriviaColors.bars[i] }]} />}
                <View style={styles.faces}>
                  {pickers.slice(0, AVATARS).map((name, n) => (
                    <View key={`${name}-${n}`} style={[styles.faceEdge, n > 0 && styles.overlap]}>
                      <CallAvatar name={name} size={26} />
                    </View>
                  ))}
                </View>
              </View>
            </View>
          );
        })}
      </View>
      <View style={styles.grow} />
      {hostName !== null && (
        <HostButtons hostName={hostName}>
          {canExplain && (
            <TriviaButton
              gold
              height={60}
              label="Papa Dorin, explain it"
              onPress={onExplain}
              before={
                <View style={styles.face}>
                  <Image source={PAPA_DORIN} style={styles.dorin} contentFit="contain" />
                </View>
              }
            />
          )}
          <TriviaButton gold={!canExplain} height={canExplain ? 52 : 56} label={last ? 'See who won' : 'Next question'} onPress={onNext} after={<NextIcon color={canExplain ? text.onDark : call.ink} />} />
          <Pressable accessibilityRole="button" onPress={onEnd} style={styles.end}>
            <Text style={styles.endText}>End trivia</Text>
          </Pressable>
        </HostButtons>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flexGrow: 1, paddingTop: 8, paddingBottom: 12, gap: 14 },
  question: { fontFamily: fonts.extraBold, fontSize: 16, lineHeight: 22, color: text.onDarkSoft },
  bars: { gap: 10 },
  bar: { gap: 5 },
  barHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  barLabel: { flex: 1, fontFamily: fonts.extraBold, fontSize: 14, color: text.onDark },
  barLabelRight: { fontFamily: fonts.black },
  barLabelNone: { color: callTriviaColors.softer },
  barShare: { fontFamily: fonts.extraBold, fontSize: 14, color: text.onDark },
  track: { height: 34, borderRadius: 12, backgroundColor: callTriviaColors.track, overflow: 'hidden', justifyContent: 'center' },
  trackRight: { boxShadow: `inset 0 0 0 2px ${callTriviaColors.right}` },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  faces: { flexDirection: 'row', paddingLeft: 8 },
  faceEdge: { borderRadius: 15, borderWidth: 2, borderColor: callShowColors.ringDark },
  overlap: { marginLeft: -7 },
  grow: { flex: 1 },
  face: { width: 40, height: 40, borderRadius: 20, backgroundColor: call.dorinBack, alignItems: 'center', justifyContent: 'flex-end', overflow: 'hidden' },
  dorin: { width: 28, height: 44, marginBottom: -5 },
  end: { alignSelf: 'center', paddingVertical: 6, paddingHorizontal: 12 },
  endText: { fontFamily: fonts.extraBold, fontSize: 13.5, color: callTriviaColors.soft },
});
