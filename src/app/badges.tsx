// The Badges page, opened from the Badges row on the Profile page: every badge as a medal with its name, three to a
// row, earned ones first. Tapping one opens its card. It opens at once from what is on the phone.

import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BadgeCard } from '@/components/badges/BadgeCard';
import { BadgeTile } from '@/components/badges/BadgeTile';
import { DrillHeader } from '@/components/common/DrillHeader';
import { StillSky } from '@/components/sky/StillSky';
import { useBadges } from '@/data/queries/badges';
import { gutter } from '@/theme/spacing';
import type { ShownBadge } from '@/types/badges';

/** The Badges page. */
export default function BadgesPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { badges } = useBadges();
  const [open, setOpen] = useState<ShownBadge | null>(null);

  /** Opens a badge's card. Kept the same between redraws, so the tiles don't redraw. */
  const openBadge = useCallback((badge: ShownBadge) => setOpen(badge), []);

  /** Draws one badge. */
  const renderBadge = useCallback(({ item }: { item: ShownBadge }) => <BadgeTile badge={item} onOpen={openBadge} />, [openBadge]);

  return (
    <View style={styles.page}>
      <StillSky />
      <DrillHeader title="Badges" onBack={() => router.back()} />
      <FlatList
        data={badges}
        keyExtractor={(b) => b.id}
        renderItem={renderBadge}
        numColumns={3}
        initialNumToRender={12}
        windowSize={7}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 40 }]}
      />
      <BadgeCard badge={open} onClose={() => setOpen(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  list: { paddingHorizontal: gutter, paddingTop: 12, width: '100%', maxWidth: 560, alignSelf: 'center' },
});
