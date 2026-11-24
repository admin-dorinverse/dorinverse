// Remembers this phone's push token and whose account the server has it under (expo-sqlite's key-value store), so
// the app tells the server only when it changes, and can take it off the server on sign-out. Also remembers that
// the phone already asked for permission to show notifications, so it never asks twice.

import Storage from 'expo-sqlite/kv-store';

/** Where the saved token is kept. */
const TOKEN_KEY = 'push.token';

/** Where "already asked for permission" is kept. */
const ASKED_KEY = 'push.asked';

/** The token the server has for this phone. */
export type SavedPushToken = {
  /** The account the server saved it under. */
  userId: string;
  /** The Expo push token, like "ExponentPushToken[...]". */
  token: string;
  /** When the app last checked the token with Expo (milliseconds), so it checks about once a week. */
  checkedAt: number;
};

/** The saved token, or null when the server has none from this phone. */
export function readSavedPushToken(): SavedPushToken | null {
  try {
    const saved = Storage.getItemSync(TOKEN_KEY);
    return saved ? (JSON.parse(saved) as SavedPushToken) : null;
  } catch {
    return null;
  }
}

/** Saves the token the server now has for this phone. */
export function savePushToken(saved: SavedPushToken): void {
  Storage.setItemSync(TOKEN_KEY, JSON.stringify(saved));
}

/** Forgets the saved token, once it is off the server (or on sign-out). */
export function forgetSavedPushToken(): void {
  Storage.removeItemSync(TOKEN_KEY);
}

/** True when this phone already showed the permission question. */
export function alreadyAskedForPush(): boolean {
  try {
    return Storage.getItemSync(ASKED_KEY) === '1';
  } catch {
    return false;
  }
}

/** Notes that the permission question was shown. */
export function noteAskedForPush(): void {
  Storage.setItemSync(ASKED_KEY, '1');
}
