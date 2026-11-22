// The shape of a person's account in the app: who is signed in, their username, and what the server says about a
// username they try.

/** The signed-in person, as the app keeps them on the phone. */
export type AccountPerson = {
  /** Their account id on the server. */
  userId: string;
  /** The email they signed in with, when the sign-in gave one. */
  email: string | null;
};

/**
 * Where the person is with their account. `loading` lasts only while the saved sign-in is read from the phone.
 * `needsUsername` is signed in without a username yet (or while the server is still being asked for it).
 */
export type AccountStep = 'loading' | 'signedOut' | 'needsUsername' | 'ready';

/** Everything pages know about the account. */
export type AccountState = {
  /** Where the person is with their account. */
  step: AccountStep;
  /** The signed-in person, or null when signed out. */
  person: AccountPerson | null;
  /** Their username; null when they have none yet, undefined while it is still being looked up. */
  username: string | null | undefined;
  /** True when looking up the username failed (no internet), so the page can offer to try again. */
  lookupFailed: boolean;
};

/** What the server says about a username: fine, already used, against the rules, or not a name we allow. */
export type UsernameVerdict = 'ok' | 'taken' | 'invalid' | 'not_allowed';

/** The sign-in services besides email and password. */
export type SocialProvider = 'google' | 'apple';
