// Keeps the person's sign-in on the phone, encrypted. The phone's secure store (expo-secure-store) only takes small
// values, and a sign-in can be bigger, so each value is locked with an AES key: the key goes in the secure store
// and the locked value in the app's key-value store (expo-sqlite). This is Supabase's "LargeSecureStore" idea.
// Each value keeps one key, so a refreshed sign-in is a single write and a read can never meet a half-saved one.

import { AESEncryptionKey, AESSealedData, aesDecryptAsync, aesEncryptAsync } from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import Storage from 'expo-sqlite/kv-store';

/** The secure store's setting: readable once the phone has been unlocked after a restart. */
const KEY_OPTIONS: SecureStore.SecureStoreOptions = { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK };

/** Each value's AES key once it has been read or made, so it is fetched from the secure store only once. */
const keys = new Map<string, Promise<AESEncryptionKey | null>>();

/** Where a locked value is kept in the key-value store, so it never mixes with the app's other saved things. */
function lockedSpot(key: string): string {
  return `auth.${key}`;
}

/** The value's AES key from the secure store, or null when there is none or it can't be read. */
async function readKey(key: string): Promise<AESEncryptionKey | null> {
  try {
    const hex = await SecureStore.getItemAsync(key, KEY_OPTIONS);
    return hex ? await AESEncryptionKey.import(hex, 'hex') : null;
  } catch {
    return null;
  }
}

/** The value's AES key, made and saved first when there is none yet (only when `make` is true). */
function keyFor(key: string, make: boolean): Promise<AESEncryptionKey | null> {
  let found = keys.get(key);
  if (!found) {
    found = readKey(key);
    keys.set(key, found);
  }
  if (!make) return found;
  const made = found.then(async (aes) => {
    if (aes) return aes;
    const fresh = await AESEncryptionKey.generate();
    await SecureStore.setItemAsync(key, await fresh.encoded('hex'), KEY_OPTIONS);
    return fresh;
  });
  keys.set(key, made);
  // A key that couldn't be saved is forgotten, so the next save tries again.
  made.catch(() => keys.delete(key));
  return made;
}

/** Locks a value with its key and keeps the locked value in the key-value store. */
async function setItem(key: string, value: string): Promise<void> {
  const aes = await keyFor(key, true);
  if (!aes) throw new Error('No key for the saved sign-in.');
  const sealed = await aesEncryptAsync(new TextEncoder().encode(value), aes);
  await Storage.setItemAsync(lockedSpot(key), (await sealed.combined('base64')) as string);
}

/**
 * Unlocks a saved value, or null when there is none. A value that can't be unlocked (say the phone was restored
 * from a backup, which never carries the secure store's keys) is removed and counts as none.
 */
async function getItem(key: string): Promise<string | null> {
  const locked = await Storage.getItemAsync(lockedSpot(key)).catch(() => null);
  if (!locked) return null;
  try {
    const aes = await keyFor(key, false);
    if (!aes) throw new Error('No key for the saved sign-in.');
    const bytes = await aesDecryptAsync(AESSealedData.fromCombined(locked), aes, { output: 'bytes' });
    return new TextDecoder().decode(bytes as Uint8Array);
  } catch {
    await removeItem(key);
    return null;
  }
}

/** Removes a saved value and its key. */
async function removeItem(key: string): Promise<void> {
  keys.delete(key);
  await Storage.removeItemAsync(lockedSpot(key)).catch(() => {});
  await SecureStore.deleteItemAsync(key, KEY_OPTIONS).catch(() => {});
}

/** The encrypted store the database connection keeps the sign-in in. */
export const sessionStore = { getItem, setItem, removeItem };
