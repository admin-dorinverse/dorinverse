// A person's friend links: the web link their QR code holds and they text to someone (it opens a web page with
// "Open in the Dorinverse app", on the same address as voice call invites), and the app's own link that button opens.

import { CALL_WEB_BASE } from '@/data/callLinks';

/** The phone app's own link start, from app.json's "scheme". */
const APP_SCHEME = 'dorinverse';

/** The Android app's package name, from app.json's "android.package". */
const ANDROID_PACKAGE = 'com.dorinverse.app';

/** The app's own link the web page's button opens, like "dorinverse://friend/ab12cd34ef". */
export function friendAppLink(code: string): string {
  return `${APP_SCHEME}://friend/${encodeURIComponent(code)}`;
}

/**
 * The same app link in the form Android's browsers will follow, like "intent://friend/ab12cd34ef#Intent;…;end".
 * Chrome and the Google app refuse plain "dorinverse://" links, so on Android the web page uses this instead.
 */
export function friendAndroidLink(code: string): string {
  return `intent://friend/${encodeURIComponent(code)}#Intent;scheme=${APP_SCHEME};package=${ANDROID_PACKAGE};end`;
}

/** The link a QR code holds and people text, like "https://…/friend/ab12cd34ef". */
export function friendShareLink(code: string): string {
  return `${CALL_WEB_BASE}/friend/${encodeURIComponent(code)}`;
}
