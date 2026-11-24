// A badge's own page, opened by tapping a badge on the Badges page, like Duolingo's: a close button and, once earned,
// a share button at the top, then the big medal, the day it was earned and how. It opens at once from the phone.

import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BadgeDetail, badgeShareWords } from '@/components/badges/BadgeDetail';
import { CloseIcon, ShareIcon } from '@/components/badges/BadgeIcons';
import { shareBadge } from '@/components/badges/badgeShare';
import { RoundButton } from '@/components/common/DrillHeader';
import { StillSky } from '@/components/sky/StillSky';
import { useBadges } from '@/data/queries/badges';
import { useReachedOn } from '@/data/queries/rewards';
import { badgeSizes } from '@/theme/badgeColors';
import { text } from '@/theme/colors';

/** A badge's page. */
export default function BadgePage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const badge = useBadges().badges.find((b) => b.id === id);
  const reachedOn = useReachedOn(id, badge?.level ?? 0);

  return (
    <View style={[styles.page, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 40 }]}>
      <StillSky />
      <View style={styles.top}>
        <RoundButton label="Close" onPress={() => router.back()}>
          <CloseIcon color={text.onDark} size={badgeSizes.icon} />
        </RoundButton>
        {badge && badge.level > 0 && (
          <RoundButton label="Share this badge" onPress={() => void shareBadge(badgeShareWords(badge)).catch(() => {})}>
            <ShareIcon color={text.onDark} size={badgeSizes.icon} />
          </RoundButton>
        )}
      </View>
      {badge && <BadgeDetail badge={badge} reachedOn={reachedOn} />}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  top: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 14 },
});
