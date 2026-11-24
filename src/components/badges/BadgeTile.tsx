// One badge on the Badges page: its medal with its name under it, faded when not earned yet. Tapping it opens its card.

import { memo } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { BadgeMedal } from '@/components/common/BadgeMedal';
import { playSound } from '@/components/common/sounds';
import { badgeColors, badgeSizes } from '@/theme/badgeColors';
import { text } from '@/theme/colors';
import { fonts } from '@/theme/text';
import type { ShownBadge } from '@/types/badges';

/** Props for one badge tile. */
type BadgeTileProps = {
  /** The badge. */
  badge: ShownBadge;
  /** Opens its card. */
  onOpen: (badge: ShownBadge) => void;
};

/** A medal and its name. Drawn only when the badge changes. */
export const BadgeTile = memo(function BadgeTile({ badge, onOpen }: BadgeTileProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${badge.name}. ${badge.earned ? 'Earned' : 'Not earned yet'}`}
      onPress={() => {
        playSound('tap');
        onOpen(badge);
      }}
      style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
    >
      <BadgeMedal art={badge.art} earned={badge.earned} size={badgeSizes.gridMedal} artSize={badgeSizes.gridArt} />
      <Text style={[styles.name, !badge.earned && styles.lockedName]} numberOfLines={2}>
        {badge.name}
      </Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  tile: { flex: 1 / 3, alignItems: 'center', gap: 8, paddingHorizontal: 4, paddingBottom: 22 },
  pressed: { transform: [{ scale: 0.96 }] },
  name: { fontFamily: fonts.black, fontSize: 15, lineHeight: 19, color: text.onDark, textAlign: 'center' },
  lockedName: { color: badgeColors.lockedName },
});
