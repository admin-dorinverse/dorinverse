// Sending the person's friend link, in the browser: the browser's own share sheet where it has one, or else the
// link is copied. Both must run straight from a tap, or Safari refuses them. Phones use friendShare.native.ts.

/** The words that go with the link. */
const SHARE_WORDS = 'Be my friend on Dorinverse! Tap the link to add me.';

/** What happened: the share sheet opened, or the link was copied instead. */
export type FriendShareDone = 'shared' | 'copied';

/** Copies the link; throws when the browser won't let it. */
async function copyLink(link: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(link);
  } catch {
    throw new Error('Couldn’t copy the link here. Try sharing it from the app on your phone.');
  }
}

/**
 * Shares the link with the browser's share sheet, or copies it when there is none or the sheet won't open.
 * Closing the sheet without sharing is fine.
 */
export async function shareFriendLink(link: string): Promise<FriendShareDone> {
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({ title: 'Dorinverse', text: SHARE_WORDS, url: link });
      return 'shared';
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'shared';
    }
  }
  await copyLink(link);
  return 'copied';
}
