// Trivia's winner, as in the call mockups (screen 8): "Mia wins!", the winner's avatar big under a crown with gold
// rays behind, a podium for the top three, everyone else listed with their scores, the line that Papa Dorin cheers
// the winner out loud, and for the host "Stay and talk" (back to the call screen) and "End the get-together".

import { Image } from 'expo-image';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { PAPA_DORIN } from '@/components/common/cookieArt';
import { call, callTriviaColors } from '@/theme/callColors';
import { text } from '@/theme/colors';
import { fonts } from '@/theme/text';
import type { TriviaScore, TriviaState } from '@/types/call';
import { CallAvatar } from './CallPerson';
import { CrownIcon, WinnerRays } from './TriviaIcons';
import { TriviaButton, TriviaHeader } from './TriviaParts';

/** Props for the winner screen. */
type TriviaWinnerProps = {
  /** The game, at its end. */
  game: TriviaState;
  /** The identity of the person holding this phone (shown as "You"). */
  me: string;
  /** True for the host, who gets "Stay and talk". */
  isHost: boolean;
  /** Host: ends the game and goes back to the call screen. */
  onStay: () => void;
  /** Host: ends the get-together for everyone. */
  onEndCall: () => void;
};

/** What the heading says: "Mia wins!", or a tie when the top scores match. */
function headline(scores: TriviaScore[], me: string): string {
  const top = scores.filter((s) => s.score === scores[0]?.score);
  if (!scores.length) return 'Thanks for playing!';
  if (top.length > 1) return 'It’s a tie!';
  return top[0].identity === me ? 'You win!' : `${top[0].name} wins!`;
}

/** The winner screen. */
export function TriviaWinner({ game, me, isHost, onStay, onEndCall }: TriviaWinnerProps) {
  const scores = game.scores;
  const nameOf = (s: TriviaScore) => (s.identity === me ? 'You' : s.name);
  const [first, second, third] = scores;
  return (
    <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
      <TriviaHeader game={game} centered>
        <Text style={styles.wins} accessibilityRole="header">
          {headline(scores, me)}
        </Text>
      </TriviaHeader>
      {first && (
        <View style={styles.stage}>
          <View style={styles.rays}>
            <WinnerRays color={call.talking} sparkle={text.goldNote} />
          </View>
          <View style={styles.winner}>
            <CallAvatar name={first.name} size={132} />
            <View style={styles.crown}>
              <CrownIcon color={call.talking} edge={call.joinShadow} />
            </View>
          </View>
        </View>
      )}
      <View style={styles.podium}>
        {second && <Step place={2} score={second} label={nameOf(second)} />}
        {first && <Step place={1} score={first} label={nameOf(first)} />}
        {third && <Step place={3} score={third} label={nameOf(third)} />}
      </View>
      {scores.length > 3 && (
        <View style={styles.rest}>
          {scores.slice(3).map((s, i) => (
            <View key={s.identity} style={styles.restRow}>
              <Text style={styles.restPlace}>{i + 4}</Text>
              <Text style={styles.restName} numberOfLines={1}>
                {nameOf(s)}
              </Text>
              <Text style={styles.restScore}>{s.score}</Text>
            </View>
          ))}
        </View>
      )}
      <View style={styles.cheer}>
        <View style={styles.cheerFace}>
          <Image source={PAPA_DORIN} style={styles.cheerDorin} contentFit="contain" />
        </View>
        <Text style={styles.cheerText}>Papa Dorin cheers the winner out loud.</Text>
      </View>
      <View style={styles.grow} />
      {isHost && <TriviaButton gold height={56} label="Stay and talk" onPress={onStay} />}
      {isHost && <TriviaButton height={48} label="End the get-together" onPress={onEndCall} />}
    </ScrollView>
  );
}

/** Props for one podium step. */
type StepProps = {
  /** 1, 2 or 3. */
  place: number;
  /** Their score. */
  score: TriviaScore;
  /** Their name as shown ("You" for this person). */
  label: string;
};

/** A podium step: an avatar on top (not for 1st, who is up in the rays), the place, and "Mom · 600". */
function Step({ place, score, label }: StepProps) {
  const winner = place === 1;
  return (
    <View style={[styles.step, { width: winner ? 112 : 104 }]}>
      {!winner && <CallAvatar name={score.name} size={48} />}
      <View style={[styles.block, STEP_LOOKS[place - 1]]}>
        <Text style={[styles.place, winner && styles.inkText, { fontSize: winner ? 24 : place === 2 ? 20 : 18 }]}>{place}</Text>
        <Text style={[styles.stepName, winner && styles.winnerName]} numberOfLines={1}>{`${label} · ${score.score}`}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flexGrow: 1, paddingTop: 8, paddingBottom: 12, gap: 14 },
  wins: { fontFamily: fonts.black, fontSize: 32, lineHeight: 38, color: text.onDark, textAlign: 'center' },
  stage: { height: 210, alignItems: 'center', justifyContent: 'center' },
  rays: { position: 'absolute', top: 0 },
  winner: { width: 132, height: 132, borderRadius: 66, boxShadow: `0 0 0 5px ${call.page}, 0 0 0 11px ${call.talking}, 0 0 50px 16px ${callTriviaColors.pickGlow}` },
  crown: { position: 'absolute', top: -36, left: 39 },
  podium: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 8 },
  step: { alignItems: 'center', gap: 6 },
  block: { width: '100%', borderTopLeftRadius: 14, borderTopRightRadius: 14, borderBottomLeftRadius: 6, borderBottomRightRadius: 6, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  place: { fontFamily: fonts.black, color: text.onDark },
  inkText: { color: call.ink },
  stepName: { fontFamily: fonts.extraBold, fontSize: 12.5, color: text.onDark },
  winnerName: { fontFamily: fonts.black, fontSize: 13, color: call.ink },
  rest: { gap: 6, borderRadius: 18, backgroundColor: call.glassFillSoft, paddingVertical: 10, paddingHorizontal: 14 },
  restRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  restPlace: { width: 18, fontFamily: fonts.extraBold, fontSize: 14, color: callTriviaColors.soft },
  restName: { flex: 1, fontFamily: fonts.extraBold, fontSize: 14, color: text.onDark },
  restScore: { fontFamily: fonts.extraBold, fontSize: 14, color: text.onDark },
  grow: { flex: 1 },
  cheer: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cheerFace: { width: 36, height: 36, borderRadius: 18, backgroundColor: call.dorinBack, alignItems: 'center', justifyContent: 'flex-end', overflow: 'hidden' },
  cheerDorin: { width: 24, height: 40, marginBottom: -5 },
  cheerText: { flex: 1, fontFamily: fonts.bold, fontSize: 13, color: callTriviaColors.soft },
});

/** Each step's height and fill: 1st tall and gold, 2nd and 3rd glass. */
const STEP_LOOKS = [
  { height: 100, backgroundColor: call.talking, boxShadow: `0 0 24px ${call.talkingGlow}` },
  { height: 70, backgroundColor: callTriviaColors.podiumSecond },
  { height: 50, backgroundColor: callTriviaColors.podiumThird },
];
