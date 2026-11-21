// Who the Bible guest of the week is. This is the one file that changes at hookup: pages never decide the guest.
//
// Today (test only): the guest is always Peter, the first guest written.
// Hookup: the server says who is visiting this week, and a new guest takes over each Monday.

import { chatCharacter } from '@/data/chatCharacters';
import type { ChatCharacter } from '@/types/chat';

/** This week's guest. */
export function thisWeeksGuest(): ChatCharacter {
  return chatCharacter('peter');
}
