// In the browser there is no sign-in: the web build is only the join page for Group Voice Calls, which needs no
// account. So nothing is kept here; the phones use sessionStore.native.ts instead.

/** The store the database connection keeps the sign-in in. A store's three jobs, as the phones' store has them. */
type SessionStore = {
  /** Reads a saved value, or null. */
  getItem: (key: string) => Promise<string | null>;
  /** Saves a value. */
  setItem: (key: string, value: string) => Promise<void>;
  /** Removes a saved value. */
  removeItem: (key: string) => Promise<void>;
};

/** No store in the browser, so the web page never keeps a sign-in. */
export const sessionStore: SessionStore | null = null;
