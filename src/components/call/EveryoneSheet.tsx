// The "Everyone" sheet, opened from the "+3 Everyone" circle: everyone on the call in a list, each with their
// avatar (gold ring while they talk, the crossed-out mic while muted), their name and a HOST tag for the host.
// The list draws only the rows on screen, so a full call stays smooth.

import type { Participant } from 'livekit-client';
import { Track } from 'livekit-client';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { GlassSheet } from '@/components/common/GlassSheet';
import { call } from '@/theme/callColors';
import { text } from '@/theme/colors';
import { fonts } from '@/theme/text';
import { HOST_PREFIX } from '@/types/call';
import { CallAvatar } from './CallPerson';
import { useIsMuted, useIsSpeaking } from './livekit';

/** One row's height, so the list can skip measuring. */
const ROW_HEIGHT = 64;

/** Props for the Everyone sheet. */
type EveryoneSheetProps = {
  /** True while it shows. */
  open: boolean;
  /** Closes it. */
  onClose: () => void;
  /** Everyone on the call. */
  people: Participant[];
  /** The identity of the person holding this phone, marked "(you)". */
  me: string;
};

/** The sheet listing everyone on the call. */
export function EveryoneSheet({ open, onClose, people, me }: EveryoneSheetProps) {
  return (
    <GlassSheet open={open} onClose={onClose} title={`Everyone (${people.length})`}>
      <FlatList
        data={people}
        keyExtractor={(p) => p.identity}
        renderItem={({ item }) => <PersonLine person={item} you={item.identity === me} />}
        getItemLayout={(_, index) => ({ length: ROW_HEIGHT, offset: ROW_HEIGHT * index, index })}
        style={styles.list}
        initialNumToRender={10}
        windowSize={5}
      />
    </GlassSheet>
  );
}

/** Props for one person's line. */
type PersonLineProps = {
  /** The person. */
  person: Participant;
  /** True for the person holding this phone. */
  you: boolean;
};

/** One person: avatar, name, and whether they're talking or muted. */
function PersonLine({ person, you }: PersonLineProps) {
  const talking = useIsSpeaking(person);
  const muted = useIsMuted({ participant: person, source: Track.Source.Microphone });
  const name = person.name || 'Guest';
  const host = person.identity.startsWith(HOST_PREFIX);
  return (
    <View style={styles.row}>
      <CallAvatar name={name} size={44} talking={talking} muted={muted} />
      <View style={styles.words}>
        <Text style={styles.name} numberOfLines={1}>
          {you ? `${name} (you)` : name}
        </Text>
        {(talking || muted) && <Text style={styles.state}>{talking ? 'Talking' : 'Muted'}</Text>}
      </View>
      {host && <Text style={styles.host}>HOST</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { maxHeight: ROW_HEIGHT * 7.5, marginTop: 4 },
  row: { height: ROW_HEIGHT, flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: call.chipIdle },
  words: { flex: 1, gap: 2 },
  name: { fontFamily: fonts.extraBold, fontSize: 16, color: text.onDark },
  state: { fontFamily: fonts.bold, fontSize: 12.5, color: text.onDarkSoft },
  host: { fontFamily: fonts.extraBold, fontSize: 11, letterSpacing: 0.8, color: text.goldNote },
});
