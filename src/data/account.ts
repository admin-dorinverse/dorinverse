// The person's account while the app runs: who is signed in and their username. At start the sign-in is read
// straight from the phone and the username from its saved copy, so a signed-in person opens to the Sky with no
// network wait. Pages read it with useAccount; the sign-in actions live in accountActions.ts.

import type { Session } from '@supabase/supabase-js';
import { useSyncExternalStore } from 'react';
import { database, SESSION_KEY } from '@/data/database';
import { sessionStore } from '@/data/storage/sessionStore';
import { forgetUsername, readSavedUsername, saveUsername } from '@/data/storage/usernameStore';
import type { AccountPerson, AccountState, AccountStep } from '@/types/account';

/** The account right now. */
let state: AccountState = { step: 'loading', person: null, username: undefined, lookupFailed: false };

/** Pages listening for changes. */
const listeners = new Set<() => void>();

/** True while a password reset is part way through, so its short sign-in doesn't move the person off the page. */
let held = false;

/** The latest sign-in news that came while held, applied when the hold ends (undefined: none came). */
let heldSession: Session | null | undefined;

/** True once startAccount has run. */
let started = false;

/** Where the person is, worked out from who is signed in and their username. */
function stepFor(person: AccountPerson | null, username: string | null | undefined): AccountStep {
  if (!person) return 'signedOut';
  return typeof username === 'string' ? 'ready' : 'needsUsername';
}

/** Changes the account and tells the listening pages. */
function publish(change: Partial<Omit<AccountState, 'step'>>): void {
  const next = { ...state, ...change };
  state = { ...next, step: stepFor(next.person, next.username) };
  listeners.forEach((l) => l());
}

/** Sets who is signed in. A new person gets their saved username, or it is looked up on the server. */
function setPerson(person: AccountPerson | null): void {
  if (!person) {
    forgetUsername();
    publish({ person: null, username: undefined, lookupFailed: false });
    return;
  }
  if (person.userId === state.person?.userId) {
    publish({ person });
    return;
  }
  const saved = readSavedUsername(person.userId);
  publish({ person, username: saved ?? undefined, lookupFailed: false });
  if (saved === null) setTimeout(() => void lookUpUsername(), 0);
}

/** The person in a sign-in, or null. */
function personIn(session: Session | null): AccountPerson | null {
  return session ? { userId: session.user.id, email: session.user.email ?? null } : null;
}

/** Applies sign-in news from the database connection. */
function onSession(event: string, session: Session | null): void {
  if (held) {
    heldSession = session;
    return;
  }
  if (event === 'SIGNED_OUT') setPerson(null);
  else if (session) setPerson(personIn(session));
  // No sign-in at start can just mean no internet, and then the saved one is kept: only sign out when it is gone.
  else if (event === 'INITIAL_SESSION') void savedSignInGone().then((gone) => gone && setPerson(null));
}

/** True when the phone no longer has a saved sign-in (the server turned it down and it was removed). */
async function savedSignInGone(): Promise<boolean> {
  return !sessionStore || (await sessionStore.getItem(SESSION_KEY).catch(() => null)) === null;
}

/**
 * Starts the account. The root layout calls this once. It reads the saved sign-in from the phone (no network),
 * then listens to the database connection for sign-ins, refreshes and sign-outs.
 */
export function startAccount(): void {
  if (started) return;
  started = true;
  const read = sessionStore ? sessionStore.getItem(SESSION_KEY).catch(() => null) : Promise.resolve(null);
  void read.then((saved) => {
    let person: AccountPerson | null = null;
    try {
      const parsed = saved ? (JSON.parse(saved) as Session) : null;
      if (parsed?.user?.id && parsed.refresh_token) person = personIn(parsed);
    } catch {
      person = null;
    }
    setPerson(person);
    database.auth.onAuthStateChange(onSession);
  });
}

/** Asks the server for the person's username, and saves it on the phone when there is one. */
export async function lookUpUsername(): Promise<void> {
  const person = state.person;
  if (!person) return;
  publish({ lookupFailed: false });
  const { data, error } = await database.from('profile').select('username').eq('id', person.userId).maybeSingle<{ username: string | null }>();
  if (state.person?.userId !== person.userId) return;
  if (error) {
    publish({ lookupFailed: true });
    return;
  }
  const username = data?.username ?? null;
  if (username) saveUsername(person.userId, username);
  publish({ username, lookupFailed: false });
}

/** Records a username the server just saved, so the person moves on to the app. */
export function usernameSaved(username: string): void {
  if (!state.person) return;
  saveUsername(state.person.userId, username);
  publish({ username });
}

/** Signs the person out on the phone at once, without waiting for any news from the server. */
export function signedOutHere(): void {
  setPerson(null);
}

/** Holds the person on the current page through a password reset's short sign-in, then lets the news through. */
export function holdAccount(on: boolean): void {
  held = on;
  if (on || heldSession === undefined) return;
  const session = heldSession;
  heldSession = undefined;
  setPerson(personIn(session));
}

/** Adds a page that listens for changes; returns how to stop listening. */
function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The account right now, for code outside pages. */
export function currentAccount(): AccountState {
  return state;
}

/** The account, redrawing the page when it changes. */
export function useAccount(): AccountState {
  return useSyncExternalStore(subscribe, currentAccount);
}
