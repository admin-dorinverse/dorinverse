// Papa Dorin inside the trivia clock, as in the call mockups' question screen: a gold ring around his picture that
// empties as the seconds run out, and the seconds left beside it. The clock only starts once he has finished
// reading the question. It redraws once a second, and stops while the page is hidden or the app is away.

import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useSecondTick } from '@/components/bakery/tv/useSecondTick';
import { PAPA_DORIN } from '@/components/common/cookieArt';
import { call, callTriviaColors } from '@/theme/callColors';
import { text } from '@/theme/colors';
import { fonts } from '@/theme/text';
import { ANSWER_SECONDS } from './useTriviaGame';

/** The ring's size, radius and length around (as in the mockup: 84 across, radius 39). */
const SIZE = 84;
const RADIUS = 39;
const AROUND = 2 * Math.PI * RADIUS;

/** Props for the clock. */
type TriviaClockProps = {
  /** When answering ends (milliseconds since 1970), or null while he's still reading. */
  deadline: number | null;
};

/** The clock while answering, or a full ring and "Listen…" while he reads. */
export function TriviaClock({ deadline }: TriviaClockProps) {
  const now = useSecondTick();
  // Kept within 0 to ANSWER_SECONDS, since a phone's clock can be a second or two off the program's.
  const left = deadline === null ? ANSWER_SECONDS : Math.min(ANSWER_SECONDS, Math.max(0, Math.ceil((deadline - now) / 1000)));
  const share = Math.min(1, left / ANSWER_SECONDS);
  return (
    <View style={styles.row}>
      <View style={styles.ring}>
        <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} style={styles.ringPicture}>
          <Circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" stroke={callTriviaColors.ringTrack} strokeWidth={6} />
          {share > 0 && (
            <Circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke={call.talking}
              strokeWidth={6}
              strokeLinecap="round"
              strokeDasharray={AROUND}
              strokeDashoffset={AROUND * (1 - share)}
            />
          )}
        </Svg>
        <View style={styles.face}>
          <Image source={PAPA_DORIN} style={styles.dorin} contentFit="contain" accessibilityLabel="Papa Dorin" />
        </View>
      </View>
      {deadline === null ? (
        <View style={styles.words}>
          <Text style={styles.listen}>Listen…</Text>
          <Text style={styles.note}>Papa Dorin is reading the question. The clock starts when he finishes.</Text>
        </View>
      ) : (
        <View style={styles.words} accessibilityLabel={`${left} seconds left`}>
          <Text style={styles.seconds}>{left}</Text>
          <Text style={styles.note}>{left === 1 ? 'second left.' : 'seconds left.'} The clock started when Papa Dorin finished reading.</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  ring: { width: SIZE, height: SIZE, flexShrink: 0 },
  // Turned a quarter back, so the gold starts at the top and empties going around.
  ringPicture: { position: 'absolute', left: 0, top: 0, transform: [{ rotate: '-90deg' }] },
  face: { position: 'absolute', left: 8, top: 8, width: 68, height: 68, borderRadius: 34, backgroundColor: call.dorinBack, alignItems: 'center', justifyContent: 'flex-end', overflow: 'hidden' },
  dorin: { width: 46, height: 72, marginBottom: -9 },
  words: { flex: 1, gap: 2 },
  seconds: { fontFamily: fonts.black, fontSize: 30, lineHeight: 32, color: text.goldNote },
  listen: { fontFamily: fonts.black, fontSize: 24, lineHeight: 32, color: text.goldNote },
  note: { fontFamily: fonts.bold, fontSize: 13, color: text.onDarkSoft },
});
