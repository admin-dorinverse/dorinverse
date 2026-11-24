// The app's own small native module that keeps a voice call connected while the app is in the background on
// Android, by showing the ongoing "Voice call in progress" notice. On iPhone, in the browser, and in an older app
// build without this module, it's missing, so every function here quietly does nothing.

import { requireOptionalNativeModule } from 'expo';

/** The native side: Android only. */
type VoiceCallServiceNative = {
  /** Shows the notice; false if Android wouldn't start it. */
  start(title: string, body: string): boolean;
  /** Takes the notice down. */
  stop(): void;
};

/** The native module, or null where there isn't one. */
const native = requireOptionalNativeModule<VoiceCallServiceNative>('VoiceCallService');

/** Shows the call notice with these words and keeps the call connected in the background; safe to call again. */
export function startVoiceCallService(title: string, body: string): boolean {
  return native?.start(title, body) ?? false;
}

/** Takes the call notice down; safe to call when it isn't showing. */
export function stopVoiceCallService(): void {
  native?.stop();
}
