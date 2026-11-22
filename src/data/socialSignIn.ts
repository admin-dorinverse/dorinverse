// Signing in with Google or Apple. Google (and Apple on Android) opens the sign-in page in a browser tab and comes
// back to the app at dorinverse://auth-callback with a one-time code, which is swapped for a sign-in (PKCE). On
// iPhones, Apple uses the phone's own Sign in with Apple sheet. Both are switched on in signInOptions.ts.

import * as AppleAuthentication from 'expo-apple-authentication';
import { CryptoDigestAlgorithm, digestStringAsync, randomUUID } from 'expo-crypto';
import * as WebBrowser from 'expo-web-browser';
import { database } from '@/data/database';
import { friendlyAccountError } from '@/data/accountErrors';
import { linkTo, swapLinkCode } from '@/data/signInLinks';
import type { SocialProvider } from '@/types/account';

/** Throws the friendly line for an error. */
function fail(error: unknown): never {
  throw new Error(friendlyAccountError(error));
}

/** Signs in with Google, or with Apple through the browser (Android). Resolves false if the person closed the tab. */
export async function signInInBrowser(provider: SocialProvider): Promise<boolean> {
  const redirectTo = linkTo('auth-callback');
  const { data, error } = await database.auth.signInWithOAuth({ provider, options: { redirectTo, skipBrowserRedirect: true } });
  if (error || !data.url) fail(error);
  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') return false;
  await swapLinkCode(result.url);
  return true;
}

/** True when this phone offers Apple's own sign-in sheet (iPhones and iPads). */
export function appleSheetAvailable(): Promise<boolean> {
  return AppleAuthentication.isAvailableAsync().catch(() => false);
}

/**
 * Signs in with Apple's own sheet on an iPhone. Apple gets a scrambled copy of a one-time word (the nonce) and the
 * server gets the plain one, so a stolen sign-in can't be replayed. Resolves false if the person closed the sheet.
 */
export async function signInWithAppleSheet(): Promise<boolean> {
  const nonce = randomUUID();
  const hashed = await digestStringAsync(CryptoDigestAlgorithm.SHA256, nonce);
  let credential: AppleAuthentication.AppleAuthenticationCredential;
  try {
    credential = await AppleAuthentication.signInAsync({
      requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
      nonce: hashed,
    });
  } catch (e) {
    if ((e as { code?: string }).code === 'ERR_REQUEST_CANCELED') return false;
    throw new Error('Apple sign-in didn’t go through. Please try again.');
  }
  if (!credential.identityToken) throw new Error('Apple sign-in didn’t go through. Please try again.');
  const { error } = await database.auth.signInWithIdToken({ provider: 'apple', token: credential.identityToken, nonce });
  if (error) fail(error);
  // Apple gives the person's name only the first time, so it is kept with the account then.
  const name = [credential.fullName?.givenName, credential.fullName?.familyName].filter(Boolean).join(' ');
  if (name) await database.auth.updateUser({ data: { full_name: name } }).catch(() => {});
  return true;
}
