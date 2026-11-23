// One friend in the Profile page's Friends list (their avatar and username; tapping opens their universe), and what
// the list shows when there is no one in it yet. Nothing here animates except the small press shrink.

import { memo } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { GlassSurface } from '@/components/common/Glass';
import { PersonAvatar } from '@/components/common/PersonAvatar';
import { playSound } from '@/components/common/sounds';
import { text } from '@/theme/colors';
import { profile, profileSizes } from '@/theme/profileColors';
import { radius } from '@/theme/spacing';
import { fonts, textStyles } from '@/theme/text';
import type { Friend } from '@/types/friends';

/** Props for one friend's row. */
type FriendRowProps = {
  /** The friend. */
  friend: Friend;
  /** Opens this friend's universe, by their id. */
  onOpen: (friendId: string) => void;
};

/** A friend's row: avatar, username and a small arrow. Kept the same between redraws unless the friend changes. */
export const FriendRow = memo(function FriendRow({ friend, onOpen }: FriendRowProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${friend.username}. Open their universe`}
      onPress={() => {
        playSound('tap');
        onOpen(friend.id);
      }}
      style={({ pressed }) => [styles.press, pressed && styles.pressed]}
    >
      <GlassSurface style={styles.row}>
        <PersonAvatar username={friend.username} size={profileSizes.friendAvatar} />
        <Text style={styles.name} numberOfLines={1}>
          {friend.username}
        </Text>
        <Text style={styles.arrow}>›</Text>
      </GlassSurface>
    </Pressable>
  );
});

/** Why the list is empty: no friends yet, the list is still on its way, or it couldn't be fetched. */
export type NoFriendsReason = 'none' | 'waiting' | 'offline';

/** The words for each reason the list is empty. */
const EMPTY_WORDS: Record<NoFriendsReason, string> = {
  none: 'No friends yet. To add someone, tap the QR button at the top and let them scan your code, or share your link. Once they say yes, they show up here.',
  waiting: 'Getting your friends…',
  offline: 'Your friends show up here once you’re online.',
};

/** Props for the empty list's message. */
type NoFriendsYetProps = {
  /** Why the list is empty. */
  reason: NoFriendsReason;
};

/** The message shown in place of the Friends list when it has no one in it. */
export function NoFriendsYet({ reason }: NoFriendsYetProps) {
  return (
    <GlassSurface style={styles.empty}>
      <Text style={[textStyles.body, styles.emptyWords]}>{EMPTY_WORDS[reason]}</Text>
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  press: { marginBottom: 10 },
  row: { borderRadius: radius.card, paddingVertical: 10, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 14 },
  name: { flex: 1, fontFamily: fonts.black, fontSize: 17, color: text.onDark },
  arrow: { fontFamily: fonts.black, fontSize: 26, color: profile.rowArrow, marginTop: -3 },
  pressed: { transform: [{ scale: 0.98 }] },
  empty: { borderRadius: radius.card, padding: 18, marginBottom: 10 },
  emptyWords: { color: text.onDarkSoft, textAlign: 'center' },
});
