// Part of the sign-in gate in src/app/_layout.tsx. A friend link opened while signed out (or before picking a
// username) gets sent to the sign-in pages; this keeps its code and opens that friend's page once the person
// reaches the sky. It draws nothing, and sits beside the page stack so the stack doesn't redraw on every page change.

import { useLinkingURL } from 'expo-linking';
import { router, usePathname, type Href } from 'expo-router';
import { useEffect } from 'react';
import { noteOpenedLink, takeWaitingFriendCode } from '@/data/waitingFriendLink';
import type { AccountStep } from '@/types/account';

/** Props for the waiting friend link. */
type OpenWaitingFriendLinkProps = {
  /** The sign-in gate's step; only 'ready' can see the friend page. */
  step: AccountStep;
};

/**
 * Keeps a friend link that came in before the person was ready, and opens it once they are. It waits until the
 * gate has sent them on to the sky ("/"), so the gate's own move there doesn't cover up the friend page.
 */
export function OpenWaitingFriendLink({ step }: OpenWaitingFriendLinkProps) {
  const link = useLinkingURL();
  const pathname = usePathname();

  useEffect(() => {
    noteOpenedLink(link, step === 'ready');
  }, [link, step]);

  useEffect(() => {
    if (step !== 'ready' || pathname !== '/') return;
    const code = takeWaitingFriendCode();
    if (code) router.push(`/friend/${encodeURIComponent(code)}` as Href);
  }, [step, pathname]);

  return null;
}
