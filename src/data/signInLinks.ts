// The app address that sign-in links come back to, and swapping a link's one-time code for a sign-in (PKCE).
// Google and Apple's browser sign-in come back to dorinverse://auth-callback with a one-time code that only works
// on the phone that asked for it.

import * as Linking from 'expo-linking';
import { database } from '@/data/database';
import { friendlyAccountError } from '@/data/accountErrors';

/** The app pages links come back to: src/app/auth-callback.tsx. */
export type LinkPage = 'auth-callback';

/** Codes already being swapped, so a code that arrives twice (browser answer and deep link) is swapped once. */
const swapping = new Map<string, Promise<void>>();

/** The full address of an app page for a link, like "dorinverse://auth-callback" ("exp://…" in Expo Go). */
export function linkTo(page: LinkPage): string {
  return Linking.createURL(page);
}

/** A link's address details, from a full address or a page's own address details. */
type LinkParams = Record<string, string | string[] | undefined>;

/** The one link detail by name, when it is there once. */
function one(params: LinkParams, name: string): string | undefined {
  const value = params[name];
  return typeof value === 'string' ? value : undefined;
}

/**
 * Swaps a link's one-time code for a sign-in. Takes a full address or the details a page got from its address.
 * A second call with the same code waits on the first instead of spending the code again.
 */
export function swapLinkCode(link: string | LinkParams): Promise<void> {
  const params: LinkParams = typeof link === 'string' ? ((Linking.parse(link).queryParams ?? {}) as LinkParams) : link;
  const code = one(params, 'code');
  if (!code) {
    const expired = /expired|invalid/i.test(one(params, 'error_description') ?? '') || one(params, 'error_code') === 'otp_expired';
    return Promise.reject(new Error(expired ? 'That link is too old or was already used. Please ask for a new one.' : 'That sign-in didn’t go through. Please try again.'));
  }
  const flowId = one(params, 'sb_flow_id');
  let swap = swapping.get(code);
  if (!swap) {
    swap = database.auth.exchangeCodeForSession(code, flowId ? { flowId } : undefined).then(({ error }) => {
      if (error) throw new Error(friendlyAccountError(error));
    });
    // A swap that failed is forgotten, so a later try (say once the internet is back) asks the server again.
    swap.catch(() => swapping.delete(code));
    swapping.set(code, swap);
  }
  return swap;
}
