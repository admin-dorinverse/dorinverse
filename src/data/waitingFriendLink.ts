// Holds on to a friend link that opened the app before the person could see it (signed out, or no username yet),
// so the sign-in gate can open that friend's page once they are in. Kept in memory only: it is just a code.

/** A friend code inside a link, like ".../friend/ab12cd34ef" or "dorinverse://friend/ab12cd34ef". */
const FRIEND_CODE_IN_LINK = /\/friend\/([A-Za-z0-9]{10})(?=[/?#]|$)/;

/** The friend code waiting to be opened, or null. */
let waitingCode: string | null = null;

/** The last link looked at, so each link is only looked at once (not again after a later sign-out). */
let lastLink: string | null = null;

/** The friend code in a link, or null when the link isn't a friend link. */
export function friendCodeInLink(link: string | null): string | null {
  return link?.match(FRIEND_CODE_IN_LINK)?.[1] ?? null;
}

/**
 * Looks at a link that opened the app. When it is a friend link and the person can't see the friend page yet, its
 * code is kept for later. A link already looked at is skipped.
 */
export function noteOpenedLink(link: string | null, canSeeApp: boolean): void {
  if (!link || link === lastLink) return;
  lastLink = link;
  const code = friendCodeInLink(link);
  if (code && !canSeeApp) waitingCode = code;
}

/** Gives back the waiting friend code, if any, and forgets it. */
export function takeWaitingFriendCode(): string | null {
  const code = waitingCode;
  waitingCode = null;
  return code;
}
