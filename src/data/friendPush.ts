// On the web there are no phone notifications, so these do nothing. The phones use friendPush.native.ts, which
// has the same names.

/** Does nothing on the web. */
export async function setUpFriendPush(_userId: string): Promise<void> {}

/** Does nothing on the web. */
export async function forgetPushToken(): Promise<void> {}

/** Always null on the web. */
export function takeTappedPage(): string | null {
  return null;
}

/** Does nothing on the web; returns a stop function that does nothing either. */
export function listenForFriendPush(_onTap: (page: string) => void, _onArrive: () => void): () => void {
  return () => {};
}
