// Papa Dorin's card pinned at the top of the call, as in the call mockups' "On the call" screen: his picture in a
// cream circle, his name with a gold sparkle, "Hold his picture to ask him something", and on the right whether he's
// asleep, on his way, or here. Holding it asks him something (and wakes him first if he's asleep); with Tap to talk
// on, one tap starts asking instead.

import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { PAPA_DORIN } from '@/components/common/cookieArt';
import { call } from '@/theme/callColors';
import { text } from '@/theme/colors';
import { fonts } from '@/theme/text';
import { SparkleIcon } from './CallIcons';
import { HOLD_IN_BROWSER, keepHolding } from './tapToTalkPress';
import type { DorinStatus } from './usePapaDorin';

/** Props for Papa Dorin's card. */
type DorinCardProps = {
  /** What he's doing. */
  status: DorinStatus;
  /** A note to show under the card, like "Someone else is asking him right now." */
  note: string;
  /** True when Tap to talk is on: a tap starts asking instead of holding. */
  tapMode: boolean;
  /** A finger goes down on his picture (hold to talk). */
  onHold: () => void;
  /** The finger comes up (hold to talk). */
  onLetGo: () => void;
  /** A tap on his picture (Tap to talk). */
  onTap: () => void;
  /** Why asking is closed now (someone else asks, or he's answering); empty while it's open. */
  closedLine: string;
};

/** The small word on the right for each thing he can be doing. */
const STATE_WORD: Record<DorinStatus, string> = {
  away: 'ASLEEP',
  coming: 'ON HIS WAY',
  ready: 'HERE',
  listening: 'LISTENING',
  thinking: 'THINKING',
  talking: 'TALKING',
};

/** Papa Dorin's pinned card. */
export function DorinCard({ status, note, tapMode, onHold, onLetGo, onTap, closedLine }: DorinCardProps) {
  const press = tapMode
    ? { onPress: onTap, accessibilityLabel: 'Tap to ask Papa Dorin something' }
    : { onPressIn: onHold, onPressOut: onLetGo, onLongPress: keepHolding, accessibilityLabel: 'Hold to ask Papa Dorin something' };
  return (
    <View style={styles.wrap}>
      <Pressable accessibilityRole="button" {...press} accessibilityState={{ disabled: closedLine !== '' }} style={[styles.card, HOLD_IN_BROWSER, closedLine !== '' && styles.closed]}>
        <View style={styles.face} pointerEvents="none">
          <Image source={PAPA_DORIN} style={styles.dorin} contentFit="contain" />
        </View>
        <View style={styles.words}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>Papa Dorin</Text>
            <SparkleIcon color={text.goldNote} />
          </View>
          <Text style={styles.line}>{closedLine || (tapMode ? 'Tap his picture to ask him something' : 'Hold his picture to ask him something')}</Text>
        </View>
        <Text style={styles.state}>{STATE_WORD[status]}</Text>
      </Pressable>
      {note !== '' && <Text style={styles.note}>{note}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  closed: { opacity: 0.6 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: call.dorinCardEdge,
    backgroundImage: `linear-gradient(180deg, ${call.dorinCardTop}, ${call.dorinCardBottom})`,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  face: { width: 64, height: 64, borderRadius: 32, backgroundColor: call.dorinBack, alignItems: 'center', justifyContent: 'flex-end', overflow: 'hidden', borderWidth: 3, borderColor: call.dorinFaceEdge },
  dorin: { width: 44, height: 70, marginBottom: -8 },
  words: { flex: 1, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontFamily: fonts.black, fontSize: 16.5, color: text.onDark },
  line: { fontFamily: fonts.bold, fontSize: 13, color: text.onDarkSoft },
  state: { fontFamily: fonts.extraBold, fontSize: 11, letterSpacing: 0.8, color: text.goldNote },
  note: { fontFamily: fonts.bold, fontSize: 13, color: text.goldNote, textAlign: 'center' },
});
