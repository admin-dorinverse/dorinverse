// Papa Dorin explaining a trivia answer, as in the call mockups (screen 7): the right answer, Papa Dorin big with
// a gold ring and sound bars, "Explaining", his words as he says them, the verse card with its BSB words, and a
// reminder that anyone can hold his picture afterwards to ask more. The host gets "Next question" and "Stop Papa Dorin".

import { Image } from 'expo-image';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { PAPA_DORIN } from '@/components/common/cookieArt';
import { call, callTriviaColors } from '@/theme/callColors';
import { text } from '@/theme/colors';
import { fonts } from '@/theme/text';
import type { TriviaState } from '@/types/call';
import { MicIcon } from './CallIcons';
import { NextIcon, StopIcon } from './TriviaIcons';
import { HostButtons, RightAnswer, TriviaButton, TriviaHeader } from './TriviaParts';
import type { CallWords } from './useCallWords';

/** Props for the explaining screen. */
type TriviaExplainProps = {
  /** The game, while he explains. */
  game: TriviaState;
  /** His words as he says them. */
  words: CallWords;
  /** The host's name, or null for everyone but the host (who then gets no buttons). */
  hostName: string | null;
  /** Host: next question (or the winner after the last). */
  onNext: () => void;
  /** Host: stops him explaining. */
  onStop: () => void;
};

/** The explaining screen. */
export function TriviaExplain({ game, words, hostName, onNext, onStop }: TriviaExplainProps) {
  const last = game.index >= game.total;
  // His words from before this screen (the question he read) stay hidden until his explanation starts.
  const [before] = useState(words);
  const fresh = words.saidNow !== before.saidNow || words.saidBefore !== before.saidBefore;
  return (
    <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
      <TriviaHeader game={game} />
      <RightAnswer game={game} />
      <View style={styles.dorinRow}>
        <View style={styles.faceWrap}>
          <View style={styles.face}>
            <Image source={PAPA_DORIN} style={styles.dorin} contentFit="contain" accessibilityLabel="Papa Dorin" />
          </View>
          <View style={styles.badge}>
            <View style={[styles.bar, { height: 8 }]} />
            <View style={[styles.bar, { height: 14 }]} />
            <View style={[styles.bar, { height: 10 }]} />
          </View>
        </View>
        <View style={styles.dorinWords}>
          <Text style={styles.name}>Papa Dorin</Text>
          <Text style={styles.chip}>Explaining</Text>
          <Text style={styles.hears}>Everyone on the call hears him</Text>
        </View>
      </View>
      {fresh && (words.saidBefore !== '' || words.saidNow !== '') && (
        <View style={styles.saying} accessibilityLiveRegion="polite">
          <Text style={styles.sayingLabel}>WHAT HE’S SAYING</Text>
          <Text style={styles.said}>
            {words.saidBefore !== '' && <Text style={styles.saidBefore}>{`${words.saidBefore} `}</Text>}
            {words.saidNow}
          </Text>
        </View>
      )}
      {game.verseText && (
        <View style={styles.verse}>
          <Text style={styles.verseLabel}>{`${(game.verses ?? '').toUpperCase()} · BSB`}</Text>
          <Text style={styles.verseWords}>{game.verseText}</Text>
        </View>
      )}
      <View style={styles.curious}>
        <MicIcon color={text.goldNote} size={16} />
        <Text style={styles.curiousText}>Curious? Hold his picture after he’s done to ask more.</Text>
      </View>
      <View style={styles.grow} />
      {hostName !== null && (
        <HostButtons hostName={hostName}>
          <TriviaButton gold height={56} label={last ? 'See who won' : 'Next question'} onPress={onNext} after={<NextIcon color={call.ink} />} />
          <TriviaButton height={44} label="Stop Papa Dorin" onPress={onStop} before={<StopIcon color={text.onDark} />} />
        </HostButtons>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flexGrow: 1, paddingTop: 8, paddingBottom: 12, gap: 12 },
  dorinRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  faceWrap: { width: 88, height: 88, flexShrink: 0 },
  face: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: call.dorinBack,
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'hidden',
    boxShadow: `0 0 0 4px ${call.page}, 0 0 0 8px ${call.talking}, 0 0 34px 10px ${call.talkingGlow}`,
  },
  dorin: { width: 58, height: 92, marginBottom: -11 },
  badge: { position: 'absolute', right: -4, bottom: -2, width: 30, height: 30, borderRadius: 15, backgroundColor: call.talking, boxShadow: `0 0 0 3px ${call.page}`, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2 },
  bar: { width: 3, borderRadius: 2, backgroundColor: call.ink },
  dorinWords: { flex: 1, gap: 6, alignItems: 'flex-start' },
  name: { fontFamily: fonts.black, fontSize: 19, color: text.onDark },
  chip: { borderRadius: 999, overflow: 'hidden', paddingVertical: 4, paddingHorizontal: 10, backgroundColor: call.talking, fontFamily: fonts.black, fontSize: 11.5, color: call.ink },
  hears: { fontFamily: fonts.bold, fontSize: 12.5, color: callTriviaColors.softer },
  saying: { borderRadius: 20, borderWidth: 1, borderColor: callTriviaColors.cardEdge, backgroundColor: callTriviaColors.card, paddingVertical: 14, paddingHorizontal: 16, gap: 6 },
  sayingLabel: { fontFamily: fonts.extraBold, fontSize: 11.5, letterSpacing: 1.1, color: text.goldNote },
  said: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 23, color: text.onDark },
  saidBefore: { color: call.saidBefore },
  verse: { borderRadius: 18, backgroundColor: callTriviaColors.verseFill, paddingVertical: 12, paddingHorizontal: 14, gap: 5 },
  verseLabel: { fontFamily: fonts.extraBold, fontSize: 11, letterSpacing: 1.1, color: callTriviaColors.soft },
  verseWords: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: callTriviaColors.verseWords },
  curious: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  curiousText: { flex: 1, fontFamily: fonts.bold, fontSize: 12.5, color: callTriviaColors.softer },
  grow: { flex: 1 },
});
