// Keeps the friends pieces (friend code, friends list, news, unread count) for queries/friends.ts: where each sits in
// the query cache, how a piece's query starts from the phone's saved copy, and how a change lands in memory and on
// the phone together. Only the signed-in person's answers are ever kept.

import { type QueryKey } from '@tanstack/react-query';
import { currentAccount, useAccount } from '@/data/account';
import { queryClient } from '@/data/queries/client';
import { keepFriends, savedFriendsFor, savedPiece, type FriendPieces } from '@/data/storage/friendsStore';

/** How long fetched friends data counts as fresh: a page opened again within a minute doesn't ask the server. */
export const FRESH_MS = 60 * 1000;

/** Where friends data is kept in the query cache. Each person has their own places, so nobody sees another's. */
export function friendsKey(userId: string, ...rest: string[]): QueryKey {
  return ['friends', userId, ...rest];
}

/** The signed-in person's id, or '' when signed out. */
export function signedInId(): string {
  return currentAccount().person?.userId ?? '';
}

/** The signed-in person's id, redrawing the page when they change. '' when signed out. */
export function useSignedInId(): string {
  return useAccount().person?.userId ?? '';
}

/** The signed-in person's id for an action. Throws a friendly line when nobody is signed in. */
export function actingId(): string {
  const userId = signedInId();
  if (!userId) throw new Error('Please sign in again.');
  return userId;
}

/** True while this person's answers may still be kept: they are signed in (or the sign-in is still being read). */
export function stillSignedIn(userId: string): boolean {
  const now = currentAccount();
  return now.step === 'loading' || now.person?.userId === userId;
}

/** Saves a piece on the phone, unless the person signed out or changed while the server was answering. */
export function keepPiece<Name extends keyof FriendPieces>(userId: string, name: Name, value: FriendPieces[Name]): void {
  if (!stillSignedIn(userId)) return;
  keepFriends(userId, (saved) => ({ ...saved, [name]: { value, at: Date.now() } }));
}

/** Sets a piece in memory right away and saves it on the phone. */
export function setPiece<Name extends keyof FriendPieces>(userId: string, name: Name, value: FriendPieces[Name]): void {
  if (!stillSignedIn(userId)) return;
  queryClient.setQueryData(friendsKey(userId, name), value);
  keepPiece(userId, name, value);
}

/** The piece in memory, or else the copy saved on the phone, or undefined when there is neither. */
export function pieceNow<Name extends keyof FriendPieces>(userId: string, name: Name): FriendPieces[Name] | undefined {
  return queryClient.getQueryData<FriendPieces[Name]>(friendsKey(userId, name)) ?? savedPiece(userId, name)?.value;
}

/** Changes a piece (nothing happens when there is none yet), in memory right away, and saves it. */
export function changePiece<Name extends keyof FriendPieces>(userId: string, name: Name, change: (now: FriendPieces[Name]) => FriendPieces[Name]): void {
  const now = pieceNow(userId, name);
  if (now !== undefined) setPiece(userId, name, change(now));
}

/**
 * A piece's query. It starts from the phone's saved copy, asks the server in the background when that copy is over
 * a minute old, and saves what the server sends. If the server can't be reached, the saved copy stays shown.
 */
export function pieceQuery<Name extends keyof FriendPieces>(userId: string, name: Name, fetch: () => Promise<FriendPieces[Name]>) {
  return {
    queryKey: friendsKey(userId, name),
    queryFn: async (): Promise<FriendPieces[Name]> => {
      const value = await fetch();
      keepPiece(userId, name, value);
      return value;
    },
    staleTime: FRESH_MS,
    initialData: () => savedPiece(userId, name)?.value,
    initialDataUpdatedAt: () => savedPiece(userId, name)?.at,
  };
}

/** The names of the saved pieces, to tell them apart from the other places in the cache. */
const PIECE_NAMES: readonly string[] = ['code', 'friends', 'news', 'unread'] satisfies (keyof FriendPieces)[];

/**
 * Fills in the saved copy for pages that opened before the phone's copy was read (it takes a moment at start).
 * Places that already have data are left alone, so nothing newer from the server is ever covered up.
 */
export function showSavedPieces(): void {
  for (const query of queryClient.getQueryCache().findAll({ queryKey: ['friends'] })) {
    const [, userId, name, friendId] = query.queryKey as string[];
    if (query.state.data !== undefined || !userId) continue;
    if (PIECE_NAMES.includes(name)) {
      const saved = savedPiece(userId, name as keyof FriendPieces);
      if (saved) queryClient.setQueryData(query.queryKey, saved.value, { updatedAt: saved.at });
    } else if (name === 'universe') {
      const saved = savedFriendsFor(userId)?.universes[friendId];
      if (saved) queryClient.setQueryData(query.queryKey, { ...saved.value, status: 'ok' }, { updatedAt: saved.at });
    }
  }
}
