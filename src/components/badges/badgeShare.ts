// Sharing an earned badge in the browser: the browser's own share sheet where it has one, or else the words are
// copied. Both must run straight from a tap, or Safari refuses them. Phones use badgeShare.native.ts.

/** What happened: the share sheet opened, or the words were copied instead. */
export type BadgeShareDone = 'shared' | 'copied';

/** Shares the words with the browser's share sheet, or copies them when there is none. Closing the sheet is fine. */
export async function shareBadge(words: string): Promise<BadgeShareDone> {
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({ title: 'Dorinverse', text: words });
      return 'shared';
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'shared';
    }
  }
  await navigator.clipboard.writeText(words);
  return 'copied';
}
