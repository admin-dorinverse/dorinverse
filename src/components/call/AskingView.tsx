// The call while someone asks Papa Dorin something, as in the call mockups' "Talking to Papa Dorin" screen: the
// status chips (On his way, Listening, Thinking, Talking), Papa Dorin big with a ring in the asker's color,
// "Listening to Jordan…", what he hears so far, the privacy line, and for the asker the "Let go when you're done"
// bar. The asker's finger stays on the card underneath, so this screen lets touches pass through. With Tap to talk
// on, the asker taps Done (or his picture) instead of letting go.

import { Image } from 'expo-image';
import type { Participant } from 'livekit-client';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { PAPA_DORIN } from '@/components/common/cookieArt';
import { call } from '@/theme/callColors';
import { text } from '@/theme/colors';
import { gutter } from '@/theme/spacing';
import { fonts } from '@/theme/text';
import { ShieldIcon } from './CallIcons';
import { CallAvatar, colorOf } from './CallPerson';
import { CallHeader } from './CallHeader';
import type { DorinStatus } from './usePapaDorin';

/** Props for the asking screen. */
type AskingViewProps = {
  /** The get-together's name. */
  title: string;
  /** What Papa Dorin is doing: on his way or listening. */
  status: DorinStatus;
  /** Who is asking him, or undefined while that isn't known yet. */
  asker: Participant | undefined;
  /** True when the asker is the person holding this phone. */
  mine: boolean;
  /** What he has heard so far. */
  heard: string;
  /** Everyone else on the call, for the little stack of avatars. */
  others: Participant[];
  /** True when Tap to talk is on: the asker taps Done instead of letting go. */
  tapMode: boolean;
  /** The asker tapped Done or his picture (Tap to talk). */
  onDone: () => void;
};

/** The four steps, in order, as the chips show them. */
const STEPS: { key: DorinStatus; label: string }[] = [
  { key: 'coming', label: 'On his way' },
  { key: 'listening', label: 'Listening' },
  { key: 'thinking', label: 'Thinking' },
  { key: 'talking', label: 'Talking' },
];

/** How many avatars show in the stack before "+2". */
const STACK = 3;

/** The asking screen. */
export function AskingView({ title, status, asker, mine, heard, others, tapMode, onDone }: AskingViewProps) {
  const name = asker?.name || 'Guest';
  const ring = asker ? colorOf(asker.name || 'Guest') : call.listening;
  const coming = status === 'coming';
  // Only a Tap to talk asker taps this screen; otherwise touches go to the card underneath.
  const tapping = mine && tapMode;
  return (
    <View style={styles.page} pointerEvents={tapping ? 'box-none' : 'none'}>
      <CallHeader title={title} line="Everyone can hear Papa Dorin" count={0} />
      <View style={styles.chips} accessibilityLabel={coming ? 'Papa Dorin is on his way' : 'Papa Dorin is listening'}>
        {STEPS.map((s) => (
          <Text key={s.key} style={[styles.chip, s.key === status && styles.chipOn]}>
            {s.label}
          </Text>
        ))}
      </View>
      <View style={styles.middle}>
        <Pressable disabled={!tapping} onPress={onDone} accessibilityLabel={tapping ? 'Done asking' : undefined} style={[styles.face, { borderColor: ring, boxShadow: `0 0 46px 14px ${call.listeningGlow}` }]}>
          <Image source={PAPA_DORIN} style={styles.dorin} contentFit="contain" />
        </Pressable>
        <View style={styles.who}>
          {asker && <CallAvatar name={name} size={28} />}
          <Text style={styles.whoText}>
            {coming ? (mine ? (tapping ? 'On his way…' : 'On his way… keep holding') : 'Papa Dorin is on his way') : `Listening to ${mine ? 'you' : name}…`}
          </Text>
        </View>
      </View>
      <View style={styles.heardBox}>
        <Text style={styles.heardLabel}>WHAT PAPA DORIN HEARS</Text>
        <Text style={styles.heard}>{heard ? `“${heard}”` : coming ? 'He starts listening as soon as he arrives.' : 'Go ahead, he’s listening.'}</Text>
      </View>
      <View style={styles.privacy}>
        <ShieldIcon color={text.goldNote} />
        <Text style={styles.privacyText}>
          {mine ? 'Only your voice goes to Papa Dorin. Everyone else keeps hearing you as usual.' : `Only ${name}’s voice goes to Papa Dorin. You can keep talking as usual.`}
        </Text>
      </View>
      <View style={styles.space} />
      <View style={styles.stack}>
        {others.slice(0, STACK).map((p, i) => (
          <View key={p.identity} style={[styles.stackItem, i > 0 && styles.overlap]}>
            <CallAvatar name={p.name || 'Guest'} size={36} />
          </View>
        ))}
        {others.length > STACK && (
          <View style={[styles.stackItem, styles.overlap, styles.stackMore]}>
            <Text style={styles.stackMoreText}>{`+${others.length - STACK}`}</Text>
          </View>
        )}
      </View>
      {mine ? (
        <>
          <Pressable disabled={!tapping} onPress={onDone} accessibilityRole={tapping ? 'button' : undefined} style={styles.hold}>
            <View style={styles.bars}>
              {[10, 22, 16, 26, 12].map((h, i) => (
                <View key={i} style={[styles.bar, { height: h }]} />
              ))}
            </View>
            <View>
              <Text style={styles.holdTitle}>{tapping ? 'Done' : 'Let go when you’re done'}</Text>
              <Text style={styles.holdLine}>{tapping ? 'Tap when you’ve finished asking' : 'Holding to talk to Papa Dorin'}</Text>
            </View>
          </Pressable>
          <Text style={styles.hint}>{tapping ? 'Tap to talk is on. You can change it in Settings.' : 'Hard to hold? Turn on Tap to talk in Settings.'}</Text>
        </>
      ) : (
        <Text style={styles.watching}>{`${name} is asking Papa Dorin`}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    paddingHorizontal: gutter,
    paddingTop: 8,
    paddingBottom: 96,
    gap: 16,
    backgroundColor: call.page,
    backgroundImage: `radial-gradient(120% 70% at 50% 30%, ${call.dorinGlow} 0%, ${call.pageGlow[1]} 55%, ${call.pageGlow[2]} 100%)`,
  },
  chips: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  chip: { borderRadius: 999, paddingVertical: 5, paddingHorizontal: 10, overflow: 'hidden', backgroundColor: call.chipIdle, fontFamily: fonts.extraBold, fontSize: 11.5, color: call.chipIdleInk },
  chipOn: { backgroundColor: call.listening, fontFamily: fonts.black, color: call.ink },
  middle: { alignItems: 'center', gap: 14, paddingTop: 6 },
  face: { width: 196, height: 196, borderRadius: 98, borderWidth: 5, backgroundColor: call.dorinBack, alignItems: 'center', justifyContent: 'flex-end', overflow: 'hidden' },
  dorin: { width: 128, height: 200, marginBottom: -24 },
  who: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  whoText: { fontFamily: fonts.black, fontSize: 18, color: text.onDark },
  heardBox: { borderRadius: 20, borderWidth: 1, borderColor: call.listeningEdge, backgroundColor: call.listeningFill, paddingVertical: 14, paddingHorizontal: 16, gap: 6 },
  heardLabel: { fontFamily: fonts.extraBold, fontSize: 11.5, letterSpacing: 1.1, color: call.listening },
  heard: { fontFamily: fonts.bold, fontSize: 17, lineHeight: 24, color: text.onDark },
  privacy: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  privacyText: { flex: 1, fontFamily: fonts.bold, fontSize: 13, lineHeight: 18, color: text.onDarkSoft },
  space: { flex: 1 },
  stack: { flexDirection: 'row', justifyContent: 'center' },
  stackItem: { borderRadius: 20, borderWidth: 2, borderColor: call.page },
  overlap: { marginLeft: -8 },
  stackMore: { width: 40, height: 40, backgroundColor: call.more, alignItems: 'center', justifyContent: 'center' },
  stackMoreText: { fontFamily: fonts.black, fontSize: 12, color: text.onDark },
  hold: { height: 76, borderRadius: 38, backgroundColor: call.listening, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, boxShadow: `0 0 0 6px ${call.listeningEdge}` },
  bars: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  bar: { width: 4, borderRadius: 2, backgroundColor: call.ink },
  holdTitle: { fontFamily: fonts.black, fontSize: 18, color: call.ink },
  holdLine: { fontFamily: fonts.bold, fontSize: 12.5, color: call.ink },
  hint: { marginTop: -6, textAlign: 'center', fontFamily: fonts.bold, fontSize: 12.5, color: text.onDarkSoft },
  watching: { textAlign: 'center', fontFamily: fonts.extraBold, fontSize: 14, color: text.onDarkSoft },
});
