// The Badges part of the Profile page, like Duolingo's: a "BADGES ›" heading and one row of medals with no names,
// earned ones first. Tapping anywhere on it opens the Badges page with every badge and its name.

import { useRouter, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BadgeMedal } from '@/components/common/BadgeMedal';
import { playSound } from '@/components/common/sounds';
import { medalMark } from '@/data/badgeList';
import { useBadges } from '@/data/queries/badges';
import { badgeSizes } from '@/theme/badgeColors';
import { text } from '@/theme/colors';
import { fonts, textStyles } from '@/theme/text';

/** The Badges page's address. */
const BADGES_PAGE = '/badges' as Href;

/** The heading and the first few medals. */
export function BadgeShelf() {
  const router = useRouter();
  const { badges } = useBadges();
  const first = badges.slice(0, badgeSizes.previewCount);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Badges. See all your badges"
      onPress={() => {
        playSound('tap');
        router.push(BADGES_PAGE);
      }}
      style={({ pressed }) => [styles.shelf, pressed && styles.pressed]}
    >
      <View style={styles.head}>
        <Text style={[textStyles.tabSubtitle, styles.heading]}>BADGES</Text>
        <Text style={styles.arrow}>›</Text>
      </View>
      <View style={styles.row}>
        {first.map((b) => (
          <BadgeMedal
            key={b.id}
            art={b.art}
            earned={b.level > 0}
            mark={medalMark(b, b.level)}
            size={badgeSizes.previewMedal}
            artSize={badgeSizes.previewArt}
          />
        ))}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shelf: { gap: 12 },
  pressed: { opacity: 0.8 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 },
  heading: { color: text.goldNote },
  arrow: { fontFamily: fonts.black, fontSize: 26, lineHeight: 28, color: text.goldNote },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4 },
});
