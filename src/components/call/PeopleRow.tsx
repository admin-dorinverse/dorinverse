// A row of small avatars, as in the call mockups' asking, answering and verse screens: the first few people with
// their names, then a "+3 Everyone" circle for the rest. Tapping that circle opens the Everyone sheet, which lists
// everyone on the call.

import type { Participant } from 'livekit-client';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { playSound } from '@/components/common/sounds';
import { call } from '@/theme/callColors';
import { text } from '@/theme/colors';
import { fonts } from '@/theme/text';
import { CallPerson } from './CallPerson';
import { EveryoneSheet } from './EveryoneSheet';

/** How many small avatars fit across a phone before the "+" circle. */
const SHOWN = 5;

/** Props for a row of people. */
type PeopleRowProps = {
  /** Everyone to show, most important first. */
  people: Participant[];
  /** The identity of the person holding this phone, shown as "You". */
  me: string;
};

/** The row of small avatars, with the "+3 Everyone" circle when they don't all fit. */
export function PeopleRow({ people, me }: PeopleRowProps) {
  const [open, setOpen] = useState(false);
  const more = people.length - SHOWN;
  return (
    <View style={styles.row}>
      {people.slice(0, more > 0 ? SHOWN - 1 : SHOWN).map((p) => (
        <CallPerson key={p.identity} person={p} size={44} label={p.identity === me ? 'You' : undefined} />
      ))}
      {more > 0 && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Show everyone: ${more + 1} more`}
          onPress={() => {
            playSound('tap');
            setOpen(true);
          }}
          style={styles.cell}
        >
          <View style={styles.more}>
            <Text style={styles.moreText}>{`+${more + 1}`}</Text>
          </View>
          <Text style={styles.name}>Everyone</Text>
        </Pressable>
      )}
      <EveryoneSheet open={open} onClose={() => setOpen(false)} people={people} me={me} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  cell: { width: 56, alignItems: 'center', gap: 4 },
  more: { width: 44, height: 44, borderRadius: 22, backgroundColor: call.more, borderWidth: 1, borderColor: call.glassEdge, alignItems: 'center', justifyContent: 'center' },
  moreText: { fontFamily: fonts.black, fontSize: 15, color: text.onDark },
  name: { fontFamily: fonts.extraBold, fontSize: 11.5, color: text.onDark },
});
