// The Notifications page, opened by the bell in the Sky tab's dock: friend requests (with Approve and Reject) and
// friends who said yes, newest first. It opens at once from the copy saved on the phone and fetches the newest in
// the background. Opening it marks everything seen, while the new rows keep a light highlight until it closes.

import { useRouter, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DrillHeader } from '@/components/common/DrillHeader';
import { LoadState } from '@/components/common/LoadState';
import { NoNewsYet, OfflineNote } from '@/components/notifications/NewsNote';
import { NotificationRow } from '@/components/notifications/NotificationRow';
import { useNewWhileOpen } from '@/components/notifications/useNewWhileOpen';
import { StillSky } from '@/components/sky/StillSky';
import { useNotifications, useUnreadCount } from '@/data/queries/friends';
import { gutter } from '@/theme/spacing';

/** The Notifications page. */
export default function NotificationsPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const news = useNotifications();
  const unread = useUnreadCount();
  const fresh = useNewWhileOpen(news.data, news.isFetching, unread);
  // "5 min ago" is worked out from when the page opened, so it isn't redone every time a row redraws.
  const [now] = useState(() => Date.now());

  /** Opens a friend's universe. */
  const openFriend = useCallback((personId: string) => router.push(`/universe/${personId}` as Href), [router]);

  return (
    <View style={styles.page}>
      <StillSky />
      <DrillHeader title="Notifications" onBack={() => router.back()} />
      {news.data ? (
        <FlatList
          data={news.data}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <NotificationRow item={item} isNew={fresh.has(item.id)} now={now} onOpenFriend={openFriend} />}
          extraData={fresh}
          ListHeaderComponent={news.isError ? <OfflineNote /> : undefined}
          ListEmptyComponent={<NoNewsYet />}
          initialNumToRender={10}
          windowSize={7}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 40 }]}
        />
      ) : (
        <LoadState failed={news.isError} onRetry={() => news.refetch()} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  list: { paddingHorizontal: gutter, paddingTop: 4, gap: 10, width: '100%', maxWidth: 560, alignSelf: 'center' },
});
