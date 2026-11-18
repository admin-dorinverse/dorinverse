// The "Verses mentioned" box on a character's or place's page: how many verses name them, how many of those the
// person has revealed, and a "Find in scripture" button that lists the revealed ones.

import { Pressable, StyleSheet, Text, View } from 'react-native';
import { playSound } from '@/components/common/sounds';
import { navy, reader, text } from '@/theme/colors';
import { fonts } from '@/theme/text';

/** Props for the box. */
type VersesMentionedProps = {
  /** How many verses name them. */
  count: number;
  /** How many of those the person has revealed, or undefined while the Bible loads. */
  revealed: number | undefined;
  /** The page's accent color, for the count. */
  accent: string;
  /** The color of the small "in your revealed verses" line. */
  soft: string;
  /** Opens the list of revealed verses that name them. */
  onFind: () => void;
};

/** The verse count with its "Find in scripture" button. */
export function VersesMentioned({ count, revealed, accent, soft, onFind }: VersesMentionedProps) {
  return (
    <View style={styles.box}>
      <View style={styles.countBox}>
        <Text style={styles.countLine}>
          <Text style={[styles.count, { color: accent }]}>{count}</Text> {count === 1 ? 'verse' : 'verses'}
        </Text>
        {revealed !== undefined && <Text style={[styles.revealed, { color: soft }]}>{revealed} in your revealed verses</Text>}
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          playSound('tap');
          onFind();
        }}
        style={({ pressed }) => [styles.find, pressed && styles.pressed]}
      >
        <Text style={styles.findText}>📖 Find in scripture</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    padding: 12,
    backgroundColor: reader.surface,
    borderWidth: 1,
    borderColor: reader.edge,
  },
  countBox: { flex: 1 },
  countLine: { fontFamily: fonts.bold, fontSize: 15, color: text.onDarkSoft },
  count: { fontFamily: fonts.black, fontSize: 20 },
  revealed: { fontFamily: fonts.bold, fontSize: 12, marginTop: 2 },
  find: { borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14, backgroundColor: reader.verseNumber },
  pressed: { opacity: 0.75 },
  findText: { fontFamily: fonts.black, fontSize: 13.5, color: navy },
});
