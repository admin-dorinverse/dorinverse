// Connects the app to the Supabase database. The address and the public key come from .env.local
// (EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_KEY); both are meant to ship inside the app.

import { createClient } from '@supabase/supabase-js';

/** The database address, like "https://xyz.supabase.co". */
const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';

/** The public (publishable) key. It only allows what the database's read rules allow. */
const key = process.env.EXPO_PUBLIC_SUPABASE_KEY ?? '';

/** The shared database connection. Sign-in is not built yet, so it keeps no session for now. */
export const database = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});
