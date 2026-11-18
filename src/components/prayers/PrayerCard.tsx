// One collected prayer on the Prayers page: who prayed, the key line in its exact Bible words, and where the prayer
// runs. Tapping it opens the prayer's sheet.

import { Pressable, StyleSheet, Text } from 'react-native';
import { playSound } from '@/components/common/sounds';
import { prayers, reader } from '@/theme/colors';
import { fonts, readingFont } from '@/theme/text';
import type { PrayerCookie } from '@/types/cookie';

/** Props for one prayer. */
type PrayerCardProps = {
  /** The prayer to show. */
  cookie: PrayerCookie;
  /** Opens the prayer's sheet. */
  onOpen: (cookie: PrayerCookie) => void;
};

/** A prayer's card. */
export function PrayerCard({ cookie, onOpen }: PrayerCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        playSound('tap');
        onOpen(cookie);
      }}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <Text style={styles.who}>🕯️ {cookie.who} prayed</Text>
      <Text style={styles.line} numberOfLines={4}>
        “{cookie.keyLine}”
      </Text>
      <Text style={styles.ref}>{cookie.reference}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 20, padding: 16, gap: 6, marginBottom: 12, backgroundColor: reader.surface, borderWidth: 1, borderColor: reader.edge },
  pressed: { transform: [{ scale: 0.98 }] },
  who: { fontFamily: fonts.black, fontSize: 15, color: prayers.accent },
  line: { fontFamily: readingFont, fontSize: 17.5, lineHeight: 25, color: reader.text },
  ref: { fontFamily: fonts.extraBold, fontSize: 13, color: prayers.soft },
});
