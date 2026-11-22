// A lesson together, one card at a time, as in the call mockups (screens B, C and D). Story cards show Papa Dorin's
// speech bubble; on a question everyone picks on their own phone, the host checks it and everyone sees the result
// sheet with who picked what. The host can have Papa Dorin read the answer's explanation to everyone, and once a
// question is answered anyone can hold to ask him something; his answer docks at the bottom over the paused card.

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LoadState } from '@/components/common/LoadState';
import { playSound } from '@/components/common/sounds';
import { rightAnswerOf } from '@/data/callContent';
import { useCallLesson, useCallOutlines } from '@/data/queries/call';
import { call } from '@/theme/callColors';
import { text } from '@/theme/colors';
import { answerColors, explainColors } from '@/theme/lessonColors';
import { gutter } from '@/theme/spacing';
import { fonts } from '@/theme/text';
import { HOST_PREFIX, type LessonShowState } from '@/types/call';
import { LessonAskPill } from './LessonAskPill';
import { LessonChoice } from './LessonChoice';
import { phaseOf } from './LessonDorinAnswer';
import { LessonExplain } from './LessonExplain';
import { cardAt, isRightPick, nextShow, pickSize, reactionFor } from './lessonFlow';
import { LessonPaused } from './LessonPaused';
import { usePicks } from './lessonPicks';
import { askToRead, useReading } from './lessonReading';
import { LessonResult } from './LessonResult';
import { LessonStory } from './LessonStory';
import { LessonTop } from './LessonTop';
import { useLocalParticipant, useRoomContext } from './livekit';
import type { ShowProps } from './showProps';
import { useTalkers } from './verseTalkers';

/** No explanation yet. */
const NO_WORDS: string[] = [];

/** A lesson together, one card at a time, as in the call mockups (screens B, C and D). */
export function LessonShow({ show, isHost, setShow, people, me, dorin }: ShowProps<LessonShowState>) {
  const insets = useSafeAreaInsets();
  const lk = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const lesson = useCallLesson(show.passageId);
  const lessonTitle = useCallOutlines().data?.find((l) => l.id === show.passageId)?.title ?? '';
  const talkers = useTalkers();
  const hostName = people.find((p) => p.identity.startsWith(HOST_PREFIX))?.name || 'The host';
  const phase = phaseOf(dorin);
  const found = lesson.data ? cardAt(lesson.data, show) : null;
  const choice = found?.card.kind === 'choice' ? found.card : null;
  const { picks, send } = usePicks(show, people);
  const right = useQuery({
    queryKey: ['call', 'right', show.passageId, show.stop, show.card],
    queryFn: () => rightAnswerOf(choice!),
    enabled: !!choice,
    staleTime: Infinity,
  });
  const rightIds = right.data?.rightIds ?? [];
  const reading = useReading(right.data?.explanation ?? NO_WORDS, dorin, show.step === 'explain');
  const [problem, setProblem] = useState('');

  // This person's pick on the card showing, started again on each new card (from their attribute after a rejoin).
  const cardKey = `${show.passageId}.${show.stop}.${show.card}.${choice ? 'ready' : 'loading'}`;
  const fresh = () => picks.get(me) ?? Array<number | null>(choice ? pickSize(choice) : 1).fill(null);
  const [mine, setMine] = useState(() => ({ key: cardKey, picks: fresh() }));
  if (mine.key !== cardKey) setMine({ key: cardKey, picks: fresh() });
  const myPick = mine.picks.every((p) => p !== null) ? (mine.picks as number[]) : null;

  /** This person picks: kept here, and sent to everyone once every blank is filled. */
  const choose = (next: (number | null)[]) => {
    setMine({ key: cardKey, picks: next });
    send(next.every((p) => p !== null) ? (next as number[]) : []);
  };
  /** The host goes on to the next card (or back to the call screen after the last one). */
  const goOn = () => {
    if (lesson.data) setShow(nextShow(lesson.data, show));
  };
  /** The host has Papa Dorin read the answer's explanation to everyone. */
  const explain = () => {
    setProblem('');
    setShow({ ...show, step: 'explain' });
    askToRead(lk, show).catch((e: unknown) => setProblem(e instanceof Error ? `${e.message} Tap Continue lesson to go on.` : 'Papa Dorin could not read it.'));
  };
  /** The host ends the lesson for everyone. */
  const end = () => {
    playSound('tap');
    setShow({ kind: 'lobby' });
  };

  // The call's buttons are in the lesson's top row, so nothing sits under the lesson.
  const bottom = insets.bottom;
  const top = (cream: boolean) => (
    <View style={styles.topRow}>
      <View style={styles.flex}>
        <LessonTop people={people} talking={talkers.now} cream={cream} line={cream && reading.started && !reading.done ? 'Everyone else turned down' : undefined} />
      </View>
      {isHost && (
        <Pressable accessibilityRole="button" onPress={end} style={[styles.end, cream && styles.endCream]}>
          <Text style={[styles.endText, cream && styles.endTextCream]}>End lesson</Text>
        </Pressable>
      )}
    </View>
  );

  if (!lesson.data || !found) {
    return (
      <View style={[styles.page, { paddingBottom: bottom + 14 }]}>
        {top(false)}
        <View style={styles.middle}>
          {lesson.data ? <Text style={styles.note}>This card isn’t in the lesson.</Text> : <LoadState failed={lesson.isError} onRetry={() => void lesson.refetch()} />}
        </View>
      </View>
    );
  }

  const heading = <Text style={styles.heading} numberOfLines={1}>{`Lesson together · ${lessonTitle}`}</Text>;

  // A story card: everyone reads Papa Dorin's words; only the host moves on.
  if (found.card.kind === 'story') {
    return (
      <View style={[styles.page, { paddingBottom: bottom + 14 }]}>
        {top(false)}
        {heading}
        <LessonStory card={found.card} />
        <View style={styles.flex} />
        <LessonAskPill look="dark" enabled={false} title="Hold to ask Papa Dorin" line="Opens once a question is answered" dorin={dorin} phase={phase} me={localParticipant} />
        <HostNext isHost={isHost} hostName={hostName} label="CONTINUE" onPress={goOn} />
      </View>
    );
  }

  const card = found.card;
  const answered = show.step !== 'card';
  // Who picked each answer, and how many got it right.
  const pickers = new Map<number, string[]>();
  let gotIt = 0;
  for (const p of people) {
    const answers = picks.get(p.identity);
    if (!answers) continue;
    if (isRightPick(card, rightIds, answers)) gotIt += 1;
    for (const id of new Set(answers)) pickers.set(id, [...(pickers.get(id) ?? []), p.name || 'Guest']);
  }
  const answeringNow = (phase === 'thinking' || phase === 'talking') && (show.step === 'result' || (show.step === 'explain' && reading.done));

  // Screen D: Papa Dorin answers someone; the answered card waits, with his answer docked under it.
  if (answeringNow) {
    return (
      <View style={[styles.page, { paddingBottom: bottom + 14 }]}>
        <LessonPaused lessonTitle={lessonTitle} card={card} mine={myPick ?? []} rightIds={rightIds} pickers={pickers} dorin={dorin} phase={phase} me={localParticipant} people={people} />
      </View>
    );
  }

  // Screen C: he reads the explanation to everyone.
  if (show.step === 'explain') {
    return (
      <View style={[styles.page, styles.cream, { paddingBottom: bottom + 14 }]}>
        <LessonExplain reading={reading} problem={isHost ? problem : ''} isHost={isHost} hostName={hostName} onContinue={goOn} top={top(true)} dorin={dorin} phase={phase} me={localParticipant} />
      </View>
    );
  }

  // Screen B: the question, picking, then the result sheet.
  const mineRight = myPick ? isRightPick(card, rightIds, myPick) : null;
  const rightText = rightIds.map((id) => card.answers.find((a) => a.id === id)?.text ?? '').join(' · ');
  const answeredLine = `${picks.size} of ${people.length} answered`;
  return (
    <View style={[styles.page, { paddingBottom: answered ? bottom : bottom + 14 }]}>
      {top(false)}
      {heading}
      <LessonChoice card={card} mode={answered ? 'result' : 'pick'} mine={mine.picks} onPick={choose} rightIds={rightIds} pickers={answered ? pickers : undefined} />
      <View style={styles.flex} />
      <LessonAskPill
        look="dark"
        enabled={answered}
        title="Hold to ask Papa Dorin"
        line={answered ? 'Ask him about this question' : 'Opens once everyone has answered'}
        dorin={dorin}
        phase={phase}
        me={localParticipant}
      />
      {answered ? (
        <LessonResult
          right={mineRight}
          reaction={mineRight === null ? 'Here’s the answer' : reactionFor(show, mineRight)}
          tally={picks.size === 0 ? 'Nobody answered' : `${gotIt} of ${picks.size} got it`}
          rightText={rightText}
          verses={card.verses}
          isHost={isHost}
          hostName={hostName}
          canExplain={(right.data?.explanation.length ?? 0) > 0}
          onExplain={explain}
          onContinue={goOn}
        />
      ) : isHost ? (
        <View style={styles.hostArea}>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              playSound('tap');
              setShow({ ...show, step: 'result' });
            }}
            style={({ pressed }) => [styles.check, pressed && styles.pressed]}
          >
            <Text style={styles.goText}>CHECK</Text>
          </Pressable>
          <Text style={styles.only}>{answeredLine}</Text>
        </View>
      ) : (
        <Text style={styles.only}>{`${answeredLine} · ${hostName} checks the answer`}</Text>
      )}
    </View>
  );
}

/** Props for the host's go-on button under a story card. */
type HostNextProps = {
  /** True for the host, who gets the button. */
  isHost: boolean;
  /** The host's name, for the note under it. */
  hostName: string;
  /** The button's words. */
  label: string;
  /** Goes on. */
  onPress: () => void;
};

/** The host's blue go-on button, or for everyone else who moves the lesson along. */
function HostNext({ isHost, hostName, label, onPress }: HostNextProps) {
  if (!isHost) return <Text style={styles.only}>{`${hostName} moves the lesson along`}</Text>;
  return (
    <View style={styles.hostArea}>
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          playSound('tap');
          onPress();
        }}
        style={({ pressed }) => [styles.next, pressed && styles.pressed]}
      >
        <Text style={styles.goText}>{label}</Text>
      </Pressable>
      <Text style={styles.only}>{`Only ${hostName} sees this button`}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, paddingHorizontal: gutter, paddingTop: 8, gap: 12, width: '100%', maxWidth: 560, alignSelf: 'center' },
  cream: { maxWidth: undefined, paddingHorizontal: gutter + 2, backgroundColor: explainColors.page },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flex: { flex: 1 },
  end: { height: 42, borderRadius: 21, borderWidth: 1, borderColor: call.glassEdge, backgroundColor: call.glassFill, paddingHorizontal: 14, justifyContent: 'center' },
  endCream: { borderColor: explainColors.edge, backgroundColor: explainColors.card },
  endText: { fontFamily: fonts.extraBold, fontSize: 13, color: text.onDark },
  endTextCream: { color: explainColors.ink },
  heading: { fontFamily: fonts.extraBold, fontSize: 13, color: text.onDarkSoft },
  middle: { flex: 1, justifyContent: 'center' },
  note: { fontFamily: fonts.bold, fontSize: 15, color: text.onDarkSoft, textAlign: 'center' },
  hostArea: { gap: 6 },
  check: { borderRadius: 16, paddingVertical: 15, alignItems: 'center', backgroundColor: answerColors.check, boxShadow: `0 4px 0 ${answerColors.checkShadow}` },
  next: { borderRadius: 16, paddingVertical: 15, alignItems: 'center', backgroundColor: explainColors.button, boxShadow: `0 4px 0 ${explainColors.buttonShadow}` },
  goText: { fontFamily: fonts.black, fontSize: 17, letterSpacing: 0.8, color: text.onDark },
  only: { textAlign: 'center', fontFamily: fonts.extraBold, fontSize: 11.5, color: text.onDarkSoft },
  pressed: { transform: [{ translateY: 3 }] },
});
