// The top of the Profile page: the person's big avatar and username, a small Account button (sign out, delete
// account) with the square QR button beside it, and the Friends heading. Everything here is already on the phone.

import { Pressable, StyleSheet, Text, View } from 'react-native';
import { PersonAvatar } from '@/components/common/PersonAvatar';
import { playSound } from '@/components/common/sounds';
import { navy, tabs, text } from '@/theme/colors';
import { profileSizes } from '@/theme/profileColors';
import { radius } from '@/theme/spacing';
import { fonts, textStyles } from '@/theme/text';
import { FriendCodeButton } from './FriendCodeButton';

/** Props for the top of the Profile page. */
type ProfileTopProps = {
  /** The person's username, or empty while it is still unknown. */
  username: string;
  /** How many friends they have, or null while the list isn't known yet. */
  friendCount: number | null;
  /** Opens the Account page. */
  onOpenAccount: () => void;
  /** Opens the friend card with the person's QR code. */
  onOpenCode: () => void;
};

/** The avatar, username, Account and QR buttons, and the Friends heading. */
export function ProfileTop({ username, friendCount, onOpenAccount, onOpenCode }: ProfileTopProps) {
  return (
    <View style={styles.top}>
      <View style={styles.who}>
        <PersonAvatar username={username} size={profileSizes.bigAvatar} />
        <Text style={styles.name} numberOfLines={1}>
          {username}
        </Text>
        <View style={styles.buttons}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Account. Sign out or delete your account"
            onPress={() => {
              playSound('tap');
              onOpenAccount();
            }}
            hitSlop={6}
            style={({ pressed }) => [styles.accountPill, pressed && styles.pressed]}
          >
            <Text style={styles.accountText}>Account</Text>
          </Pressable>
          <FriendCodeButton onPress={onOpenCode} />
        </View>
      </View>
      <Text style={[textStyles.tabSubtitle, styles.heading]} accessibilityRole="header">
        {friendCount ? `FRIENDS · ${friendCount}` : 'FRIENDS'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { gap: 22, paddingBottom: 12 },
  who: { alignItems: 'center', gap: 10, paddingTop: 6 },
  name: { fontFamily: fonts.black, fontSize: 26, color: text.onDark, maxWidth: '100%' },
  buttons: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  accountPill: {
    height: profileSizes.topButton,
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: tabs.selectedFill,
    paddingHorizontal: 16,
  },
  accountText: { fontFamily: fonts.black, fontSize: 13.5, color: navy },
  pressed: { transform: [{ scale: 0.96 }] },
  heading: { color: text.goldNote, paddingHorizontal: 4 },
});
