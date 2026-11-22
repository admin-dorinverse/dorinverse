// Papa Dorin docked at the bottom of a shown verse or lesson, as in the call mockups' "He answers during a lesson":
// a gold glass box with his picture and sound bars, "Answering Mia", her question in her color, and his words as he
// says them (what he already said softer). While someone holds to ask, the same box turns blue and shows what he
// hears. What's on screen above it stays put. Also holds his small round picture, used across these screens.

import { Image } from 'expo-image';
import type { Participant } from 'livekit-client';
import { StyleSheet, Text, View } from 'react-native';
import { PAPA_DORIN } from '@/components/common/cookieArt';
import { call, callShowColors as show } from '@/theme/callColors';
import { text } from '@/theme/colors';
import { fonts } from '@/theme/text';
import { CallAvatar, colorOf } from './CallPerson';
import { StopDorinButton } from './StopDorinButton';
import type { PapaDorin } from './usePapaDorin';

/** What Papa Dorin is doing with a question: nothing, hearing it, thinking about it, or answering it out loud. */
export type DorinPhase = 'none' | 'asking' | 'thinking' | 'talking';

/** The phase, from his status and whether this person holds his picture. */
export function phaseOf(dorin: PapaDorin): DorinPhase {
  const asking = dorin.status === 'coming' ? dorin.holding : dorin.status === 'listening';
  if (asking) return 'asking';
  if (dorin.status === 'thinking') return 'thinking';
  if (dorin.status === 'talking') return 'talking';
  return 'none';
}

/** Props for his small round picture. */
type DorinFaceProps = {
  /** Width and height. */
  size: number;
  /** The ring's style: a thin soft gold, a thin gold, gold apart from the circle, or blue while he listens. */
  ring: 'soft' | 'thin' | 'gold' | 'listening';
  /** True while he talks: the gold sound-bars badge. */
  talking?: boolean;
};

/** Papa Dorin's small round picture in his cream circle. */
export function DorinFace({ size, ring, talking = false }: DorinFaceProps) {
  const rings = {
    soft: `0 0 0 2px ${show.dorinRing}`,
    thin: `0 0 0 2px ${call.talking}`,
    gold: `0 0 0 3px ${show.ringDark}, 0 0 0 6px ${call.talking}`,
    listening: `0 0 0 3px ${show.ringDark}, 0 0 0 6px ${call.listening}`,
  };
  return (
    <View style={{ width: size, height: size }}>
      <View style={[styles.face, { width: size, height: size, borderRadius: size / 2, boxShadow: rings[ring] }]}>
        <Image source={PAPA_DORIN} style={{ width: Math.round(size * 0.66), height: Math.round(size * 1.04), marginBottom: -Math.round(size * 0.12) }} contentFit="contain" />
      </View>
      {talking && (
        <View style={styles.badge} accessibilityLabel="Talking">
          <View style={[styles.bar, { height: 6 }]} />
          <View style={[styles.bar, { height: 11 }]} />
          <View style={[styles.bar, { height: 8 }]} />
        </View>
      )}
    </View>
  );
}

/** At most this much of what he already said stays in the box, so the part he's saying now always shows. */
const BEFORE_MAX = 140;

/** The end of what he already said, cut at a word. */
function lastPart(said: string): string {
  if (said.length <= BEFORE_MAX) return said;
  const cut = said.slice(-BEFORE_MAX);
  return `…${cut.slice(cut.indexOf(' ') + 1)}`;
}

/** Props for the docked box. */
type LessonDorinAnswerProps = {
  /** Papa Dorin: what he's doing, who asked, and his words. */
  dorin: PapaDorin;
  /** What he's doing with the question (never 'none' here). */
  phase: DorinPhase;
  /** The person holding this phone. */
  me: Participant;
};

/** The docked box with what he hears or what he says. */
export function LessonDorinAnswer({ dorin, phase, me }: LessonDorinAnswerProps) {
  const asker = dorin.holding ? me : dorin.asker;
  const mine = asker?.identity === me.identity;
  const name = mine ? 'you' : asker?.name || 'Guest';
  const asking = phase === 'asking';
  const line = asking
    ? dorin.status === 'coming'
      ? mine
        ? 'On his way… keep holding'
        : 'On his way'
      : `Listening to ${name}…`
    : phase === 'thinking'
      ? 'Thinking…'
      : asker
        ? `Answering ${name}`
        : 'Talking';
  const before = lastPart(dorin.words.saidBefore);
  const question = dorin.words.heard;
  return (
    <View style={[styles.box, asking && styles.boxAsking]} accessibilityLiveRegion="polite">
      <View style={styles.head}>
        <DorinFace size={52} ring={asking ? 'listening' : 'gold'} talking={phase === 'talking'} />
        <View style={styles.headWords}>
          <Text style={styles.name}>Papa Dorin</Text>
          <Text style={styles.line}>{line}</Text>
        </View>
        {!asking && <StopDorinButton dorin={dorin} />}
      </View>
      {asking ? (
        <Text style={styles.heard}>{question ? `“${question}”` : dorin.status === 'coming' ? 'He starts listening as soon as he arrives.' : 'Go ahead, he’s listening.'}</Text>
      ) : (
        <>
          {asker && question !== '' && (
            <View style={styles.asked}>
              <CallAvatar name={asker.name || 'Guest'} size={22} />
              <Text style={[styles.askedText, { color: colorOf(asker.name || 'Guest') }]}>{`“${question}”`}</Text>
            </View>
          )}
          {(before !== '' || dorin.words.saidNow !== '') && (
            <Text style={styles.said}>
              {before !== '' && <Text style={styles.saidBefore}>{`${before} `}</Text>}
              {dorin.words.saidNow}
            </Text>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  face: { backgroundColor: call.dorinBack, alignItems: 'center', justifyContent: 'flex-end', overflow: 'hidden' },
  badge: { position: 'absolute', right: -5, bottom: -4, width: 22, height: 22, borderRadius: 11, backgroundColor: call.talking, boxShadow: `0 0 0 2px ${show.ringDark}`, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2 },
  bar: { width: 2.5, borderRadius: 2, backgroundColor: call.ink },
  box: {
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: show.answerEdge,
    backgroundImage: `linear-gradient(180deg, ${show.answerTop}, ${show.answerBottom})`,
    boxShadow: `0 0 30px ${show.answerGlow}`,
    paddingTop: 12,
    paddingHorizontal: 14,
    paddingBottom: 14,
    gap: 10,
  },
  boxAsking: { borderColor: call.listeningEdge, backgroundImage: 'none', backgroundColor: call.listeningFill, boxShadow: `0 0 30px ${call.listeningFill}` },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 3, paddingLeft: 3 },
  headWords: { flex: 1, gap: 1 },
  name: { fontFamily: fonts.black, fontSize: 16, color: text.onDark },
  line: { fontFamily: fonts.bold, fontSize: 12.5, color: text.onDarkSoft },
  heard: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 23, color: text.onDark },
  asked: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  askedText: { flex: 1, fontFamily: fonts.bold, fontSize: 13.5 },
  said: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 23, color: text.onDark },
  saidBefore: { color: call.saidBefore },
});
