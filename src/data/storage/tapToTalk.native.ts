// Keeps the call's Tap to talk setting on the phone (expo-sqlite's key-value store), for people who find holding
// Papa Dorin's picture hard. The browser keeps it with tapToTalk.ts instead.

import Storage from 'expo-sqlite/kv-store';

/** Where the setting is saved. */
const KEY = 'call.tapToTalk';

/** True when Tap to talk was turned on. */
export function readTapToTalk(): boolean {
  try {
    return Storage.getItemSync(KEY) === 'on';
  } catch {
    return false;
  }
}

/** Saves Tap to talk on or off. */
export function saveTapToTalk(on: boolean): void {
  try {
    Storage.setItemSync(KEY, on ? 'on' : 'off');
  } catch {
    // Not saved this time; the setting still holds until the app closes.
  }
}
