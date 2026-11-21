// The calm note the orbit view shows once every stop of a lesson is baked. Until the steps after the stops are done,
// its button heads back to Papa Dorin's Bakery for them; after that it goes back to the lessons. It does not move.

import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassSurface } from '@/components/common/Glass';
import { playSound } from '@/components/common/sounds';
import { navy, text } from '@/theme/colors';
import { gutter, radius } from '@/theme/spacing';
import { fonts } from '@/theme/text';
import { KITCHEN_STEPS } from '@/types/lesson';

/** Props for the note. */
type AllBakedProps = {
  /** The constellation's color. */
  color: string;
  /** How many of the 3 steps after the stops are done. */
  kitchenDone: number;
  /** Opens the steps after the stops. */
  onHeadBack: () => void;
  /** Goes back to the lesson list. */
  onBack: () => void;
};

/** The note's words and button for each step: none done, some done, all done. */
function wording(kitchenDone: number): { title: string; note: string; button: string } {
  if (kitchenDone === 0) return { title: 'All cookies baked', note: 'Papa Dorin is waiting at the Bakery to give them a quality check.', button: "Head back to Papa Dorin's Bakery for a quality check" };
  if (kitchenDone < KITCHEN_STEPS.length) return { title: 'Back to the Bakery', note: 'Your cookies are waiting where you left off.', button: "Head back to Papa Dorin's Bakery" };
  return { title: 'All cookies baked', note: 'Every stop of this lesson is baked, and its verses are in your Bible.', button: 'Back to the lessons' };
}

/** "All cookies baked", with a button back to the lessons. */
export function AllBaked({ color, kitchenDone, onHeadBack, onBack }: AllBakedProps) {
  const insets = useSafeAreaInsets();
  const words = wording(kitchenDone);
  const inKitchen = kitchenDone < KITCHEN_STEPS.length;
  return (
    <View style={[styles.wrap, { bottom: insets.bottom + 22 }]}>
      <GlassSurface style={styles.card}>
        <View style={styles.row}>
          <View style={[styles.mark, { backgroundColor: color }]}>
            <Text style={styles.markText}>✓</Text>
          </View>
          <View style={styles.words}>
            <Text style={styles.title}>{words.title}</Text>
            <Text style={styles.note}>{words.note}</Text>
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            playSound('tap');
            if (inKitchen) onHeadBack();
            else onBack();
          }}
          style={({ pressed }) => [styles.button, { backgroundColor: color }, pressed && styles.pressed]}
        >
          <Text style={styles.buttonText}>{words.button}</Text>
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
  button: { borderRadius: radius.button, paddingVertical: 14, paddingHorizontal: 14, alignItems: 'center' },
  pressed: { transform: [{ translateY: 3 }] },
  buttonText: { fontFamily: fonts.black, fontSize: 17, color: navy, textAlign: 'center' },
});
