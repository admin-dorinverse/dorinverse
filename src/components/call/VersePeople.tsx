// The people strip under a shown verse, as in the call mockups' "A verse on screen": Papa Dorin first (hold his
// picture to ask him something, or tap it with Tap to talk on), a thin line, the host, the people who talked most
// recently, and "+3 Everyone", which opens everyone on the call. His picture stays put while it's held.

import type { Participant } from 'livekit-client';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { playSound } from '@/components/common/sounds';
import { callShowColors as show } from '@/theme/callColors';
import { text } from '@/theme/colors';
import { fonts } from '@/theme/text';
import { HOST_PREFIX } from '@/types/call';
import { CallPerson } from './CallPerson';
import { EveryoneSheet } from './EveryoneSheet';
import { DorinFace } from './LessonDorinAnswer';
import { HOLD_IN_BROWSER, useAskPress } from './tapToTalkPress';
import type { PapaDorin } from './usePapaDorin';
import { useTapToTalk } from './useTapToTalk';
import { byRecent } from './verseTalkers';

/** How many people fit after the host before the "+" circle takes the last spot. */
const FIT = 3;

/** Props for the strip. */
type VersePeopleProps = {
  /** Papa Dorin, held to ask. */
  dorin: PapaDorin;
  /** Everyone on the call except him. */
  people: Participant[];
  /** Who talked lately, newest first. */
  recent: string[];
  /** The identity of the person holding this phone. */
  me: string;
};

/** The people strip, with the Everyone sheet when "+N" is tapped. */
export function VersePeople({ dorin, people, recent, me }: VersePeopleProps) {
  const [everyone, setEveryone] = useState(false);
  const press = useAskPress(dorin);
  const tapMode = useTapToTalk();
  const host = people.find((p) => p.identity.startsWith(HOST_PREFIX));
  const rest = byRecent(people.filter((p) => p !== host), recent);
  // Everyone fits when there are few; otherwise the most recent talkers, and the "+" circle for the rest.
  const shown = rest.length <= FIT ? rest : rest.slice(0, FIT - 1);
  const more = rest.length - shown.length;
  const labelOf = (p: Participant) => (p.identity === me ? 'You' : undefined);
  return (
    <View style={styles.strip}>
      <Pressable accessibilityRole="button" {...press} disabled={dorin.closed} style={[styles.dorin, HOLD_IN_BROWSER, dorin.closed && styles.closed]}>
        <DorinFace size={56} ring={dorin.holding ? 'listening' : 'soft'} talking={dorin.status === 'talking'} />
        <Text style={styles.name}>Papa Dorin</Text>
        <Text style={styles.hint}>{dorin.closed ? 'Busy' : tapMode ? 'Tap to ask' : 'Hold to ask'}</Text>
      </Pressable>
      <View style={styles.line} />
      {host && <CallPerson person={host} size={52} label={labelOf(host)} />}
      {shown.map((p) => (
        <CallPerson key={p.identity} person={p} size={52} label={labelOf(p)} />
      ))}
      {more > 0 && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Show everyone: ${more} more`}
          onPress={() => {
            playSound('tap');
            setEveryone(true);
          }}
          style={styles.cell}
        >
          <View style={styles.more}>
            <Text style={styles.moreText}>{`+${more}`}</Text>
          </View>
          <Text style={styles.name}>Everyone</Text>
        </Pressable>
      )}
      <EveryoneSheet open={everyone} onClose={() => setEveryone(false)} people={people} me={me} />
    </View>
  );
}

const styles = StyleSheet.create({
  strip: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4, paddingHorizontal: 2 },
  dorin: { width: 62, alignItems: 'center', gap: 4 },
  name: { fontFamily: fonts.extraBold, fontSize: 11.5, color: text.onDark },
  closed: { opacity: 0.6 },
  hint: { marginTop: -3, fontFamily: fonts.extraBold, fontSize: 10, color: text.goldNote },
  line: { width: 1, height: 46, backgroundColor: show.stripLine },
  cell: { width: 56, alignItems: 'center', gap: 4 },
  more: { width: 52, height: 52, borderRadius: 26, borderWidth: 1, borderColor: show.moreEdge, backgroundColor: show.moreFill, alignItems: 'center', justifyContent: 'center' },
  moreText: { fontFamily: fonts.black, fontSize: 17, color: text.onDark },
});
