// Remembers the signed-in person's username on the phone (expo-sqlite's key-value store), so the app can open
// straight to the Sky on the next start without asking the server. The username isn't secret: everyone on a
// family call sees it.

import Storage from 'expo-sqlite/kv-store';

/** Where the username is saved. */
const KEY = 'account.username';

/** The saved username and whose it is. */
type SavedUsername = {
  /** The account it belongs to. */
  userId: string;
  /** The username. */
  username: string;
};

/** The saved username for this account, or null when none is saved (or it belongs to someone else). */
export function readSavedUsername(userId: string): string | null {
  try {
    const saved = Storage.getItemSync(KEY);
    const parsed = saved ? (JSON.parse(saved) as SavedUsername) : null;
    return parsed?.userId === userId ? parsed.username : null;
  } catch {
    return null;
  }
}

/** Saves the username for this account. */
export function saveUsername(userId: string, username: string): void {
  Storage.setItemSync(KEY, JSON.stringify({ userId, username } satisfies SavedUsername));
}

/** Forgets the saved username, when the person signs out. */
export function forgetUsername(): void {
  Storage.removeItemSync(KEY);
}
