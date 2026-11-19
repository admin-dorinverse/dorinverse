// The calm note the orbit view shows once every stop of a lesson is baked. It does not move.

import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassSurface } from '@/components/common/Glass';
import { playSound } from '@/components/common/sounds';
import { navy, text } from '@/theme/colors';
import { gutter, radius } from '@/theme/spacing';
import { fonts } from '@/theme/text';

/** Props for the note. */
type AllBakedProps = {
  /** The constellation's color. */
  color: string;
  /** Goes back to the lesson list. */
  onBack: () => void;
};

/** "All cookies baked", with a button back to the lessons. */
export function AllBaked({ color, onBack }: AllBakedProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.wrap, { bottom: insets.bottom + 22 }]}>
      <GlassSurface style={styles.card}>
        <View style={styles.row}>
          <View style={[styles.mark, { backgroundColor: color }]}>
            <Text style={styles.markText}>✓</Text>
          </View>
          <View style={styles.words}>
            <Text style={styles.title}>All cookies baked</Text>
            <Text style={styles.note}>Every stop of this lesson is baked, and its verses are in your Bible.</Text>
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            playSound('tap');
            onBack();
          }}
          style={({ pressed }) => [styles.button, { backgroundColor: color }, pressed && styles.pressed]}
        >
          <Text style={styles.buttonText}>Back to the lessons</Text>
        </Pressable>
      </GlassSurface>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: gutter, right: gutter, alignItems: 'center' },
  card: { width: '100%', maxWidth: 560, borderRadius: radius.card, padding: 18, gap: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  mark: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  markText: { fontFamily: fonts.black, fontSize: 20, color: navy },
  words: { flex: 1 },
  title: { fontFamily: fonts.black, fontSize: 20, color: text.onDark },
  note: { fontFamily: fonts.body, fontSize: 14.5, lineHeight: 20, color: text.onDarkSoft, marginTop: 2 },
  button: { borderRadius: radius.button, paddingVertical: 14, alignItems: 'center' },
  pressed: { transform: [{ translateY: 3 }] },
  buttonText: { fontFamily: fonts.black, fontSize: 17, color: navy },
});
