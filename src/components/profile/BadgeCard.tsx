// The card that slides up when a badge is tapped on the Profile page: its big medal, whether it is earned, and how
// to earn it.

import { StyleSheet, Text, View } from 'react-native';
import { GlassSheet } from '@/components/common/GlassSheet';
import { badgeColors, badgeSizes } from '@/theme/badgeColors';
import { text } from '@/theme/colors';
import { fonts, textStyles } from '@/theme/text';
import type { ShownBadge } from '@/types/badges';
import { BadgeMedal } from './BadgeMedal';

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
          <Text style={[styles.state, !badge.earned && styles.notYet]}>{badge.earned ? 'EARNED' : 'NOT YET'}</Text>
          <Text style={[textStyles.body, styles.how]}>{badge.howToEarn}</Text>
        </View>
      )}
    </GlassSheet>
  );
}

const styles = StyleSheet.create({
  body: { alignItems: 'center', gap: 12, paddingTop: 8, paddingBottom: 8 },
  state: { fontFamily: fonts.extraBold, fontSize: 13, letterSpacing: 1, color: badgeColors.earnedRim },
  notYet: { color: badgeColors.lockedName },
  how: { color: text.onDarkSoft, textAlign: 'center' },
});
