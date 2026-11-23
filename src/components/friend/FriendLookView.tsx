// What an opened friend code shows: the code owner's big avatar and username with the one action for how you stand,
// or a calm message when the code isn't working, when there were too many tries, or when there's no internet.
// Nothing else about the person shows until they are friends.

import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { CalmMessage } from '@/components/common/CalmMessage';
import { PersonHero } from '@/components/common/PersonHero';
import { text } from '@/theme/colors';
import type { FriendCodeLook } from '@/types/friends';
import { FriendAction } from './FriendAction';

/** Props for the opened code's view. */
type FriendLookViewProps = {
  /** The code that was opened. */
  code: string;
  /** What the server said about the code, or undefined until it answers. */
  look: FriendCodeLook | undefined;
  /** What went wrong when asking the server failed and there's nothing to show, or null. */
  failed: string | null;
  /** True while the server is being asked again. */
  retrying: boolean;
  /** Asks the server again. */
  onRetry: () => void;
  /** Goes back to the page before. */
  onBack: () => void;
  /** Opens the code owner's universe, once the two are friends. */
  onOpenUniverse: (friendId: string) => void;
};

/** The opened friend code: the person and an action, or a calm message. */
export function FriendLookView({ code, look, failed, retrying, onRetry, onBack, onOpenUniverse }: FriendLookViewProps) {
  if (look?.status === 'ok') {
    return (
      <View style={styles.wrap}>
        <PersonHero username={look.person.username} title={look.person.username} />
        <FriendAction code={code} relation={look.relation} requestId={look.requestId} onOpenUniverse={() => onOpenUniverse(look.person.id)} />
      </View>
    );
  }
  if (look?.status === 'not_found' || code.trim() === '') {
    return (
      <CalmMessage
        title="This code isn’t working"
        words="It may be an old code: they might have made a new one. Ask them to send you their code again."
        buttonLabel="Back"
        onPress={onBack}
      />
    );
  }
  if (look?.status === 'slow_down') {
    return (
      <CalmMessage
        title="Too many tries"
        words="That’s a lot of codes in a short time. Wait a few minutes, then open the code again."
        buttonLabel="Back"
        onPress={onBack}
      />
    );
  }
  if (failed) {
    return (
      <CalmMessage
        title="Couldn’t open this code"
        words={failed}
        buttonLabel="Try again"
        busy={retrying}
        onPress={onRetry}
      />
    );
  }
  return <ActivityIndicator style={styles.spinner} color={text.goldNote} accessibilityLabel="Looking up the code" />;
}

const styles = StyleSheet.create({
  wrap: { gap: 24 },
  spinner: { paddingVertical: 60 },
});
