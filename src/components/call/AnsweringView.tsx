// The call while Papa Dorin answers, as in the call mockups' "He answers on the call" screen: Papa Dorin big with a
// gold ring and sound bars, "Answering Jordan", the question in Jordan's bubble, his words as he says them (what he
// already said softer, the part he's saying now bright), and everyone in a small row, turned down while he talks.

import { Image } from 'expo-image';
import type { Participant } from 'livekit-client';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { PAPA_DORIN } from '@/components/common/cookieArt';
import { call } from '@/theme/callColors';
import { text } from '@/theme/colors';
import { gutter } from '@/theme/spacing';
import { fonts } from '@/theme/text';
import { SpeakerIcon } from './CallIcons';
import { CallAvatar } from './CallPerson';
import { CallHeader } from './CallHeader';
import { PeopleRow } from './PeopleRow';
import { StopDorinButton } from './StopDorinButton';
import type { PapaDorin } from './usePapaDorin';
import type { CallWords } from './useCallWords';

/** Props for the answering screen. */
type AnsweringViewProps = {
  /** The get-together's name. */
  title: string;
  /** How many are on the call. */
  count: number;
  /** True while he thinks, before his first words. */
  thinking: boolean;
  /** Who asked him. */
  asker: Participant | undefined;
  /** The identity of the person holding this phone. */
  me: string;
  /** The question and his answer so far. */
  words: CallWords;
  /** Everyone on the call except him. */
  people: Participant[];
  /** Papa Dorin, for the Stop button (the person he's answering, or the host). */
  dorin: PapaDorin;
};

/** At most this much of what he already said stays on screen, so the part he's saying now always shows. */
const BEFORE_MAX = 220;

/** The end of what he already said, cut at a word. */
function lastPart(said: string): string {
  if (said.length <= BEFORE_MAX) return said;
  const cut = said.slice(-BEFORE_MAX);
  return `…${cut.slice(cut.indexOf(' ') + 1)}`;
}

/** The answering screen. */
export function AnsweringView({ title, count, thinking, asker, me, words, people, dorin }: AnsweringViewProps) {
  const name = asker ? (asker.identity === me ? 'you' : asker.name || 'Guest') : '';
  const before = lastPart(words.saidBefore);
  return (
    <View style={styles.page}>
      <CallHeader title={title} count={count} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.middle}>
          <View style={styles.faceWrap}>
            <View style={styles.face}>
              <Image source={PAPA_DORIN} style={styles.dorin} contentFit="contain" />
            </View>
            {!thinking && (
              <View style={styles.badge} accessibilityLabel="Talking">
                <View style={[styles.bar, { height: 9 }]} />
                <View style={[styles.bar, { height: 17 }]} />
                <View style={[styles.bar, { height: 12 }]} />
              </View>
            )}
          </View>
          <View style={styles.nameRow}>
            <Text style={styles.name}>Papa Dorin</Text>
            <Text style={styles.chip}>{thinking ? 'Thinking…' : name ? `Answering ${name}` : 'Talking'}</Text>
            <StopDorinButton dorin={dorin} />
          </View>
        </View>
        {asker && words.heard !== '' && (
          <View style={styles.asked}>
            <CallAvatar name={asker.name || 'Guest'} size={32} />
            <View style={styles.askedBubble}>
              <Text style={styles.askedLabel}>{`${(asker.identity === me ? 'You' : asker.name || 'Guest').toUpperCase()} ASKED`}</Text>
              <Text style={styles.askedText}>{`“${words.heard}”`}</Text>
            </View>
          </View>
        )}
        {(before !== '' || words.saidNow !== '') && (
          <View style={styles.saying} accessibilityLiveRegion="polite">
            <Text style={styles.sayingLabel}>WHAT HE’S SAYING</Text>
            <Text style={styles.said}>
              {before !== '' && <Text style={styles.saidBefore}>{`${before} `}</Text>}
              {words.saidNow}
            </Text>
          </View>
        )}
      </ScrollView>
      <View style={styles.turnedDown}>
        <SpeakerIcon color={text.onDarkSoft} size={16} off />
        <Text style={styles.turnedDownText}>Everyone else is turned down while he talks</Text>
      </View>
      <PeopleRow people={people} me={me} />
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    paddingHorizontal: gutter,
    paddingTop: 8,
    paddingBottom: 96,
    gap: 12,
    backgroundColor: call.page,
    backgroundImage: `radial-gradient(120% 70% at 50% 25%, ${call.dorinGlow} 0%, ${call.pageGlow[1]} 55%, ${call.pageGlow[2]} 100%)`,
  },
  scroll: { gap: 14, paddingTop: 4 },
  middle: { alignItems: 'center', gap: 10 },
  faceWrap: { width: 148, height: 148 },
  face: {
    width: 148,
    height: 148,
    borderRadius: 74,
    borderWidth: 5,
    borderColor: call.talking,
    backgroundColor: call.dorinBack,
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'hidden',
    boxShadow: `0 0 46px 14px ${call.talkingGlow}`,
  },
  dorin: { width: 96, height: 152, marginBottom: -18 },
  badge: { position: 'absolute', right: 2, bottom: 2, width: 36, height: 36, borderRadius: 18, borderWidth: 3, borderColor: call.page, backgroundColor: call.talking, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2.5 },
  bar: { width: 3.5, borderRadius: 2, backgroundColor: call.ink },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { fontFamily: fonts.black, fontSize: 19, color: text.onDark },
  chip: { borderRadius: 999, overflow: 'hidden', paddingVertical: 4, paddingHorizontal: 10, backgroundColor: call.talking, fontFamily: fonts.black, fontSize: 11.5, color: call.ink },
  asked: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  askedBubble: { flex: 1, borderRadius: 16, borderTopLeftRadius: 4, borderWidth: 1, borderColor: call.listeningEdge, backgroundColor: call.listeningFill, paddingVertical: 8, paddingHorizontal: 12, gap: 2 },
  askedLabel: { fontFamily: fonts.extraBold, fontSize: 11, letterSpacing: 1, color: call.listening },
  askedText: { fontFamily: fonts.bold, fontSize: 15, lineHeight: 21, color: text.onDark },
  saying: { borderRadius: 20, borderWidth: 1, borderColor: call.wordsEdge, backgroundColor: call.glassFill, paddingVertical: 14, paddingHorizontal: 16, gap: 6 },
  sayingLabel: { fontFamily: fonts.extraBold, fontSize: 11.5, letterSpacing: 1.1, color: text.goldNote },
  said: { fontFamily: fonts.bold, fontSize: 17, lineHeight: 25, color: text.onDark },
  saidBefore: { color: call.saidBefore },
  turnedDown: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  turnedDownText: { fontFamily: fonts.bold, fontSize: 12.5, color: text.onDarkSoft },
});
