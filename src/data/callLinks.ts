// The Group Voice Call's links: the invite link people share (it opens the web join page, which works in any
// browser) and the same call's address inside the phone app. The web join page is the only page the link opens.

/**
 * The real web address, once it serves the web pages (owner's steps: point dorinverse.com at the hosting). Until
 * then it is null and links use the test server below. Setting it is the only change: app.json already tells phones
 * to open dorinverse.com links in the app, and public/.well-known holds the files that prove the app owns it.
 */
const LIVE_WEB_BASE: string | null = null;

/**
 * Where the web pages live, which every friend link and invite link starts with. Until LIVE_WEB_BASE is set it is
 * the test server's tunnel, whose address changes on every start, so scripts/app/test-server.mjs writes it to
 * testServer.json (git keeps an empty copy, so builds always find the file).
 */
export const CALL_WEB_BASE: string =
  LIVE_WEB_BASE ?? (require('./testServer.json') as { webBase: string | null }).webBase ?? '';

/** The phone app's own link start, from app.json's "scheme". */
const APP_SCHEME = 'dorinverse';

/** The Android app's package name, from app.json's "android.package". */
const ANDROID_PACKAGE = 'com.dorinverse.app';

/** The invite link for one call, like "https://…/call?room=call-ab12cd34ef". */
export function inviteLink(room: string): string {
  return `${CALL_WEB_BASE}/call?room=${encodeURIComponent(room)}`;
}

/** The same call inside the phone app, for the web page's "Open in the app" link. */
export function appLink(room: string): string {
  return `${APP_SCHEME}://call?room=${encodeURIComponent(room)}`;
}

/**
 * The same app link in the form Android's browsers will follow, like "intent://call?room=…#Intent;…;end". Chrome
 * and the Google app refuse plain "dorinverse://" links, so on Android the web page uses this instead.
 */
export function androidAppLink(room: string): string {
  return `intent://call?room=${encodeURIComponent(room)}#Intent;scheme=${APP_SCHEME};package=${ANDROID_PACKAGE};end`;
}
