// The Group Voice Call's links: the invite link people share (it opens the web join page, which works in any
// browser) and the same call's address inside the phone app. The web join page is the only page the link opens.

/**
 * Where the web join page lives. For now it is the test server's tunnel; at launch this becomes the hosted web
 * address, and every invite link changes with it.
 */
export const CALL_WEB_BASE = 'https://c-admindorinverse-e74pth-mwr8ckjz1d8uzc2g.on.expo.app';

/** The phone app's own link start, from app.json's "scheme". */
const APP_SCHEME = 'dorinverse';

/** The invite link for one call, like "https://…/call?room=call-ab12cd34ef". */
export function inviteLink(room: string): string {
  return `${CALL_WEB_BASE}/call?room=${encodeURIComponent(room)}`;
}

/** The same call inside the phone app, for the web page's "Open in the app" link. */
export function appLink(room: string): string {
  return `${APP_SCHEME}://call?room=${encodeURIComponent(room)}`;
}
