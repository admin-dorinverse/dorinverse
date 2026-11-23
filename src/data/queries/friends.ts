// Friends data for pages: the person's friend code, their friends, someone's code they opened, their news and
// unread count, and a friend's universe. Each one starts from the copy saved on the phone and asks the server in the
// background, so pages open at once. Actions wait for the server, then change memory and the saved copy right away.

import { useQuery } from '@tanstack/react-query';
import { AppState } from 'react-native';
import { database } from '@/data/database';
import {
  answerRequest,
  askToBeFriends,
  endFriendship,
  fetchFriends,
  fetchFriendUniverse,
  fetchMyFriendCode,
  fetchNotifications,
  fetchUnreadCount,
  lookUpFriendCode,
  markReadUpTo,
} from '@/data/friendsSource';
import { queryClient } from '@/data/queries/client';
import { actingId, changePiece, FRESH_MS, friendsKey, pieceNow, pieceQuery, setPiece, showSavedPieces, signedInId, stillSignedIn, useSignedInId } from '@/data/queries/friendPieces';
import { forgetSavedFriends, keepFriends, keepOnlyFriendsOf, loadSavedFriends, savedFriendsFor } from '@/data/storage/friendsStore';
import type { FriendCodeLook, FriendPerson, FriendRelation, FriendRequestAnswer, FriendRequestResult, FriendUniverseLook } from '@/types/friends';

/** True once startFriendNews has run. */
let started = false;

/** When the unread count was last asked for, and for whom, so it is asked at most once a minute. */
let lastNewsTry = { userId: '', at: 0 };

/** Asks for the unread count. When it changed and isn't 0, the news is fetched again the next time it shows. */
async function fetchUnreadAndNews(userId: string): Promise<number> {
  const before = queryClient.getQueryData<number>(friendsKey(userId, 'unread'));
  const count = await fetchUnreadCount();
  if (count > 0 && count !== before) void queryClient.invalidateQueries({ queryKey: friendsKey(userId, 'news') });
  return count;
}

/** The unread count's query for this person. */
function unreadQuery(userId: string) {
  return pieceQuery(userId, 'unread', () => fetchUnreadAndNews(userId));
}

/** The person's own friend code (`data`), for their QR code and share link. */
export function useMyFriendCode() {
  const userId = useSignedInId();
  return useQuery({ ...pieceQuery(userId, 'code', fetchMyFriendCode), enabled: userId !== '' });
}

/** The person's friends (`data`), newest first. */
export function useFriends() {
  const userId = useSignedInId();
  return useQuery({ ...pieceQuery(userId, 'friends', fetchFriends), enabled: userId !== '' });
}

/** Stops being friends with someone, on both sides, and takes them off the list right away. */
export async function removeFriend(friendId: string): Promise<void> {
  const userId = actingId();
  await endFriendship(friendId);
  changePiece(userId, 'friends', (list) => list.filter((friend) => friend.id !== friendId));
  keepUniverse(userId, friendId, { status: 'not_friends' });
  queryClient.setQueryData<FriendUniverseLook>(friendsKey(userId, 'universe', friendId), { status: 'not_friends' });
  refreshFoundLooks(userId);
}

/** How long a "no such code" answer is kept: the server's wrong-guess window, so reopening it doesn't count again. */
const NOT_FOUND_MS = 10 * 60 * 1000;

/**
 * How long an opened code's answer counts as fresh. A found person is asked again each time the page opens; a wrong
 * code is not (each ask would count as another wrong guess), and "slow down" is asked again after a minute.
 */
function lookFreshFor(look: FriendCodeLook | undefined): number {
  if (look?.status === 'not_found') return NOT_FOUND_MS;
  return look?.status === 'slow_down' ? FRESH_MS : 0;
}

/** Asks again for every opened code that found someone. Wrong codes are left alone, so no wrong guess counts twice. */
function refreshFoundLooks(userId: string): void {
  void queryClient.invalidateQueries({
    queryKey: friendsKey(userId, 'look'),
    predicate: (query) => (query.state.data as FriendCodeLook | undefined)?.status === 'ok',
  });
}

/** Asks again for one person's universe (or every universe when it isn't known who), after the two became friends. */
function refreshUniverse(userId: string, personId: string | null): void {
  void queryClient.invalidateQueries({ queryKey: personId ? friendsKey(userId, 'universe', personId) : friendsKey(userId, 'universe') });
}

/** What opening a friend code shows (`data`): the person and how you stand, or no such code. Kept in memory only. */
export function useFriendCodeLook(code: string) {
  const userId = useSignedInId();
  const clean = code.trim();
  return useQuery({
    queryKey: friendsKey(userId, 'look', clean),
    queryFn: () => lookUpFriendCode(clean),
    enabled: userId !== '' && clean !== '',
    staleTime: (query) => lookFreshFor(query.state.data),
    gcTime: NOT_FOUND_MS,
  });
}

/** How the two stand after each "Add friend" answer. 'they_asked_you' is looked up again, for their request's id. */
const RELATION_AFTER_SEND: Partial<Record<FriendRequestResult, FriendRelation>> = {
  sent: 'sent',
  already_sent: 'sent',
  already_friends: 'friends',
  self: 'self',
};

/**
 * Asks to be friends with a code's owner and returns the server's answer. The opened code's page updates at once.
 * A wrong code or "slow down" is written straight onto the page, never asked again (that would count another guess).
 */
export async function sendFriendRequest(code: string): Promise<FriendRequestResult> {
  const userId = actingId();
  const clean = code.trim();
  const result = await askToBeFriends(clean);
  const lookKey = friendsKey(userId, 'look', clean);
  const relation = RELATION_AFTER_SEND[result];
  if (result === 'not_found' || result === 'slow_down') queryClient.setQueryData<FriendCodeLook>(lookKey, { status: result });
  else if (relation) queryClient.setQueryData<FriendCodeLook>(lookKey, (look) => (look?.status === 'ok' ? { ...look, relation } : look));
  else void queryClient.invalidateQueries({ queryKey: lookKey });
  if (result === 'already_friends') {
    const look = queryClient.getQueryData<FriendCodeLook>(lookKey);
    refreshUniverse(userId, look?.status === 'ok' ? look.person.id : null);
    void queryClient.invalidateQueries({ queryKey: friendsKey(userId, 'friends') });
  }
  return result;
}

/** Who sent a friend request, from the news or from an opened code, or null when neither has it. */
function whoAsked(userId: string, requestId: string): FriendPerson | null {
  const news = pieceNow(userId, 'news')?.find((item) => item.requestId === requestId);
  if (news) return news.from;
  for (const [, look] of queryClient.getQueriesData<FriendCodeLook>({ queryKey: friendsKey(userId, 'look') })) {
    if (look?.status === 'ok' && look.requestId === requestId) return look.person;
  }
  return null;
}

/** Changes every opened code that showed this request to how the two stand now. */
function settleLooks(userId: string, requestId: string, relation: FriendRelation): void {
  for (const [key, look] of queryClient.getQueriesData<FriendCodeLook>({ queryKey: friendsKey(userId, 'look') })) {
    if (look?.status === 'ok' && look.requestId === requestId) queryClient.setQueryData(key, { ...look, relation, requestId: null });
  }
}

/**
 * Approves or rejects a friend request sent to the person and returns the server's answer. The news shows the
 * answer at once, and an approved friend joins the list right away. 'gone' means it was already closed.
 */
export async function answerFriendRequest(requestId: string, approve: boolean): Promise<FriendRequestAnswer> {
  const userId = actingId();
  const answer = await answerRequest(requestId, approve);
  if (!stillSignedIn(userId)) return answer;
  if (answer === 'gone') {
    void queryClient.invalidateQueries({ queryKey: friendsKey(userId, 'news') });
    refreshFoundLooks(userId);
    return answer;
  }
  const asker = whoAsked(userId, requestId);
  changePiece(userId, 'news', (news) => news.map((item) => (item.requestId === requestId ? { ...item, requestState: answer } : item)));
  settleLooks(userId, requestId, answer === 'approved' ? 'friends' : 'none');
  if (answer === 'approved') {
    if (asker) {
      const friend = { ...asker, friendsSince: new Date().toISOString() };
      changePiece(userId, 'friends', (list) => (list.some((f) => f.id === asker.id) ? list : [friend, ...list]));
    }
    refreshUniverse(userId, asker?.id ?? null);
    void queryClient.invalidateQueries({ queryKey: friendsKey(userId, 'friends') });
  }
  return answer;
}

/** The person's news (`data`): friend requests and yeses, newest first. */
export function useNotifications() {
  const userId = useSignedInId();
  return useQuery({ ...pieceQuery(userId, 'news', fetchNotifications), enabled: userId !== '' });
}

/** How many pieces of news the person hasn't seen (0 until known), for the dot on the bell. */
export function useUnreadCount(): number {
  const userId = useSignedInId();
  return useQuery({ ...unreadQuery(userId), enabled: userId !== '' }).data ?? 0;
}

/**
 * Marks the person's news as seen, up to and including the news that came at `upTo` (the newest createdAt the page
 * shows, exactly as the server sent it). News that came later stays unseen. The bell's dot goes away at once.
 */
export async function markNotificationsRead(upTo: string | null): Promise<void> {
  const userId = actingId();
  if (upTo) await markReadUpTo(upTo);
  setPiece(userId, 'unread', 0);
  const cutoff = upTo ? Date.parse(upTo) : -Infinity;
  changePiece(userId, 'news', (news) => news.map((item) => (item.read || Date.parse(item.createdAt) > cutoff ? item : { ...item, read: true })));
}

/** Saves a friend's universe on the phone, or forgets it when the two are not friends. */
function keepUniverse(userId: string, friendId: string, look: FriendUniverseLook): void {
  if (!stillSignedIn(userId)) return;
  keepFriends(userId, (saved) => {
    const universes = { ...saved.universes };
    if (look.status === 'ok') universes[friendId] = { value: look, at: Date.now() };
    else delete universes[friendId];
    return { ...saved, universes };
  });
}

/** A friend's universe (`data`): who they are and how they are doing, or that the two are not friends. */
export function useFriendUniverse(friendId: string) {
  const userId = useSignedInId();
  return useQuery({
    queryKey: friendsKey(userId, 'universe', friendId),
    queryFn: async (): Promise<FriendUniverseLook> => {
      const look = await fetchFriendUniverse(friendId);
      keepUniverse(userId, friendId, look);
      return look;
    },
    enabled: userId !== '' && friendId !== '',
    staleTime: FRESH_MS,
    initialData: (): FriendUniverseLook | undefined => {
      const saved = savedFriendsFor(userId)?.universes[friendId];
      return saved ? { ...saved.value, status: 'ok' } : undefined;
    },
    initialDataUpdatedAt: () => savedFriendsFor(userId)?.universes[friendId]?.at,
  });
}

/** Asks for this person's unread count, at most once a minute. A failure is quiet: the saved count stays. */
async function refreshNewsFor(userId: string): Promise<void> {
  const now = Date.now();
  if (lastNewsTry.userId === userId && now - lastNewsTry.at < FRESH_MS) return;
  lastNewsTry = { userId, at: now };
  await loadSavedFriends();
  await queryClient.fetchQuery(unreadQuery(userId)).catch(() => {});
}

/**
 * Refreshes the unread count for the bell, at most once a minute (more calls in that minute do nothing). Called
 * at start, when the app comes back to the front, and when the Sky tab shows. It never throws.
 */
export function refreshFriendNews(): Promise<void> {
  const userId = signedInId();
  return userId ? refreshNewsFor(userId) : Promise.resolve();
}

/** Forgets every friends thing in memory and on the phone, when the person signs out. */
function forgetFriends(): void {
  lastNewsTry = { userId: '', at: 0 };
  forgetSavedFriends();
  queryClient.removeQueries({ queryKey: ['friends'] });
}

/** Acts on sign-in news: a sign-out forgets friends data; a sign-in drops anyone else's and checks for news. */
function onSignInNews(event: string, userId: string | null): void {
  if (event === 'SIGNED_OUT') forgetFriends();
  else if (userId && (event === 'INITIAL_SESSION' || event === 'SIGNED_IN')) {
    keepOnlyFriendsOf(userId);
    queryClient.removeQueries({ predicate: (query) => query.queryKey[0] === 'friends' && query.queryKey[1] !== userId });
    void refreshNewsFor(userId);
  }
}

/**
 * Starts friends news. The root layout calls this once. It reads the saved friends data from the phone, checks
 * the unread count once signed in, again whenever the app comes back to the front, and forgets it all on sign-out.
 */
export function startFriendNews(): void {
  if (started) return;
  started = true;
  void loadSavedFriends().then(showSavedPieces);
  // Calls to the database are made after the sign-in news is handled, never inside it (that can lock up).
  database.auth.onAuthStateChange((event, session) => {
    setTimeout(() => onSignInNews(event, session?.user.id ?? null), 0);
  });
  AppState.addEventListener('change', (state) => {
    if (state === 'active') void refreshFriendNews();
  });
}
