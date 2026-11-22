// Sending the call's invite link, in the browser: the browser's own share sheet where it has one (phones, Safari),
// and Copy link everywhere. Both must run straight from a tap, or Safari refuses them. Phones use
// inviteShare.native.ts instead.

/** The words that go with the link. */
const INVITE_WORDS = 'Join my get-together on Dorinverse. Tap the link, type your name, and you’re in.';

/** True in the browser: the link can be copied. */
export const CAN_COPY = true;

/** True when this browser has a share sheet. */
export function canShare(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
}

/** Opens the browser's share sheet with the link; closing it without sharing is not a problem. */
export async function shareInvite(link: string): Promise<void> {
  try {
    await navigator.share({ title: 'Dorinverse get-together', text: INVITE_WORDS, url: link });
  } catch (e) {
    if (!(e instanceof DOMException && e.name === 'AbortError')) throw e;
  }
}

/** Copies with the old way, through a hidden text box, for browsers without the clipboard tool. */
function copyTheOldWay(link: string): boolean {
  const box = document.createElement('textarea');
  box.value = link;
  box.setAttribute('readonly', '');
  box.style.position = 'fixed';
  box.style.opacity = '0';
  document.body.appendChild(box);
  box.select();
  box.setSelectionRange(0, link.length);
  let done = false;
  try {
    done = document.execCommand('copy');
  } catch {
    done = false;
  }
  box.remove();
  return done;
}

/** Copies the link; true when it worked. */
export async function copyInvite(link: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(link);
    return true;
  } catch {
    return copyTheOldWay(link);
  }
}
