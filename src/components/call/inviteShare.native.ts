// Sending the call's invite link, on the phone: the phone's own share sheet (Messages, WhatsApp, email, and its
// own Copy). The phone app has no clipboard module in its build yet, so there's no separate Copy button here.
// The browser uses inviteShare.ts instead.

import { Platform, Share } from 'react-native';

/** The words that go with the link. */
const INVITE_WORDS = 'Join my get-together on Dorinverse. Tap the link, type your name, and you’re in:';

/** False on the phone: copying goes through the share sheet's own Copy. */
export const CAN_COPY = false;

/** True when this device has a share sheet (every phone does). */
export function canShare(): boolean {
  return true;
}

/** Opens the share sheet with the link. iPhones take the link on its own; Android takes it inside the words. */
export async function shareInvite(link: string): Promise<void> {
  await Share.share(Platform.OS === 'ios' ? { message: INVITE_WORDS, url: link } : { message: `${INVITE_WORDS} ${link}` });
}

/** Copies the link; never used on the phone (see CAN_COPY). */
export async function copyInvite(_link: string): Promise<boolean> {
  return false;
}
