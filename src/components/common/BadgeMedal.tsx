// A badge's placeholder picture: one emoji on a round medal, gold when earned and faded when not, with its level's
// number at the bottom, like Duolingo's. Used on Profile, the Badges page and the reward pop-up. Real art comes later.

import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { badgeColors, badgeSizes } from '@/theme/badgeColors';
import { fonts } from '@/theme/text';

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
  /** The number at the bottom, like "13", or empty for none. */
  mark?: string;
};

/** One round medal. Drawn only when its badge changes. */
export const BadgeMedal = memo(function BadgeMedal({ art, earned, size, artSize, mark = '' }: BadgeMedalProps) {
  return (
    <View
      style={[
        styles.medal,
        { width: size, height: size, borderRadius: size / 2 },
        earned ? styles.earned : styles.locked,
      ]}
    >
      <Text style={[styles.art, { fontSize: artSize }, !earned && styles.lockedArt]}>{art}</Text>
      {mark !== '' && (
        <Text style={[styles.mark, { fontSize: size * badgeSizes.markShare, bottom: -size * badgeSizes.markDrop }, earned ? styles.earnedMark : styles.lockedMark]}>
          {mark}
        </Text>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  medal: { alignItems: 'center', justifyContent: 'center', borderWidth: badgeSizes.rim },
  earned: { backgroundColor: badgeColors.earnedFill, borderColor: badgeColors.earnedRim },
  locked: { backgroundColor: badgeColors.lockedFill, borderColor: badgeColors.lockedRim },
  art: { includeFontPadding: false, textAlign: 'center' },
  lockedArt: { opacity: badgeColors.lockedArtOpacity },
  mark: { position: 'absolute', fontFamily: fonts.black, includeFontPadding: false, textShadowRadius: 3, textShadowOffset: { width: 0, height: 1 } },
  earnedMark: { color: badgeColors.markInk, textShadowColor: badgeColors.markShadow },
  lockedMark: { color: badgeColors.lockedName, textShadowRadius: 0 },
});
