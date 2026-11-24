// The card that slides up when a badge is tapped on the Profile page: its name and its big medal, gold when earned.

import { StyleSheet, View } from 'react-native';
import { GlassSheet } from '@/components/common/GlassSheet';
import { badgeSizes } from '@/theme/badgeColors';
import type { ShownBadge } from '@/types/badges';
import { BadgeMedal } from '@/components/common/BadgeMedal';

/** Props for the badge card. */
type BadgeCardProps = {
  /** The badge shown, or null when the card is closed. */
  badge: ShownBadge | null;
  /** Closes the card. */
  onClose: () => void;
};

/** One badge, up close. */
export function BadgeCard({ badge, onClose }: BadgeCardProps) {
  return (
    <GlassSheet open={badge != null} onClose={onClose} title={badge?.name ?? ''}>
      {badge && (
        <View style={styles.body}>
          <BadgeMedal art={badge.art} earned={badge.earned} size={badgeSizes.bigMedal} artSize={badgeSizes.bigArt} />
        </View>
      )}
    </GlassSheet>
  );
}

const styles = StyleSheet.create({
  body: { alignItems: 'center', gap: 12, paddingTop: 8, paddingBottom: 8 },
});
