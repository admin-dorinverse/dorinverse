// The call's Tap to talk setting, shared by every screen that needs it (Papa Dorin's card, the asking screen and
// the settings sheet), so flipping it in one place changes it everywhere at once. It is saved on this device.

import { useSyncExternalStore } from 'react';
import { readTapToTalk, saveTapToTalk } from '@/data/storage/tapToTalk';

/** The setting now, read from the device the first time it is needed. */
let current: boolean | null = null;

/** The screens to tell when it changes. */
const listeners = new Set<() => void>();

/** Tells a screen when the setting changes; returns how to stop. */
function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The setting now. */
function snapshot(): boolean {
  if (current === null) current = readTapToTalk();
  return current;
}

/** Turns Tap to talk on or off, saves it, and tells every screen. */
export function setTapToTalk(on: boolean): void {
  current = on;
  saveTapToTalk(on);
  listeners.forEach((l) => l());
}

/** True when Tap to talk is on: tap Papa Dorin's picture to start asking and tap again to finish. */
export function useTapToTalk(): boolean {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}
