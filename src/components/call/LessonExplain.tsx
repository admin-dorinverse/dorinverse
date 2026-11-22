// Papa Dorin reading a question's explanation to everyone, as in the call mockups' "Explain the Answer, read aloud":
// the lesson's cream explain page with the written explanation in a speech card (the sentence he's saying lit gold,
// what he already read softer), Papa Dorin with "Reading it to everyone" and the thumbs, "Still curious? Hold to ask
// him" (once he's done reading), and the host's "CONTINUE LESSON".

import { Image } from 'expo-image';
import type { Participant } from 'livekit-client';
import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { PAPA_DORIN, sharpDorinHeight } from '@/components/common/cookieArt';
import { playSound } from '@/components/common/sounds';
import { call, callShowColors as show } from '@/theme/callColors';
import { text } from '@/theme/colors';
import { explainColors } from '@/theme/lessonColors';
import { fonts } from '@/theme/text';
import { LessonAskPill } from './LessonAskPill';
import type { DorinPhase } from './LessonDorinAnswer';
import type { Reading } from './lessonReading';
import type { PapaDorin } from './usePapaDorin';

/** The thumbs' outline pictures, from the mockup. */
const THUMB_DOWN = ['M17 14V2', 'M9 18.1L10 14H4.2a2 2 0 0 1-1.9-2.6l2.3-7A2 2 0 0 1 6.5 3H17v11l-4 8a3 3 0 0 1-4-3.9Z'];
const THUMB_UP = ['M7 10v12', 'M15 5.9L14 10h5.8a2 2 0 0 1 1.9 2.6l-2.3 7a2 2 0 0 1-1.9 1.4H7V10l4-8a3 3 0 0 1 4 3.9Z'];

/** Papa Dorin's height beside the thumbs, made sharp for this screen, and his width from the picture's shape. */
const DORIN_HEIGHT = sharpDorinHeight(160);
const DORIN_WIDTH = Math.round((DORIN_HEIGHT * 300) / 688);

/** Props for the explain page. */
type LessonExplainProps = {
  /** Where he is in the explanation. */
  reading: Reading;
  /** A note for the host when he couldn't be asked to read, or empty. */
  problem: string;
  /** True for the host, who gets "CONTINUE LESSON". */
  isHost: boolean;
  /** The host's name, for "Only Mom sees this button". */
  hostName: string;
  /** The host goes on with the lesson. */
  onContinue: () => void;
  /** The top of the page (the avatars and their line). */
  top: ReactNode;
  /** Papa Dorin, held to ask once he's done reading. */
  dorin: PapaDorin;
  /** What he's doing with a question now. */
  phase: DorinPhase;
  /** The person holding this phone. */
  me: Participant;
};

/** The explain page. */
export function LessonExplain({ reading, problem, isHost, hostName, onContinue, top, dorin, phase, me }: LessonExplainProps) {
  const [thumb, setThumb] = useState<'up' | 'down' | null>(null);
  const chip = reading.done ? 'Done reading' : reading.started ? 'Reading it to everyone' : 'Getting ready to read';
  /** Turns a thumb on, or off when tapped again. */
  const tapThumb = (which: 'up' | 'down') => {
    playSound('tap');
    setThumb((t) => (t === which ? null : which));
  };
  return (
    <View style={styles.page}>
      {top}
      <Text style={styles.title}>Explain the Answer</Text>
      <View style={styles.card}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={styles.words}>
            {reading.sentences.map((s, i) => (
              <Text key={i} style={i === reading.at ? styles.now : reading.at > i ? styles.done : undefined}>
                {s.opensParagraph ? `\n\n${s.text}` : s.text}
              </Text>
            ))}
          </Text>
        </ScrollView>
        <View style={styles.tail} />
      </View>
      <View style={styles.foot}>
        <Image source={PAPA_DORIN} style={styles.dorin} contentFit="contain" accessibilityLabel="Papa Dorin" />
        <View style={styles.side}>
          <View style={styles.chip} accessibilityLiveRegion="polite">
            {reading.started && !reading.done && (
              <View style={styles.bars}>
                <View style={[styles.bar, { height: 7 }]} />
                <View style={[styles.bar, { height: 13 }]} />
                <View style={[styles.bar, { height: 9 }]} />
              </View>
            )}
            <Text style={styles.chipText}>{chip}</Text>
          </View>
          <Text style={styles.hint}>{problem || 'The words light up as he says them.'}</Text>
          <View style={styles.thumbs}>
            {(['down', 'up'] as const).map((which) => (
              <Pressable
                key={which}
                accessibilityRole="button"
                accessibilityLabel={which === 'up' ? 'Helpful' : 'Not helpful'}
                accessibilityState={{ selected: thumb === which }}
                onPress={() => tapThumb(which)}
                style={styles.thumb}
              >
                <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={thumb === which ? explainColors.thumbOn : explainColors.thumb} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                  {(which === 'up' ? THUMB_UP : THUMB_DOWN).map((d) => (
                    <Path key={d} d={d} />
                  ))}
                </Svg>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
      <View style={styles.space} />
      <LessonAskPill look="cream" enabled={reading.done} title="Still curious? Hold to ask him" line="Works once he’s done reading" dorin={dorin} phase={phase} me={me} />
      {isHost && (
        <View style={styles.hostArea}>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              playSound('tap');
              onContinue();
            }}
            style={({ pressed }) => [styles.go, pressed && styles.pressed]}
          >
            <Text style={styles.goText}>CONTINUE LESSON</Text>
          </Pressable>
          <Text style={styles.only}>{`Only ${hostName} sees this button`}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, gap: 14 },
  title: { fontFamily: fonts.black, fontSize: 24, textAlign: 'center', color: explainColors.ink, paddingTop: 4 },
  card: { flexShrink: 1, minHeight: 80, borderRadius: 22, borderWidth: 1.5, borderColor: explainColors.edge, backgroundColor: explainColors.card, padding: 18 },
  words: { fontFamily: fonts.body, fontSize: 16.5, lineHeight: 26, color: explainColors.ink },
  now: { backgroundColor: show.readingNow },
  done: { color: show.readingDone },
  tail: {
    position: 'absolute',
    left: 44,
    bottom: -11,
    width: 20,
    height: 20,
    backgroundColor: explainColors.card,
    borderRightWidth: 1.5,
    borderBottomWidth: 1.5,
    borderColor: explainColors.edge,
    borderBottomRightRadius: 4,
    transform: [{ rotate: '45deg' }],
  },
  foot: { flexDirection: 'row', alignItems: 'flex-end', gap: 14, paddingLeft: 14 },
  dorin: { width: DORIN_WIDTH, height: DORIN_HEIGHT, marginTop: 6 },
  side: { flex: 1, gap: 8, paddingBottom: 14 },
  chip: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 999, backgroundColor: call.talking, paddingVertical: 6, paddingLeft: 10, paddingRight: 12 },
  bars: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  bar: { width: 3, borderRadius: 2, backgroundColor: call.ink },
  chipText: { fontFamily: fonts.black, fontSize: 13, color: call.ink },
  hint: { fontFamily: fonts.bold, fontSize: 12.5, lineHeight: 17, color: explainColors.back },
  thumbs: { flexDirection: 'row', gap: 10 },
  thumb: { width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, borderColor: explainColors.edge, backgroundColor: explainColors.card, alignItems: 'center', justifyContent: 'center' },
  space: { flexGrow: 1 },
  hostArea: { gap: 6 },
  go: { borderRadius: 16, paddingVertical: 15, alignItems: 'center', backgroundColor: explainColors.button, boxShadow: `0 4px 0 ${explainColors.buttonShadow}` },
  goText: { fontFamily: fonts.black, fontSize: 17, letterSpacing: 1, color: text.onDark },
  only: { textAlign: 'center', fontFamily: fonts.extraBold, fontSize: 11.5, color: explainColors.back },
  pressed: { transform: [{ translateY: 3 }] },
});
