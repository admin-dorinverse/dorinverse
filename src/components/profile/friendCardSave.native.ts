// Saving the friend card to the phone's Photos: Skia turns the card on screen into a picture, and Expo's media library
// adds it to Photos. The picture is made only when Save is tapped. The browser uses friendCardSave.ts instead.

import { ImageFormat, makeImageFromView } from '@shopify/react-native-skia';
import type { ComponentRef, RefObject } from 'react';
import type { View } from 'react-native';

/** The friend card's outer box on screen, the part that becomes the picture. */
export type SavableCard = ComponentRef<typeof View>;

/** True where the card can be saved to Photos: on the phone. */
export const CAN_SAVE_CARD = true;

/** What happened: the card is in Photos, or the person said no to Photos. */
export type CardSaveDone = 'saved' | 'refused';

/** The picture's name while it waits in the app's cache on its way to Photos. */
const PICTURE_NAME = 'dorinverse-friend-card.png';

/** Asks for Photos (only to add pictures, never to look at them); true when the person says yes. */
async function askToSave(): Promise<boolean> {
  // Loaded here, not at the top, so an older app build without the media library still opens the friend card.
  const { requestPermissionsAsync } = await import('expo-media-library');
  const answer = await requestPermissionsAsync(true);
  return answer.granted;
}

/** Turns the card on screen into PNG bytes. Throws when the phone can't make the picture. */
async function cardPicture(card: RefObject<SavableCard | null>): Promise<Uint8Array> {
  const picture = await makeImageFromView(card as unknown as RefObject<number | null>);
  if (!picture) throw new Error('Couldn’t make the picture. Please try again.');
  const bytes = picture.encodeToBytes(ImageFormat.PNG, 100);
  picture.dispose();
  return bytes;
}

/** Saves the card to Photos, asking for Photos first. Throws with a plain message when it can't. */
export async function saveFriendCard(card: RefObject<SavableCard | null>): Promise<CardSaveDone> {
  let allowed: boolean;
  try {
    allowed = await askToSave();
  } catch {
    throw new Error('Saving needs the newest version of the app.');
  }
  if (!allowed) return 'refused';
  const bytes = await cardPicture(card);
  const { File, Paths } = await import('expo-file-system');
  const { Asset } = await import('expo-media-library');
  const file = new File(Paths.cache, PICTURE_NAME);
  try {
    file.create({ overwrite: true });
    await file.write(bytes);
    await Asset.create(file.uri);
  } catch {
    throw new Error('Couldn’t save to Photos. Please try again.');
  } finally {
    if (file.exists) file.delete();
  }
  return 'saved';
}
