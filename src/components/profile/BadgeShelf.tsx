// The Badges part of the Profile page: a heading, then every badge in its group as a small
// medal with its name. Tapping one opens its card. Everything here is already on the phone.

import { memo, useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { playSound } from '@/components/common/sounds';
import { useBadges } from '@/data/queries/badges';
import { badgeColors, badgeSizes } from '@/theme/badgeColors';
import { text } from '@/theme/colors';
import { fonts, textStyles } from '@/theme/text';
import type { ShownBadge } from '@/types/badges';
import { BadgeCard } from './BadgeCard';
import { BadgeMedal } from '@/components/common/BadgeMedal';

/** Props for one badge on the shelf. */
type BadgeTileProps = {
  /** The badge. */
  badge: ShownBadge;
  /** Opens its card. */
  onOpen: (badge: ShownBadge) => void;
};

/** One badge: its medal and name. Drawn only when the badge changes. */
const BadgeTile = memo(function BadgeTile({ badge, onOpen }: BadgeTileProps) {
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
      <BadgeMedal art={badge.art} earned={badge.earned} size={badgeSizes.medal} artSize={badgeSizes.art} />
      <Text style={[styles.name, !badge.earned && styles.lockedName]} numberOfLines={2}>
        {badge.name}
      </Text>
    </Pressable>
  );
});

/** The badges heading, every group of badges, and the card a tapped badge opens. */
export function BadgeShelf() {
  const { groups } = useBadges();
  const [open, setOpen] = useState<ShownBadge | null>(null);

  /** Opens a badge's card. Kept the same between redraws, so the tiles don't redraw. */
  const openBadge = useCallback((badge: ShownBadge) => setOpen(badge), []);

  return (
    <View style={styles.shelf}>
      <Text style={[textStyles.tabSubtitle, styles.heading]} accessibilityRole="header">
        BADGES
      </Text>
      {groups.map(({ group, badges }) => (
        <View key={group} style={styles.group}>
          <Text style={styles.groupName}>{group}</Text>
          <View style={styles.grid}>
            {badges.map((b) => (
              <BadgeTile key={b.id} badge={b} onOpen={openBadge} />
            ))}
          </View>
        </View>
      ))}
      <BadgeCard badge={open} onClose={() => setOpen(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  shelf: { gap: 14 },
  heading: { color: text.goldNote, paddingHorizontal: 4 },
  group: { gap: 8 },
  groupName: { fontFamily: fonts.black, fontSize: 15, color: text.onDark, paddingHorizontal: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 12 },
  tile: { width: '25%', alignItems: 'center', gap: 6, paddingHorizontal: 2 },
  pressed: { transform: [{ scale: 0.96 }] },
  name: { fontFamily: fonts.extraBold, fontSize: 11.5, lineHeight: 14, color: text.onDark, textAlign: 'center' },
  lockedName: { color: badgeColors.lockedName },
});
