// Phone notifications for friend requests. Once a signed-in person reaches the app, this asks once for permission,
// gets the phone's Expo push token and gives it to the server, which sends "<username> wants to be friends" when
// a request comes in. Nothing here runs in the background or checks the server on a timer. The web uses friendPush.ts.

import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Platform } from 'react-native';
import { database } from '@/data/database';
import {
  alreadyAskedForPush,
  forgetSavedPushToken,
  noteAskedForPush,
  readSavedPushToken,
  savePushToken,
} from '@/data/storage/pushTokenStore';

/** The Android channel friend requests show in; the server sends with this same id. */
export const FRIENDS_CHANNEL = 'friends';

/** The only page a notification may open: the Notifications page's real address. */
const NOTIFICATIONS_PAGE = '/notifications';

/** How long a saved token is trusted before checking it with Expo again (a week). */
const RECHECK_MS = 7 * 24 * 60 * 60 * 1000;

/** How long sign-out waits for the server to drop the token before signing out anyway. */
const FORGET_WAIT_MS = 3000;

/** True while setUpFriendPush is running, so two calls never overlap. */
let settingUp = false;

/** The last tapped notification already opened, so a tap seen both at start and by the listener opens once. */
let lastOpened = '';

/** The EAS project id from app.json, which Expo needs to make the token. */
function projectId(): string | undefined {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  return extra?.eas?.projectId ?? Constants.easConfig?.projectId;
}

/** Makes the Android "Friend requests" channel. Android 13+ shows the permission question only once one exists. */
async function makeChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(FRIENDS_CHANNEL, {
    name: 'Friend requests',
    importance: AndroidImportance.HIGH,
  });
}

/** True when notifications may show. Asks the person only the first time; a "no" is never asked again. */
async function allowed(): Promise<boolean> {
  const now = await Notifications.getPermissionsAsync();
  if (now.granted) return true;
  if (!now.canAskAgain || alreadyAskedForPush()) return false;
  noteAskedForPush();
  return (await Notifications.requestPermissionsAsync()).granted;
}

/**
 * Sets up friend request notifications for the signed-in person. It gives the token to the server only when it
 * is new or belongs to someone else here, and checks it with Expo about once a week. It never throws.
 */
export async function setUpFriendPush(userId: string): Promise<void> {
  if (settingUp || (Platform.OS !== 'android' && Platform.OS !== 'ios')) return;
  settingUp = true;
  try {
    await makeChannel();
    if (!(await allowed())) return;
    const saved = readSavedPushToken();
    if (saved?.userId === userId && Date.now() - saved.checkedAt < RECHECK_MS) return;
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId: projectId() });
    if (saved?.userId !== userId || saved.token !== token) {
      const { error } = await database.rpc('register_push_token', { p_device_token: token, p_platform: Platform.OS });
      if (error) throw error;
    }
    savePushToken({ userId, token, checkedAt: Date.now() });
  } catch (error) {
    // No internet, an emulator without Google Play, or a build without Firebase set up: try again next start.
    if (__DEV__) console.warn('[friend push]', error);
  } finally {
    settingUp = false;
  }
}

/** Takes this phone's token off the server, before signing out, so the next person here isn't sent their news. */
export async function forgetPushToken(): Promise<void> {
  const saved = readSavedPushToken();
  if (!saved) return;
  const remove = database.from('push_token').delete().eq('device_token', saved.token).then(() => undefined);
  await Promise.race([remove, new Promise<void>((done) => setTimeout(done, FORGET_WAIT_MS))]).catch(() => {});
  forgetSavedPushToken();
}

/** The page a tapped notification asks for, if it is one the app opens and it wasn't opened already. */
function pageFor(response: Notifications.NotificationResponse | null): string | null {
  const url = response?.notification.request.content.data?.url;
  const id = response?.notification.request.identifier ?? '';
  if (url !== NOTIFICATIONS_PAGE || id === lastOpened) return null;
  lastOpened = id;
  return url;
}

/** The page a notification tapped while the app was closed asks for, read once and then cleared. */
export function takeTappedPage(): string | null {
  const page = pageFor(Notifications.getLastNotificationResponse());
  if (page) Notifications.clearLastNotificationResponse();
  return page;
}

/**
 * Listens while the app is open: `onTap` gets the page a tapped notification asks for, and `onArrive` runs when a
 * friend request notification arrives. Returns a function that stops listening.
 */
export function listenForFriendPush(onTap: (page: string) => void, onArrive: () => void): () => void {
  const taps = Notifications.addNotificationResponseReceivedListener((response) => {
    const page = pageFor(response);
    if (!page) return;
    Notifications.clearLastNotificationResponse();
    onTap(page);
  });
  const arrivals = Notifications.addNotificationReceivedListener((notification) => {
    if (notification.request.content.data?.url === NOTIFICATIONS_PAGE) onArrive();
  });
  return () => {
    taps.remove();
    arrivals.remove();
  };
}
