// The one file that asks the server about friends: the person's friend code, opening someone's code, friend requests
// and answers, the friends list, the Notifications page's news and a friend's universe. The server decides all of it;
// this file only asks. A failed ask throws an Error with a friendly line, ready to show on the page.

import { database } from '@/data/database';
import { NO_INTERNET } from '@/data/accountErrors';
import type { Friend, FriendCodeLook, FriendNotification, FriendRequestAnswer, FriendRequestResult, FriendUniverseLook } from '@/types/friends';

/** What the person sees when the server answered with an error of its own. */
const SOMETHING_WRONG = 'Something went wrong. Please try again.';

/**
 * Calls one of the server's friend functions and gives back its answer. An error with no code means the server
 * was never reached (no internet); any other error is the server's own. While testing, the real error also goes
 * to the PC's dev server log.
 */
async function ask<T>(name: string, args?: Record<string, unknown>): Promise<T> {
  let answer: { data: unknown; error: { code?: string } | null };
  try {
    answer = await database.rpc(name, args);
  } catch (broke) {
    if (__DEV__) console.warn('[friends]', name, broke);
    throw new Error(NO_INTERNET);
  }
  if (answer.error) {
    if (__DEV__) console.warn('[friends]', name, answer.error);
    throw new Error(answer.error.code ? SOMETHING_WRONG : NO_INTERNET);
  }
  return answer.data as T;
}

/** A list from the server, or an empty one when the answer isn't a list. */
function listOf<T>(data: unknown): T[] {
  return Array.isArray(data) ? (data as T[]) : [];
}

/** The person's own friend code (the server makes one the first time). */
export function fetchMyFriendCode(): Promise<string> {
  return ask<string>('friend_code_mine');
}

/** Whose code this is and how the person stands with them, or that there is no such code. */
export function lookUpFriendCode(code: string): Promise<FriendCodeLook> {
  return ask<FriendCodeLook>('friend_code_open', { p_code: code });
}

/** Asks to be friends with the code's owner. The other person sees it on their Notifications page. */
export function askToBeFriends(code: string): Promise<FriendRequestResult> {
  return ask<FriendRequestResult>('friend_request_send', { p_code: code });
}

/** Approves or rejects a friend request sent to the person. */
export function answerRequest(requestId: string, approve: boolean): Promise<FriendRequestAnswer> {
  return ask<FriendRequestAnswer>('friend_request_answer', { p_request_id: requestId, p_approve: approve });
}

/** The person's friends, newest first. */
export async function fetchFriends(): Promise<Friend[]> {
  return listOf<Friend>(await ask<unknown>('friend_list'));
}

/** Stops being friends with someone, on both sides. */
export async function endFriendship(friendId: string): Promise<void> {
  await ask<unknown>('friend_remove', { p_friend_id: friendId });
}

/** The person's news (friend requests and yeses), newest first, the last 100. */
export async function fetchNotifications(): Promise<FriendNotification[]> {
  return listOf<FriendNotification>(await ask<unknown>('notification_list'));
}

/** How many pieces of news the person hasn't seen yet. */
export async function fetchUnreadCount(): Promise<number> {
  const count = await ask<unknown>('notification_unread_count');
  return typeof count === 'number' ? count : 0;
}

/** Marks the person's news as seen, up to and including the news that came at `upTo` (its createdAt, unchanged). */
export async function markReadUpTo(upTo: string): Promise<void> {
  await ask<unknown>('notification_mark_read', { p_up_to: upTo });
}

/** A friend's universe, or that the two are not friends. */
export function fetchFriendUniverse(friendId: string): Promise<FriendUniverseLook> {
  return ask<FriendUniverseLook>('friend_universe', { p_friend_id: friendId });
}
