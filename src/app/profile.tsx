// The Profile page, opened from the avatar at the top of the Sky, Collections and Bible Crew tabs: the person's big
// avatar and username, their Friends list (tapping a friend opens their universe), and a QR button that pops up
// their friend card with its QR code and Share link. It opens at once from what is saved on the phone.

import { useRouter, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DrillHeader } from '@/components/common/DrillHeader';
import { FriendCodeCard } from '@/components/profile/FriendCodeCard';
import { FriendRow, NoFriendsYet, type NoFriendsReason } from '@/components/profile/FriendRow';
import { ProfileTop } from '@/components/profile/ProfileTop';
import { StillSky } from '@/components/sky/StillSky';
import { useAccount } from '@/data/account';
import { useFriends } from '@/data/queries/friends';
import { gutter } from '@/theme/spacing';
import type { Friend } from '@/types/friends';

/** The Account page's address. */
const ACCOUNT = '/account' as Href;

/** The Profile page. */
export default function ProfilePage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { username } = useAccount();
  const friends = useFriends();
  const list = friends.data;
  const [codeOpen, setCodeOpen] = useState(false);

  /** Opens a friend's universe. Kept the same between redraws, so the friend rows don't redraw. */
  const openFriend = useCallback((friendId: string) => router.push(`/universe/${encodeURIComponent(friendId)}` as Href), [router]);

  /** Draws one friend's row. */
  const renderFriend = useCallback(({ item }: { item: Friend }) => <FriendRow friend={item} onOpen={openFriend} />, [openFriend]);

  const emptyReason: NoFriendsReason = list ? 'none' : friends.isError ? 'offline' : 'waiting';

  return (
    <View style={styles.page}>
      <StillSky />
      <DrillHeader title="Profile" onBack={() => router.back()} />
      <FlatList
        data={list ?? []}
        keyExtractor={(friend) => friend.id}
        renderItem={renderFriend}
        ListHeaderComponent={
          <ProfileTop
            username={username ?? ''}
            friendCount={list ? list.length : null}
            onOpenAccount={() => router.push(ACCOUNT)}
            onOpenCode={() => setCodeOpen(true)}
          />
        }
        ListEmptyComponent={<NoFriendsYet reason={emptyReason} />}
        initialNumToRender={10}
        windowSize={7}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
      />
      <FriendCodeCard open={codeOpen} onClose={() => setCodeOpen(false)} username={username ?? ''} />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  content: { paddingHorizontal: gutter, paddingTop: 8, width: '100%', maxWidth: 560, alignSelf: 'center' },
});
