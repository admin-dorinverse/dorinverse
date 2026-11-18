// The top of a page opened from a card or a list, as in Constellations: a round back button, the page title,
// and room for buttons on the right.

import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { text } from '@/theme/colors';
import { fonts } from '@/theme/text';
import { playSound } from './sounds';

/** Props for the page header. */
type DrillHeaderProps = {
  /** The page title. */
  title: string;
  /** Goes back to the page before. */
  onBack: () => void;
  /** Buttons shown on the right. */
  right?: ReactNode;
};

/** The header with a back button and a title. */
export function DrillHeader({ title, onBack, right }: DrillHeaderProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingTop: insets.top + 12 }]}>
      <RoundButton label="Back" onPress={onBack}>
        <Text style={styles.arrow}>←</Text>
      </RoundButton>
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      {right}
    </View>
  );
}

/** Props for a round glass button. */
type RoundButtonProps = {
  /** What the button does, read out by screen readers. */
  label: string;
  /** Runs when tapped, after a tap sound. */
  onPress: () => void;
  /** The icon or letters inside. */
  children: ReactNode;
};

/** A round glass button, like the back button. */
export function RoundButton({ label, onPress, children }: RoundButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        playSound('tap');
        onPress();
      }}
      style={({ pressed }) => [styles.round, pressed && styles.pressed]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingBottom: 10 },
  title: { flex: 1, fontFamily: fonts.black, fontSize: 21, color: text.onDark },
  round: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { transform: [{ scale: 0.94 }] },
  arrow: { fontFamily: fonts.black, fontSize: 20, color: text.onDark },
});
