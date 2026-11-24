// A badge's placeholder picture: one emoji on a round medal, gold when earned and faded when not. The real badge
// art replaces this later.

import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { badgeColors, badgeSizes } from '@/theme/badgeColors';

/** Props for a medal. */
type BadgeMedalProps = {
  /** The emoji to show. */
  art: string;
  /** True when the badge is earned. */
  earned: boolean;
  /** The medal's width and height. */
  size: number;
  /** The emoji's size. */
  artSize: number;
};

/** One round medal. Drawn only when its badge changes. */
export const BadgeMedal = memo(function BadgeMedal({ art, earned, size, artSize }: BadgeMedalProps) {
  return (
    <View
      style={[
        styles.medal,
        { width: size, height: size, borderRadius: size / 2 },
        earned ? styles.earned : styles.locked,
      ]}
    >
      <Text style={[styles.art, { fontSize: artSize }, !earned && styles.lockedArt]}>{art}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  medal: { alignItems: 'center', justifyContent: 'center', borderWidth: badgeSizes.rim },
  earned: { backgroundColor: badgeColors.earnedFill, borderColor: badgeColors.earnedRim },
  locked: { backgroundColor: badgeColors.lockedFill, borderColor: badgeColors.lockedRim },
  art: { includeFontPadding: false, textAlign: 'center' },
  lockedArt: { opacity: badgeColors.lockedArtOpacity },
});
