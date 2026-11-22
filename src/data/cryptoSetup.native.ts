// Gives the phone a working crypto.getRandomValues for sign-in. LiveKit's setup (callSetup) makes a bare global
// `crypto` with only randomUUID, and Supabase's sign-in calls crypto.getRandomValues on it, which then fails.
// This fills in that one piece from expo-crypto (the phone's secure random numbers); it must load after callSetup.

import { getRandomValues } from 'expo-crypto';

/** The global crypto object, which on the phone may be missing or only partly there. */
const globalCrypto = (globalThis as { crypto?: Partial<Crypto> }).crypto ?? {};

if (typeof globalCrypto.getRandomValues !== 'function') {
  globalCrypto.getRandomValues = getRandomValues as Crypto['getRandomValues'];
  (globalThis as { crypto?: Partial<Crypto> }).crypto = globalCrypto;
}
