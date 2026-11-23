// Saves the signed-in person's friends data on the phone, encrypted (with sessionStore, the same way as the sign-in):
// their friend code, friends list, news, unread count and the friend universes they opened. It is read once when
// the app starts and then kept in memory too, so pages show it at once. In the browser nothing is saved.

import { sessionStore } from './sessionStore';
import type { Friend, FriendNotification, FriendUniverse } from '@/types/friends';

/** Where the friends data is saved. */
const KEY = 'friends.saved';

/** One saved piece and when it came from the server (milliseconds), so pages know how old it is. */
export type SavedPiece<T> = {
  /** The piece. */
  value: T;
  /** When the server sent it. */
  at: number;
};

/** The pieces saved for a person, by name. */
export type FriendPieces = {
  /** Their friend code. */
  code: string;
  /** Their friends, newest first. */
  friends: Friend[];
  /** Their news, newest first. */
  news: FriendNotification[];
  /** How many pieces of news they haven't seen. */
  unread: number;
};

/** Everything saved, and whose it is. A piece missing means it was never fetched. */
export type SavedFriends = { [Name in keyof FriendPieces]?: SavedPiece<FriendPieces[Name]> } & {
  /** The account it belongs to. Another person's saved data is never shown. */
  userId: string;
  /** The friend universes opened, by friend id. */
  universes: Record<string, SavedPiece<FriendUniverse>>;
};

/** What the phone holds, once it has been read. Null when nothing is saved. */
let held: SavedFriends | null = null;

/** The first read of the phone's copy, made once. */
let reading: Promise<void> | null = null;

/** The latest save, so saves happen one after another and the newest always lands last. */
let saving: Promise<void> = Promise.resolve();

/** Reads the phone's copy into memory, once. Later calls wait for the same read. */
export function loadSavedFriends(): Promise<void> {
  reading ??= (async () => {
    try {
      const text = (await sessionStore?.getItem(KEY)) ?? null;
      const parsed = text ? (JSON.parse(text) as SavedFriends) : null;
      held = parsed?.userId ? { ...parsed, universes: parsed.universes ?? {} } : null;
    } catch {
      // Nothing usable is saved; the pages fetch from the server instead.
    }
  })();
  return reading;
}

/** What is saved for this person, or null when nothing is (or it belongs to someone else, or isn't read yet). */
export function savedFriendsFor(userId: string): SavedFriends | null {
  return held?.userId === userId ? held : null;
}

/** One piece saved for this person, or undefined when it isn't saved. */
export function savedPiece<Name extends keyof FriendPieces>(userId: string, name: Name): SavedPiece<FriendPieces[Name]> | undefined {
  return savedFriendsFor(userId)?.[name] as SavedPiece<FriendPieces[Name]> | undefined;
}

/** Writes what memory holds to the phone, after any save already under way. */
function writeHeld(): void {
  saving = saving.then(async () => {
    try {
      if (held) await sessionStore?.setItem(KEY, JSON.stringify(held));
      else await sessionStore?.removeItem(KEY);
    } catch {
      // Not saved this time; memory still holds it until the app closes.
    }
  });
}

/**
 * Changes what is saved for this person and saves it on the phone. A different person's saved data is dropped
 * first, so only one person's data is ever kept. It waits for the first read, so a save never loses the old copy.
 */
export function keepFriends(userId: string, change: (saved: SavedFriends) => SavedFriends): void {
  void loadSavedFriends().then(() => {
    held = change(savedFriendsFor(userId) ?? { userId, universes: {} });
    writeHeld();
  });
}

/** Drops what is saved when it belongs to someone other than this person (a different person signed in). */
export function keepOnlyFriendsOf(userId: string): void {
  void loadSavedFriends().then(() => {
    if (!held || held.userId === userId) return;
    held = null;
    writeHeld();
  });
}

/** Forgets everything saved, on the phone and in memory, when the person signs out. */
export function forgetSavedFriends(): void {
  void loadSavedFriends().then(() => {
    held = null;
    writeHeld();
  });
}
