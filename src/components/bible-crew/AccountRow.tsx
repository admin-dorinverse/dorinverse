// A small glass row at the bottom of the Bible Crew tab: "Signed in as" with the username everyone sees on family
// calls, and a pill that opens the Account page (sign out, delete account). It stays still; nothing animates.

import { Pressable, StyleSheet, Text, View } from 'react-native';
import { GlassSurface } from '@/components/common/Glass';
import { playSound } from '@/components/common/sounds';
import { useAccount } from '@/data/account';
import { navy, tabs, text } from '@/theme/colors';
import { radius } from '@/theme/spacing';
import { fonts } from '@/theme/text';

/** Props for the account row. */
type AccountRowProps = {
  /** Opens the Account page. */
  onOpen: () => void;
};

/** The "Signed in as" row with its Account pill. */
export function AccountRow({ onOpen }: AccountRowProps) {
  const { username } = useAccount();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Account. Signed in as ${username ?? 'you'}`}
      onPress={() => {
        playSound('tap');
        onOpen();
      }}
      style={({ pressed }) => pressed && styles.pressed}
    >
      <GlassSurface style={styles.row}>
        <View style={styles.words}>
          <Text style={styles.small}>Signed in as</Text>
          <Text style={styles.name} numberOfLines={1}>
            {username ?? ''}
          </Text>
        </View>
        <View style={styles.pill}>
          <Text style={styles.pillText}>Account</Text>
        </View>
      </GlassSurface>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { borderRadius: radius.card, paddingVertical: 14, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 12 },
  words: { flex: 1, gap: 2 },
  small: { fontFamily: fonts.extraBold, fontSize: 12.5, color: text.onDarkSoft },
  name: { fontFamily: fonts.black, fontSize: 17, color: text.onDark },
  pill: { borderRadius: radius.pill, backgroundColor: tabs.selectedFill, paddingVertical: 8, paddingHorizontal: 14 },
  pillText: { fontFamily: fonts.black, fontSize: 13.5, color: navy },
  pressed: { transform: [{ scale: 0.98 }] },
});
