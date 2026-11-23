// The top of a constellation's lists: on its own page, its glowing shape and its name in its color, as in the
// design; on a book or story page, the book's or story's name. Each has a short line under it, like
// "412 lessons · 24 books".

import { StyleSheet, Text, View } from 'react-native';
import { ConstellationGlyph } from '@/components/sky/ConstellationGlyph';
import { text } from '@/theme/colors';
import { fonts } from '@/theme/text';
import type { Constellation } from '@/types/constellation';

/** Props for the constellation page's top. */
type ListTopProps = {
  /** The constellation. */
  constellation: Constellation;
  /** The line under its name, or undefined while the outline loads. */
  detail: string | undefined;
};

/** The constellation's shape, name and a line about its lessons. */
export function ListTop({ constellation, detail }: ListTopProps) {
  return (
    <View style={styles.top}>
      <ConstellationGlyph constellation={constellation} size={74} stroke={5} glow={8} />
      <View style={styles.words}>
        <Text style={[styles.name, { textShadowColor: constellation.color }]}>{constellation.name}</Text>
        {detail !== undefined && <Text style={styles.count}>{detail}</Text>}
      </View>
    </View>
  );
}

/** Props for a book or story page's top. */
type ShelfTopProps = {
  /** The page's name, like "Genesis" or "Joseph and His Brothers". */
  title: string;
  /** The line under it, like "50 lessons · 14 stories". */
  detail: string;
  /** The constellation's color, for the name's glow. */
  color: string;
};

/** A book or story page's name and a line about its lessons. */
export function ShelfTop({ title, detail, color }: ShelfTopProps) {
  return (
    <View style={styles.top}>
      <View style={styles.words}>
        <Text style={[styles.title, { textShadowColor: color }]}>{title}</Text>
        <Text style={styles.count}>{detail}</Text>
      </View>
    </View>
  );
}

/** "1 lesson", "2 lessons", "1 story", "3 stories": a count with its word. */
export function counted(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 18 },
  words: { flex: 1 },
  name: { fontFamily: fonts.black, fontSize: 34, lineHeight: 38, color: text.onDark, textShadowRadius: 14, textShadowOffset: { width: 0, height: 0 } },
  title: { fontFamily: fonts.black, fontSize: 28, lineHeight: 32, color: text.onDark, textShadowRadius: 14, textShadowOffset: { width: 0, height: 0 } },
  count: { fontFamily: fonts.extraBold, fontSize: 13, letterSpacing: 0.6, color: text.onDarkSoft, marginTop: 2 },
});
