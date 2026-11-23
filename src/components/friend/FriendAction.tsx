// The one thing you can do on someone's friend code page, by how the two of you stand: Add friend, Request sent,
// Approve or Reject when they asked you, Go to their universe once you're friends, or a line when it's your own
// code. The server decides every answer; a failed tap shows its message here.

import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AuthButton } from '@/components/common/AuthButton';
import { answerFriendRequest, sendFriendRequest } from '@/data/queries/friends';
import { text } from '@/theme/colors';
import { friendPage } from '@/theme/friendPageColors';
import { fonts, textStyles } from '@/theme/text';
import type { FriendRelation } from '@/types/friends';

/** Which button is waiting on the server, or none. */
type Busy = 'add' | 'approve' | 'reject' | null;

/** Props for the friend code page's action. */
type FriendActionProps = {
  /** The code that was opened, to send the request with. */
  code: string;
  /** How the signed-in person stands with the code's owner. */
  relation: FriendRelation;
  /** The open request between the two, to approve or reject; null when there is none. */
  requestId: string | null;
  /** Opens the friend's universe. */
  onOpenUniverse: () => void;
};

/** The button (or buttons) for how the two stand. */
export function FriendAction({ code, relation, requestId, onOpenUniverse }: FriendActionProps) {
  const [busy, setBusy] = useState<Busy>(null);
  const [note, setNote] = useState('');

  /** Runs one server action with its button spinning; the page itself updates from the answer. */
  const run = async (which: Exclude<Busy, null>, work: () => Promise<unknown>) => {
    setNote('');
    setBusy(which);
    try {
      await work();
    } catch (e) {
      setNote(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(null);
    }
  };

  /** Approves or rejects their request. */
  const answer = (approve: boolean) => {
    if (requestId) void run(approve ? 'approve' : 'reject', () => answerFriendRequest(requestId, approve));
  };

  return (
    <View style={styles.wrap}>
      {relation === 'self' && <Text style={[textStyles.body, styles.line]}>This is your own code</Text>}
      {relation === 'none' && <AuthButton label="Add friend" busy={busy === 'add'} onPress={() => void run('add', () => sendFriendRequest(code))} />}
      {relation === 'sent' && (
        <>
          <AuthButton look="quiet" label="Request sent" disabled onPress={() => {}} />
          <Text style={[textStyles.body, styles.line]}>You’ll be friends once they say yes.</Text>
        </>
      )}
      {relation === 'received' && (
        <>
          <Text style={[textStyles.body, styles.line]}>They asked to be your friend.</Text>
          <AuthButton label="Approve" busy={busy === 'approve'} disabled={busy === 'reject' || !requestId} onPress={() => answer(true)} />
          <AuthButton look="quiet" label="Reject" busy={busy === 'reject'} disabled={busy === 'approve' || !requestId} onPress={() => answer(false)} />
        </>
      )}
      {relation === 'friends' && <AuthButton label="Go to their universe" onPress={onOpenUniverse} />}
      {note !== '' && <Text style={styles.note}>{note}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  line: { color: text.onDarkSoft, textAlign: 'center' },
  note: { fontFamily: fonts.bold, fontSize: 13.5, color: friendPage.problem, textAlign: 'center' },
});
