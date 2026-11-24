// Part of the sign-in gate in src/app/_layout.tsx. Once the person reaches the sky, it sets up friend request
// phone notifications (asking for permission the first time). Tapping one opens the Notifications page, and one
// arriving while the app is open refreshes the bell. It draws nothing.

import { router, usePathname, type Href } from 'expo-router';
import { useEffect, useRef } from 'react';
import { useAccount } from '@/data/account';
import { listenForFriendPush, setUpFriendPush, takeTappedPage } from '@/data/friendPush';
import { queryClient } from '@/data/queries/client';
import { friendsKey } from '@/data/queries/friendPieces';
import type { AccountStep } from '@/types/account';

/** Props for the friend push host. */
type FriendPushHostProps = {
  /** The sign-in gate's step; only 'ready' sets up notifications or opens their page. */
  step: AccountStep;
};

/**
 * Sets up and answers friend request notifications. A notification tapped while the app was closed waits until
 * the gate has sent the person to the sky ("/"), so the gate's own move there doesn't cover the Notifications page.
 */
export function FriendPushHost({ step }: FriendPushHostProps) {
  const pathname = usePathname();
  const userId = useAccount().person?.userId ?? '';
  const ready = step === 'ready';
  // The latest step for the listeners, which are made once.
  const readyNow = useRef(ready);
  useEffect(() => {
    readyNow.current = ready;
  }, [ready]);

  // Once per person and app start, when they first reach the sky.
  const setUpFor = useRef('');
  useEffect(() => {
    if (!ready || pathname !== '/' || !userId || setUpFor.current === userId) return;
    setUpFor.current = userId;
    void setUpFriendPush(userId);
  }, [ready, pathname, userId]);

  // A notification tapped while the app was closed.
  useEffect(() => {
    if (!ready || pathname !== '/') return;
    const page = takeTappedPage();
    if (page) router.push(page as Href);
  }, [ready, pathname]);

  // Taps and arrivals while the app is open.
  useEffect(
    () =>
      listenForFriendPush(
        (page) => {
          if (readyNow.current) router.push(page as Href);
        },
        () => void queryClient.invalidateQueries({ queryKey: friendsKey(userId, 'unread') }),
      ),
    [userId],
  );

  return null;
}
