// The friend code of the person asking for a call pass, when they are signed in on the app. The app's Supabase
// connection sends their sign-in token as "Authorization: Bearer <token>" by itself; the browser join page keeps no
// sign-in, so it sends none and gets no code.
//
// The code is asked for as the person (friend_code_mine, with their own token), so the database checks the token
// and only ever gives back their own code; this function needs no secret key for it. Anything that goes wrong
// (no token, a bad or expired one, a slow database) just means no code: the pass works exactly as before.

import { createClient } from 'npm:@supabase/supabase-js@2.119.0';

/** The longest wait for the code, so a slow database never holds up joining a call. */
const CODE_WAIT_MS = 3000;

/** A friend code as the database makes them: 10 letters and digits. */
const FRIEND_CODE = /^[A-Za-z0-9]{10}$/;

/**
 * The project's public key: the older single key (SUPABASE_ANON_KEY) when Supabase gives it, otherwise the default
 * from the newer key list (SUPABASE_PUBLISHABLE_KEYS). Empty when neither is set.
 */
function publicKey(): string {
  const legacy = Deno.env.get('SUPABASE_ANON_KEY');
  if (legacy) return legacy;
  const keys = JSON.parse(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS') ?? '{}') as Record<string, string>;
  return keys.default ?? Object.values(keys)[0] ?? '';
}

/** The sign-in token from "Authorization: Bearer <token>"; empty when there is none. */
function tokenFrom(req: Request): string {
  const header = req.headers.get('Authorization') ?? '';
  return header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : '';
}

/**
 * True when the token says it is a signed-in person's (role "authenticated"). This only skips asking for the
 * public key or junk; it trusts nothing, because the database checks the token itself.
 */
function looksSignedIn(token: string): boolean {
  try {
    const part = token.split('.')[1] ?? '';
    const claims = JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/'))) as { role?: unknown };
    return claims.role === 'authenticated';
  } catch {
    return false;
  }
}

/** The asking person's friend code (made if they have none yet), or null for anyone not signed in on the app. */
export async function friendCodeFrom(req: Request): Promise<string | null> {
  const token = tokenFrom(req);
  const url = Deno.env.get('SUPABASE_URL');
  const key = publicKey();
  if (!token || !url || !key || !looksSignedIn(token)) return null;
  try {
    const person = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data, error } = await person.rpc('friend_code_mine').abortSignal(AbortSignal.timeout(CODE_WAIT_MS));
    return !error && typeof data === 'string' && FRIEND_CODE.test(data) ? data : null;
  } catch {
    return null;
  }
}
