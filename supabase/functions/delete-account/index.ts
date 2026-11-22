// Deletes the signed-in person's account. The app sends a POST with the person's own sign-in token
// ("Authorization: Bearer <token>"); this checks the token with Supabase Auth and then follows the account-deletion
// steps the database was built for (initial schema, A5):
//   1. prepare_account_deletion(), run as the person: hands their sent gift boxes, games, purchases and chip
//      records to the "Deleted player" profile, and locks the account so nothing new is written.
//   2. Clears their files: sent gift boxes' files move to gifts/<box id>/ so the people who got them keep them;
//      everything else under their folder is removed.
//   3. Deletes the sign-in with the secret key, which deletes their profile and the rest of their rows with it.
//
// Answers { ok: true } when the account is gone, or { error: '<plain message>' } with a fitting status. Every step
// is safe to run again, so the app can simply retry. Tokens are never logged.

import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.119.0';

/** Browsers may call this too, like call-pass. */
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

/** The bucket with each person's avatar, at <user id>/avatar.jpg. */
const AVATARS = 'avatars';

/** The buckets with keepsake box files, at <user id>/<box id>/<file>. */
const BOX_BUCKETS = ['box-photos', 'box-audio', 'box-signatures'];

/** The one plain message for anything that goes wrong on our side. */
const FAILED = 'Your account could not be deleted. Please try again.';

/** A JSON answer with the browser headers. */
function reply(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
}

/** A secret from Supabase's settings; throws if it's missing, so a bad setup fails loudly. */
function secret(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

/**
 * One of the project's keys: the older single key (SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY) when Supabase
 * gives it, otherwise the default from the newer key list (SUPABASE_SECRET_KEYS or SUPABASE_PUBLISHABLE_KEYS).
 */
function projectKey(legacyName: string, listName: string): string {
  const legacy = Deno.env.get(legacyName);
  if (legacy) return legacy;
  const keys = JSON.parse(secret(listName)) as Record<string, string>;
  const key = keys.default ?? Object.values(keys)[0];
  if (!key) throw new Error(`no key in ${listName}`);
  return key;
}

/** A Supabase client with the secret key, for checking tokens, moving files and deleting users. */
function adminClient(): SupabaseClient {
  return createClient(secret('SUPABASE_URL'), projectKey('SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SECRET_KEYS'), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** A Supabase client that acts as the person, so the database's own sign-in checks apply. */
function personClient(token: string): SupabaseClient {
  return createClient(secret('SUPABASE_URL'), projectKey('SUPABASE_ANON_KEY', 'SUPABASE_PUBLISHABLE_KEYS'), {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

/** The sign-in token from "Authorization: Bearer <token>"; empty when there is none. */
function tokenFrom(req: Request): string {
  const header = req.headers.get('Authorization') ?? '';
  return header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : '';
}

/** The names of everything directly inside one folder of a bucket (files and sub-folders). */
async function namesIn(admin: SupabaseClient, bucket: string, folder: string): Promise<string[]> {
  const names: string[] = [];
  for (let offset = 0; ; offset += 100) {
    const { data, error } = await admin.storage.from(bucket).list(folder, { limit: 100, offset });
    if (error) throw new Error(`list ${bucket}: ${error.message}`);
    names.push(...data.map((item) => item.name));
    if (data.length < 100) return names;
  }
}

/** Removes some files from a bucket; nothing to do when the list is empty. */
async function removeFiles(admin: SupabaseClient, bucket: string, paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  const { error } = await admin.storage.from(bucket).remove(paths);
  if (error) throw new Error(`remove ${bucket}: ${error.message}`);
}

/**
 * Clears the person's files: their avatar, the files of boxes they kept, and moves the files of gift boxes they
 * sent (keptGiftBoxes) to gifts/<box id>/ so the people who got them can still open them.
 */
async function clearFiles(admin: SupabaseClient, userId: string, keptGiftBoxes: string[]): Promise<void> {
  const avatar = await namesIn(admin, AVATARS, userId);
  await removeFiles(admin, AVATARS, avatar.map((name) => `${userId}/${name}`));
  for (const bucket of BOX_BUCKETS) {
    for (const box of await namesIn(admin, bucket, userId)) {
      const files = (await namesIn(admin, bucket, `${userId}/${box}`)).map((name) => `${userId}/${box}/${name}`);
      if (!keptGiftBoxes.includes(box)) {
        await removeFiles(admin, bucket, files);
        continue;
      }
      for (const from of files) {
        const { error } = await admin.storage.from(bucket).move(from, `gifts/${box}/${from.split('/').pop()}`);
        if (error) throw new Error(`move ${bucket}: ${error.message}`);
      }
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return reply(405, { error: 'POST only' });
  const token = tokenFrom(req);
  if (!token) return reply(401, { error: 'Please sign in first.' });
  try {
    const admin = adminClient();
    const { data, error } = await admin.auth.getUser(token);
    if (error || !data.user) return reply(401, { error: 'Please sign in again.' });
    const userId = data.user.id;

    const prepared = await personClient(token).rpc('prepare_account_deletion');
    if (prepared.error) {
      console.error('delete-account: prepare failed', userId, prepared.error.code, prepared.error.message);
      return reply(prepared.error.code === '42501' ? 401 : 500, { error: prepared.error.code === '42501' ? 'Please sign in again.' : FAILED });
    }
    await clearFiles(admin, userId, (prepared.data?.kept_gift_boxes ?? []) as string[]);

    const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
    if (deleteError) {
      console.error('delete-account: could not delete', userId, deleteError.message);
      return reply(500, { error: FAILED });
    }
    return reply(200, { ok: true });
  } catch (e) {
    console.error('delete-account:', e instanceof Error ? e.message : 'unknown error');
    return reply(500, { error: FAILED });
  }
});
