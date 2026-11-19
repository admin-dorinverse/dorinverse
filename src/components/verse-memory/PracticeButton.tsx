// A practice button under the index card: gold for the main step ("Hide more", "Record"), clear glass for the
// quieter one ("Build it again"), or red while recording.

import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, type GestureResponderEvent } from 'react-native';
import { playSound } from '@/components/common/sounds';
import { bakery, navy, reader, text } from '@/theme/colors';
import { mixColor } from '@/theme/mixColor';
import { fonts } from '@/theme/text';
import { verseMemory } from '@/theme/verseMemoryColors';

/** The button's looks. */
type ButtonLook = 'gold' | 'ghost' | 'red';

/** Props for a practice button. */
type PracticeButtonProps = {
  /** The words on the button. */
  label: ReactNode;
  /** Gold, clear glass or red. */
  look?: ButtonLook;
  /** Runs when tapped, after a tap sound. */
  onPress?: () => void;
  /** Runs when a finger goes down and lifts, for "hold" buttons. These play no tap sound of their own. */
  onPressIn?: (e: GestureResponderEvent) => void;
  onPressOut?: (e: GestureResponderEvent) => void;
  /** True while the button shows as held down. */
  held?: boolean;
};

/** The fill color of each look. */
const FILL: Record<ButtonLook, string> = { gold: bakery.gold, ghost: reader.surface, red: verseMemory.recording };

/** One practice button, the full width of its row. */
export function PracticeButton({ label, look = 'gold', onPress, onPressIn, onPressOut, held = false }: PracticeButtonProps) {
  const solid = look !== 'ghost';
  return (
    <Pressable
      accessibilityRole="button"
      onPress={
        onPress &&
        (() => {
          playSound('tap');
          onPress();
        })
      }
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: held ? verseMemory.chipOn : FILL[look] },
        solid ? { boxShadow: `0 3px 0 ${mixColor(FILL[look], 0.55, '#000000')}` } : styles.ghost,
        (pressed || held) && styles.pressed,
      ]}
    >
      <Text style={[styles.label, { color: solid && !held ? navy : text.onDark }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { width: '100%', borderRadius: 16, paddingVertical: 13, alignItems: 'center' },
  ghost: { borderWidth: 1, borderColor: reader.edge },
  pressed: { transform: [{ translateY: 2 }], boxShadow: 'none' },
  label: { fontFamily: fonts.black, fontSize: 15 },
});
