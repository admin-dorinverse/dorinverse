// One piece of news on the Notifications page: the person's avatar, what happened, and how long ago. A friend
// request shows Approve and Reject until it is answered, then how it ended. Rows about a friend open their universe.

import { memo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { PersonAvatar } from '@/components/common/PersonAvatar';
import { answerFriendRequest } from '@/data/queries/friends';
import { notifications } from '@/theme/notificationColors';
import { radius } from '@/theme/spacing';
import { fonts } from '@/theme/text';
import type { FriendNotification } from '@/types/friends';
import { RequestButtons, type AnswerInFlight } from './RequestButtons';
import { timeAgo } from './timeAgo';

/** The words after the person's name, for each kind of news. */
const WHAT_HAPPENED = {
  friend_request: 'wants to be your friend',
  friend_accepted: "said yes. You're friends now.",
} as const;

/** What a request row says once it is answered. */
const ANSWERED = { approved: "You're friends now", rejected: 'Request turned down' } as const;

/** What a row says when its request was already closed before the answer reached the server. */
const ALREADY_CLOSED = 'This request was already answered.';

/** Props for one row. */
type NotificationRowProps = {
  /** The news to show. */
  item: FriendNotification;
  /** True when it came in since the page was last opened: it gets a light gold wash. */
  isNew: boolean;
  /** The time the page opened, for "5 min ago". */
  now: number;
  /** Opens a friend's universe by their id. */
  onOpenFriend: (personId: string) => void;
};

/** One row of news. */
export const NotificationRow = memo(function NotificationRow({ item, isNew, now, onOpenFriend }: NotificationRowProps) {
  const [inFlight, setInFlight] = useState<AnswerInFlight>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const { from, kind, requestState } = item;
  const isRequest = kind === 'friend_request';
  const pending = isRequest && requestState === 'pending' && item.requestId !== null;
  const opensUniverse = kind === 'friend_accepted' || requestState === 'approved';
  const when = timeAgo(item.createdAt, now);

  /** Sends Approve or Reject; shows the server's friendly line if it fails. The row updates from the news itself. */
  const answer = async (approve: boolean) => {
    if (!item.requestId) return;
    setInFlight(approve ? 'approve' : 'reject');
    setProblem(null);
    try {
      const result = await answerFriendRequest(item.requestId, approve);
      if (result === 'gone') setProblem(ALREADY_CLOSED);
    } catch (broke) {
      setProblem(broke instanceof Error ? broke.message : String(broke));
    } finally {
      setInFlight(null);
    }
  };

  const settled = isRequest && (requestState === 'approved' || requestState === 'rejected') ? requestState : null;
  const body = (
    <>
      <View style={styles.top}>
        <PersonAvatar username={from.username} size={46} />
        <View style={styles.words}>
          <Text style={styles.line}>
            <Text style={styles.name}>{from.username}</Text> {WHAT_HAPPENED[kind]}
          </Text>
          <Text style={styles.when}>{when}</Text>
        </View>
      </View>
      {settled && <Text style={[styles.settled, settled === 'rejected' && styles.turnedDown]}>{ANSWERED[settled]}</Text>}
      {pending && <RequestButtons inFlight={inFlight} onAnswer={(approve) => void answer(approve)} />}
      {problem && (
        <Text style={styles.problem} accessibilityLiveRegion="polite">
          {problem}
        </Text>
      )}
    </>
  );

  const look = [styles.row, isNew && styles.fresh];
  if (!opensUniverse) {
    return <View style={look}>{body}</View>;
  }
  const spoken = `${from.username} ${WHAT_HAPPENED[kind]}${settled ? `. ${ANSWERED[settled]}` : ''}. ${when}`;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={spoken}
      accessibilityHint={`Opens ${from.username}'s universe`}
      onPress={() => onOpenFriend(from.id)}
      style={({ pressed }) => [...look, pressed && styles.pressed]}
    >
      {body}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  row: { borderRadius: radius.card, borderWidth: 1, borderColor: notifications.rowEdge, backgroundColor: notifications.rowFill, padding: 14, gap: 12 },
  fresh: { borderColor: notifications.newEdge, backgroundColor: notifications.newFill },
  pressed: { transform: [{ scale: 0.98 }] },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  words: { flex: 1, gap: 3 },
  line: { fontFamily: fonts.body, fontSize: 15, lineHeight: 21, color: notifications.line },
  name: { fontFamily: fonts.black, color: notifications.name },
  when: { fontFamily: fonts.bold, fontSize: 12.5, color: notifications.when },
  settled: { fontFamily: fonts.extraBold, fontSize: 14, color: notifications.friendsNow },
  turnedDown: { color: notifications.turnedDown },
  problem: { fontFamily: fonts.bold, fontSize: 13.5, lineHeight: 19, color: notifications.problem },
});
