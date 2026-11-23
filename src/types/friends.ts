// The shape of friends data: a person as friends see them, what opening someone's friend code shows, friend
// requests and their answers, the Notifications page's news, and a friend's universe. These match what the server's
// friend functions send back (supabase/migrations/20261123120000_friends.sql).

/** A person as other players see them: their id, username and avatar. */
export type FriendPerson = {
  /** Their account id on the server. */
  id: string;
  /** Their username. */
  username: string;
  /** Which kind of avatar they picked. */
  avatarKind: string;
  /** Their avatar's settings, whatever that kind of avatar needs. */
  avatarSettings: unknown;
};

/** One friend in the friends list: the person, and since when they have been friends. */
export type Friend = FriendPerson & {
  /** When the two became friends, as the server's date text. */
  friendsSince: string;
};

/**
 * How the signed-in person stands with someone: it is them, nothing yet, they sent a request, the other person
 * sent them one, or they are friends.
 */
export type FriendRelation = 'self' | 'none' | 'sent' | 'received' | 'friends';

/** What opening a friend code shows: the person and how you stand, no such code, or too many wrong codes. */
export type FriendCodeLook =
  | {
      /** The code belongs to someone. */
      status: 'ok';
      /** Whose code it is. */
      person: FriendPerson;
      /** How the signed-in person stands with them. */
      relation: FriendRelation;
      /** The open request between the two, when there is one, so it can be answered. */
      requestId: string | null;
    }
  | {
      /** No such code (or a block between the two), or too many wrong codes lately: wait, then try again. */
      status: 'not_found' | 'slow_down';
    };

/**
 * What the server says after "Add friend": sent, sent before, already friends, they already asked you (answer theirs
 * instead), it is your own code, no such code, or too many wrong codes lately.
 */
export type FriendRequestResult = 'sent' | 'already_sent' | 'already_friends' | 'they_asked_you' | 'self' | 'not_found' | 'slow_down';

/** What the server says after Approve or Reject: done either way, or the request is no longer open. */
export type FriendRequestAnswer = 'approved' | 'rejected' | 'gone';

/** Where a friend request stands. */
export type FriendRequestState = 'pending' | 'approved' | 'rejected';

/** The kinds of news on the Notifications page: someone asked to be friends, or someone said yes to you. */
export type FriendNotificationKind = 'friend_request' | 'friend_accepted';

/** One piece of news on the Notifications page. */
export type FriendNotification = {
  /** The news's id on the server. */
  id: string;
  /** What kind of news it is. */
  kind: FriendNotificationKind;
  /** Who it is from. */
  from: FriendPerson;
  /** The friend request it is about, or null. */
  requestId: string | null;
  /** Where that request stands now, or null when there is none. */
  requestState: FriendRequestState | null;
  /** When it came, as the server's date text. */
  createdAt: string;
  /** True once the person has seen it. */
  read: boolean;
};

/** A friend's universe: who they are and how they are doing. Lesson progress joins this later. */
export type FriendUniverse = {
  /** The friend. */
  person: FriendPerson;
  /** When they joined, as the server's date text. */
  joinedAt: string;
  /** Days in a row they have played. */
  streak: number;
  /** Their longest run of days in a row. */
  bestStreak: number;
  /** How many friends they have. */
  friendCount: number;
};

/** What opening a friend's universe shows: their universe, or that the two are not friends (anymore). */
export type FriendUniverseLook = ({ status: 'ok' } & FriendUniverse) | { status: 'not_friends' };
