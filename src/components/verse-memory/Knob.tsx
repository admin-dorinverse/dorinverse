// A round two-way knob, like the prototype's oven dials: tapping it turns the pointer half a turn and lights it
// orange while it is on. The turn is one short spring, and nothing moves after it settles.

import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { playSound } from '@/components/common/sounds';
import { bakery } from '@/theme/colors';
import { fonts } from '@/theme/text';
import { knob } from '@/theme/verseMemoryColors';

/** The dial's size, and how far from its middle the two marks sit. */
const DIAL = 74;
const MARK_RADIUS = 32;

/** The springy turn from the prototype (a quick overshoot that settles). */
const TURN = { damping: 11, stiffness: 180, mass: 0.7 } as const;

/** Props for a knob. */
type KnobProps = {
  /** True when the knob is on (lit, pointer turned). */
  on: boolean;
  /** The words under the knob, like "Blanks on". */
  label: string;
  /** Flips the knob. */
  onToggle: () => void;
};

/** One knob with its label. */
export function Knob({ on, label, onToggle }: KnobProps) {
  const turn = useSharedValue(on ? 180 : 0);
  useEffect(() => {
    turn.set(withSpring(on ? 180 : 0, TURN));
  }, [on, turn]);
  const pointer = useAnimatedStyle(() => ({ transform: [{ rotate: `${turn.get()}deg` }] }));

  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityRole="switch"
        accessibilityState={{ checked: on }}
        accessibilityLabel={label}
        onPress={() => {
          playSound('tap');
          onToggle();
        }}
        style={[styles.dial, on && styles.lit]}
      >
        {[0, 180].map((angle) => (
          <View
            key={angle}
            style={[styles.mark, { left: DIAL / 2 + MARK_RADIUS * Math.sin((angle * Math.PI) / 180) - 2.5, top: DIAL / 2 - MARK_RADIUS * Math.cos((angle * Math.PI) / 180) - 2.5 }]}
          />
        ))}
        <Animated.View style={[styles.knob, pointer]}>
          <View style={[styles.pointer, { backgroundColor: on ? knob.pointerOn : knob.pointer }]} />
        </Animated.View>
      </Pressable>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 6, width: 96 },
  dial: {
    width: DIAL,
    height: DIAL,
    borderRadius: DIAL / 2,
    backgroundImage: `radial-gradient(circle at 50% 40%, ${knob.dialLight}, ${knob.dialEdge} 75%)`,
    boxShadow: `0 3px 8px rgba(0,0,0,0.18), inset 0 1px 2px ${knob.faceLight}`,
  },
  lit: { boxShadow: `0 0 16px 5px ${knob.glow}, 0 3px 8px rgba(0,0,0,0.18), inset 0 0 10px ${knob.glowInside}` },
  mark: { position: 'absolute', width: 5, height: 5, borderRadius: 3, backgroundColor: knob.mark },
  knob: {
    position: 'absolute',
    left: DIAL / 2 - 22,
    top: DIAL / 2 - 22,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundImage: `radial-gradient(circle at 50% 35%, ${knob.faceLight}, ${knob.faceEdge} 80%)`,
    boxShadow: '0 2px 5px rgba(0,0,0,0.25)',
  },
  pointer: { position: 'absolute', left: 19.5, top: 3, width: 5, height: 16, borderRadius: 4 },
  label: { fontFamily: fonts.extraBold, fontSize: 10.5, lineHeight: 13, minHeight: 26, textAlign: 'center', color: bakery.gold },
});
