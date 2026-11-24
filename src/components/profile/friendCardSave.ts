// Saving the friend card, in the browser: a browser has no Photos to save to, so the Save button is hidden there.
// Phones use friendCardSave.native.ts.

import type { ComponentRef, RefObject } from 'react';
import type { View } from 'react-native';

/** The friend card's outer box on screen, the part that becomes the picture. */
export type SavableCard = ComponentRef<typeof View>;

/** False in the browser, so the card shows no Save button. */
export const CAN_SAVE_CARD = false;

/** What happened: the card is in Photos, or the person said no to Photos. */
export type CardSaveDone = 'saved' | 'refused';

/** Never runs in the browser, since the Save button is hidden; throws if it ever does. */
export async function saveFriendCard(_card: RefObject<SavableCard | null>): Promise<CardSaveDone> {
  throw new Error('Save the card from the app on your phone.');
}
