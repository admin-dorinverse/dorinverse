// Connects the app to the Supabase database. The address and the public key come from .env.local
// (EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_KEY); both are meant to ship inside the app.
// On the phones it keeps the person's sign-in, encrypted, and refreshes it only while the app is open.

import { createClient, processLock } from '@supabase/supabase-js';
import { AppState } from 'react-native';
import { sessionStore } from '@/data/storage/sessionStore';

/** The database address, like "https://xyz.supabase.co". */
const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';

/** The public (publishable) key. It only allows what the database's read rules allow. */
const key = process.env.EXPO_PUBLIC_SUPABASE_KEY ?? '';

/** Where the sign-in is saved on the phone. src/data/account.ts reads it there at start, without the network. */
export const SESSION_KEY = 'dorinverse.session';

/**
 * The shared database connection. On the phones it saves the sign-in in the encrypted store and uses the PKCE
 * sign-in flow (the safe one for apps); in the browser (the call join page only) it keeps no sign-in at all.
 */
export const database = createClient(url, key, {
  auth: sessionStore
    ? {
        storage: sessionStore,
        storageKey: SESSION_KEY,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        flowType: 'pkce',
        lock: processLock,
      }
    : { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

// On the phones, the sign-in is kept fresh only while the app is open; in the background nothing runs.
if (sessionStore) {
  if (AppState.currentState === 'active') void database.auth.startAutoRefresh();
  AppState.addEventListener('change', (state) => {
    if (state === 'active') void database.auth.startAutoRefresh();
    else void database.auth.stopAutoRefresh();
  });
}
