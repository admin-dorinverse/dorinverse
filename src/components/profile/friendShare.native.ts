// Sending the person's friend link, on the phone: the phone's own share sheet (Messages, WhatsApp, email, and its
// own Copy). The browser uses friendShare.ts instead.

import { Platform, Share } from 'react-native';

/** The words that go with the link. */
const SHARE_WORDS = 'Be my friend on Dorinverse! Tap the link to add me:';

/** What happened: the share sheet opened, or the link was copied instead. */
export type FriendShareDone = 'shared' | 'copied';

/** Opens the share sheet with the link. iPhones take the link on its own; Android takes it inside the words. */
export async function shareFriendLink(link: string): Promise<FriendShareDone> {
  await Share.share(Platform.OS === 'ios' ? { message: SHARE_WORDS, url: link } : { message: `${SHARE_WORDS} ${link}` });
  return 'shared';
}
