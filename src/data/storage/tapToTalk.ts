// Keeps the call's Tap to talk setting in the browser (its local storage), for people who find holding Papa
// Dorin's picture hard. Private windows and blocked storage throw, so each step is guarded. Phones use
// tapToTalk.native.ts instead.

/** Where the setting is saved. */
const KEY = 'call.tapToTalk';

/** True when Tap to talk was turned on. */
export function readTapToTalk(): boolean {
  try {
    return window.localStorage.getItem(KEY) === 'on';
  } catch {
    return false;
  }
}

/** Saves Tap to talk on or off. */
export function saveTapToTalk(on: boolean): void {
  try {
    window.localStorage.setItem(KEY, on ? 'on' : 'off');
  } catch {
    // Not saved this time; the setting still holds until the page closes.
  }
}
