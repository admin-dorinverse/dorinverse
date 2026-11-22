// Trivia hosted by Papa Dorin, as in the call mockups (screens 5 to 8). Everyone's screen follows the game his
// program publishes: the question while he reads it and everyone answers, the results, his explanation, and the
// winner. The host's phone brings him in and starts the game; only the host moves it along. Once the answer is
// out, anyone can hold to ask Papa Dorin something (never while a question is open, so nobody gets the answer
// early); while a question is open, that space goes to the question so nothing sits behind the call's buttons.

import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PAPA_DORIN } from '@/components/common/cookieArt';
import { call, callTriviaColors } from '@/theme/callColors';
import { text } from '@/theme/colors';
import { gutter } from '@/theme/spacing';
import { fonts } from '@/theme/text';
import { HOST_PREFIX, type TriviaShowState } from '@/types/call';
import { LessonDorinAnswer, phaseOf } from './LessonDorinAnswer';
import { LessonAskPill } from './LessonAskPill';
import { useLocalParticipant } from './livekit';
import type { ShowProps } from './showProps';
import { TriviaExplain } from './TriviaExplain';
import { TriviaQuestion } from './TriviaQuestion';
import { TriviaResults } from './TriviaResults';
import { TriviaWinner } from './TriviaWinner';
import { EXPLAIN_SHOWN, useTriviaGame } from './useTriviaGame';
import { CONTROLS_HEIGHT } from './VerseShow';

/** Trivia hosted by Papa Dorin, as in the call mockups (screens 5 to 8). */
export function TriviaShow({ show, isHost, setShow, people, me, dorin, onEndCall }: ShowProps<TriviaShowState>) {
  const trivia = useTriviaGame(show.passageId, isHost);
  const { game } = trivia;
  const hostName = people.find((p) => p.identity.startsWith(HOST_PREFIX))?.name || 'the host';
  const score = game?.scores.find((s) => s.identity === me)?.score ?? 0;
  const insets = useSafeAreaInsets();
  const { localParticipant } = useLocalParticipant();
  // Asking him opens once the answer is out: on the results, his explanation, and the winner.
  const canAsk = !!game && game.phase !== 'reading' && game.phase !== 'answering';
  // Room under the screens for the call's buttons and the phone's own bottom bar.
  const underButtons = insets.bottom + CONTROLS_HEIGHT + 8;
  const phase = phaseOf(dorin);
  // His answer to someone's question docks above the ask button (his explanation has its own screen).
  const answeringSomeone = canAsk && game?.phase !== 'explaining' && (phase === 'thinking' || phase === 'talking');

  /** Host: ends the game for everyone and goes back to the call screen. */
  const backToEveryone = () => {
    void trivia.end().finally(() => setShow({ kind: 'lobby' }));
  };

  const glow = game?.phase === 'winner' ? styles.winnerGlow : game?.phase === 'explaining' ? styles.explainGlow : null;
  return (
    <View style={styles.page}>
      {glow && <View style={[StyleSheet.absoluteFill, glow]} />}
      <View style={[styles.content, !canAsk && { paddingBottom: underButtons }]}>
        {!game && <Waiting here={trivia.here} note={trivia.note} isHost={isHost} onBack={backToEveryone} />}
        {game && (game.phase === 'reading' || game.phase === 'answering') && (
          <TriviaQuestion game={game} score={score} myPick={trivia.myPick} onPick={trivia.choose} people={people} onShowNow={isHost ? trivia.closeNow : null} />
        )}
        {game?.phase === 'results' && (
          <TriviaResults game={game} hostName={isHost ? hostName : null} canExplain={EXPLAIN_SHOWN} onExplain={trivia.explain} onNext={trivia.next} onEnd={backToEveryone} />
        )}
        {game?.phase === 'explaining' && <TriviaExplain game={game} words={dorin.words} hostName={isHost ? hostName : null} onNext={trivia.next} onStop={trivia.stopExplaining} />}
        {game?.phase === 'winner' && <TriviaWinner game={game} me={me} isHost={isHost} onStay={backToEveryone} onEndCall={onEndCall} />}
      </View>
      {canAsk && (
        <View style={[styles.ask, { paddingBottom: underButtons }]}>
          {answeringSomeone && <LessonDorinAnswer dorin={dorin} phase={phase} me={localParticipant} />}
          <LessonAskPill
            look="dark"
            enabled={canAsk}
            title="Hold to ask Papa Dorin"
            line={canAsk ? 'Anything about this question' : 'Opens once the answer is shown'}
            dorin={dorin}
            phase={phase}
            me={localParticipant}
          />
        </View>
      )}
    </View>
  );
}

/** Props for the waiting screen. */
type WaitingProps = {
  /** True once Papa Dorin is on the call. */
  here: boolean;
  /** What went wrong, if anything. */
  note: string;
  /** True for the host, who can go back. */
  isHost: boolean;
  /** Host: back to the call screen. */
  onBack: () => void;
};

/** Before the first question: Papa Dorin on his way, or getting the questions ready. */
function Waiting({ here, note, isHost, onBack }: WaitingProps) {
  return (
    <View style={styles.waiting}>
      <View style={styles.face}>
        <Image source={PAPA_DORIN} style={styles.dorin} contentFit="contain" accessibilityLabel="Papa Dorin" />
      </View>
      <Text style={styles.waitingText}>{note || (here ? 'Papa Dorin is getting the questions ready…' : 'Papa Dorin is on his way…')}</Text>
      {isHost && (
        <Pressable accessibilityRole="button" onPress={onBack} style={styles.back}>
          <Text style={styles.backText}>Back to everyone</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  content: { flex: 1, paddingHorizontal: gutter, width: '100%', maxWidth: 560, alignSelf: 'center' },
  ask: { gap: 10, paddingHorizontal: gutter, paddingTop: 6, width: '100%', maxWidth: 560, alignSelf: 'center' },
  explainGlow: { backgroundImage: `radial-gradient(120% 70% at 50% 20%, ${call.dorinGlow} 0%, ${call.pageGlow[1]} 55%, ${call.pageGlow[2]} 100%)` },
  winnerGlow: { backgroundImage: `radial-gradient(90% 55% at 50% 30%, ${callTriviaColors.winnerGlow} 0%, ${call.pageGlow[0]} 45%, ${call.pageGlow[2]} 100%)` },
  waiting: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingBottom: 110 },
  face: { width: 88, height: 88, borderRadius: 44, backgroundColor: call.dorinBack, alignItems: 'center', justifyContent: 'flex-end', overflow: 'hidden' },
  dorin: { width: 58, height: 92, marginBottom: -11 },
  waitingText: { fontFamily: fonts.bold, fontSize: 15, color: text.onDarkSoft, textAlign: 'center' },
  back: { borderRadius: 999, borderWidth: 1, borderColor: call.glassEdge, backgroundColor: call.glassFill, paddingVertical: 10, paddingHorizontal: 16 },
  backText: { fontFamily: fonts.extraBold, fontSize: 14, color: text.onDark },
});
