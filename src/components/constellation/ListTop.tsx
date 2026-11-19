// The top of a constellation's lesson list: its glowing shape and its name in its color, as in the design.

import { StyleSheet, Text, View } from 'react-native';
import { ConstellationGlyph } from '@/components/sky/ConstellationGlyph';
import { text } from '@/theme/colors';
import { fonts } from '@/theme/text';
import type { Constellation } from '@/types/constellation';

/** Props for the list's top. */
type ListTopProps = {
  /** The constellation. */
  constellation: Constellation;
  /** How many lessons it holds, or undefined while the outline loads. */
  count: number | undefined;
};

/** The constellation's shape, name and lesson count. */
export function ListTop({ constellation, count }: ListTopProps) {
  return (
    <View style={styles.top}>
      <ConstellationGlyph constellation={constellation} size={74} stroke={5} glow={8} />
      <View style={styles.words}>
        <Text style={[styles.name, { textShadowColor: constellation.color }]}>{constellation.name}</Text>
        {count !== undefined && <Text style={styles.count}>{`${count} ${count === 1 ? 'lesson' : 'lessons'}`}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 18 },
  words: { flex: 1 },
  name: { fontFamily: fonts.black, fontSize: 34, lineHeight: 38, color: text.onDark, textShadowRadius: 14, textShadowOffset: { width: 0, height: 0 } },
  count: { fontFamily: fonts.extraBold, fontSize: 13, letterSpacing: 0.6, color: text.onDarkSoft, marginTop: 2 },
});
