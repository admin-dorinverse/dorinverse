// A person's round avatar: the first letter of their username on their own color, with a thin white ring. Used in
// the top bar, on the Profile page, on a friend's page, in their universe and on Notifications. The avatar maker
// comes later; until then everyone has this one.

import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { friends } from '@/theme/friendsColors';
import { fonts } from '@/theme/text';

/** The same color for the same username every time, in any capitals. No username gets the first color. */
export function avatarColorOf(username: string | null | undefined): string {
  let sum = 0;
  for (const ch of (username ?? '').trim().toLowerCase()) sum = (sum + ch.charCodeAt(0)) % friends.avatars.length;
  return friends.avatars[sum];
}

/** Props for a person's avatar. */
type PersonAvatarProps = {
  /** Their username; its first letter is shown. Empty or missing while it is still unknown (a "?" shows). */
  username: string | null | undefined;
  /** Width and height. */
  size: number;
};

/** A round avatar with the username's first letter. */
export const PersonAvatar = memo(function PersonAvatar({ username, size }: PersonAvatarProps) {
  const letter = (username ?? '').trim().charAt(0).toUpperCase() || '?';
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.circle, { width: size, height: size, borderRadius: size / 2, borderWidth: Math.max(1.5, size / 24), backgroundColor: avatarColorOf(username) }]}
    >
      <Text style={[styles.letter, { fontSize: size * 0.46 }]}>{letter}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center', borderColor: friends.avatarRing },
  letter: { fontFamily: fonts.black, color: friends.avatarInk, includeFontPadding: false },
});
