// A friend's universe, opened from their friend code page or the friends list: their avatar, when they joined and
// how they're doing, for friends only. It opens at once from the copy saved on the phone and refreshes in the
// background. "Remove friend" asks once more in a sheet, then goes back.

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { DrillHeader } from '@/components/common/DrillHeader';
import { StillSky } from '@/components/sky/StillSky';
import { RemoveFriendSheet } from '@/components/universe/RemoveFriendSheet';
import { UniverseView } from '@/components/universe/UniverseView';
import { useFriends, useFriendUniverse } from '@/data/queries/friends';
import { gutter } from '@/theme/spacing';
import type { FriendUniverseLook } from '@/types/friends';

/** A friend's universe the server has shared. */
type SharedUniverse = Extract<FriendUniverseLook, { status: 'ok' }>;

/** What shows when a failure came with no words of its own. */
const SOMETHING_WRONG = 'Something went wrong. Please try again.';

/** The friend's universe page. */
export default function FriendUniversePage() {
  const router = useRouter();
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const universe = useFriendUniverse(id);
  const friend = useFriends().data?.find((one) => one.id === id);
  // The universe as it was when "Remove friend" was tapped. It stays shown while the sheet is open and while the
  // page goes back, so the "not friends" message never flashes after removing.
  const [removing, setRemoving] = useState<SharedUniverse | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const look = removing ?? universe.data;

  /** Goes back, or to the sky when there is no page before. */
  const back = () => (router.canGoBack() ? router.back() : router.replace('/'));

  /** Opens the "Remove friend" sheet for the universe shown now. */
  const askToRemove = () => {
    if (universe.data?.status !== 'ok') return;
    setRemoving(universe.data);
    setSheetOpen(true);
  };

  /** Closes the sheet; they stay friends and the page shows the latest again. */
  const keepFriend = () => {
    setSheetOpen(false);
    setRemoving(null);
  };

  /** After removing: the sheet closes and the page goes back. */
  const afterRemoved = () => {
    setSheetOpen(false);
    back();
  };

  return (
    <View style={styles.page}>
      <StillSky />
      <DrillHeader title="Friend" onBack={back} />
      <ScrollView contentContainerStyle={styles.content}>
        <UniverseView
          look={look}
          friend={friend}
          failed={universe.isError ? universe.error.message || SOMETHING_WRONG : null}
          retrying={universe.isFetching}
          onRetry={() => void universe.refetch()}
          onBack={back}
          onRemove={askToRemove}
        />
      </ScrollView>
      {removing && (
        <RemoveFriendSheet open={sheetOpen} friendId={removing.person.id} username={removing.person.username} onClose={keepFriend} onRemoved={afterRemoved} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  content: { paddingHorizontal: gutter, paddingTop: 8, paddingBottom: 40, width: '100%', maxWidth: 560, alignSelf: 'center' },
});
