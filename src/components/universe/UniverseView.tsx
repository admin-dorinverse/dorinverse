// What a friend's universe shows: their big avatar with "<username>'s universe" and when they joined, how they're
// doing, and a quiet "Remove friend" at the bottom. While nothing is saved yet it shows their avatar from the friends
// list and a spinner (or a no-internet message); when the two aren't friends it shows a calm message instead.

import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { AuthButton } from '@/components/common/AuthButton';
import { CalmMessage } from '@/components/common/CalmMessage';
import { PersonHero } from '@/components/common/PersonHero';
import { text } from '@/theme/colors';
import type { FriendPerson, FriendUniverseLook } from '@/types/friends';
import { UniverseSection } from './UniverseSection';
import { UniverseStats } from './UniverseStats';

/** The months' names, for "Joined March 2026". */
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** "Joined March 2026" from the server's date text, or nothing when the date can't be read. */
function joinedLine(joinedAt: string): string | undefined {
  const date = new Date(joinedAt);
  return Number.isNaN(date.getTime()) ? undefined : `Joined ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

/** Props for the universe's view. */
type UniverseViewProps = {
  /** What the server (or the phone's saved copy) says, or undefined until it is known. */
  look: FriendUniverseLook | undefined;
  /** The friend from the friends list, to show while their universe loads; undefined when not on it. */
  friend: FriendPerson | undefined;
  /** What went wrong when asking the server failed and nothing is saved, or null. */
  failed: string | null;
  /** True while the server is being asked again. */
  retrying: boolean;
  /** Asks the server again. */
  onRetry: () => void;
  /** Goes back to the page before. */
  onBack: () => void;
  /** Opens the "Remove friend" sheet. */
  onRemove: () => void;
};

/** The friend's universe, or a calm message. */
export function UniverseView({ look, friend, failed, retrying, onRetry, onBack, onRemove }: UniverseViewProps) {
  if (look?.status === 'not_friends') {
    return (
      <CalmMessage
        title="You’re not friends right now"
        words="Only friends can visit each other’s universe. To be friends again, open their friend code and send a request."
        buttonLabel="Back"
        onPress={onBack}
      />
    );
  }
  if (look?.status === 'ok') {
    const name = look.person.username;
    return (
      <View style={styles.wrap}>
        <PersonHero username={name} title={`${name}’s universe`} line={joinedLine(look.joinedAt)} />
        <UniverseSection heading="HOW THEY’RE DOING">
          <UniverseStats universe={look} />
        </UniverseSection>
        {/* Their constellations and collections join here as more sections once the server shares them. */}
        <View style={styles.bottom}>
          <AuthButton look="link" label="Remove friend" onPress={onRemove} />
        </View>
      </View>
    );
  }
  return (
    <View style={styles.wrap}>
      {friend && <PersonHero username={friend.username} title={`${friend.username}’s universe`} />}
      {failed ? (
        <CalmMessage title="Couldn’t open this universe" words={failed} buttonLabel="Try again" busy={retrying} onPress={onRetry} />
      ) : (
        <ActivityIndicator style={styles.spinner} color={text.goldNote} accessibilityLabel="Opening their universe" />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 24 },
  bottom: { paddingTop: 16 },
  spinner: { paddingVertical: 60 },
});
