// Sharing an earned badge on the phone: the phone's own share sheet (Messages, WhatsApp, email, and its own Copy).
// The browser uses badgeShare.ts instead. Words only for now; sharing the medal as a picture needs the next build.

import { Share } from 'react-native';

/** What happened: the share sheet opened, or the words were copied instead. */
export type BadgeShareDone = 'shared' | 'copied';

/** Opens the share sheet with the words. */
export async function shareBadge(words: string): Promise<BadgeShareDone> {
  await Share.share({ message: words });
  return 'shared';
}
