// How Papa Dorin's call program reads the lessons: with the app's PUBLIC database address and publishable key only,
// the same two values the app ships with. They are read from the repo's .env.local, which holds other secrets too,
// so only those two lines are parsed and nothing from the file is ever printed.

import { readFileSync } from 'node:fs';

/** The repo's .env.local, two folders up from scripts/app/papa-dorin-call. */
const APP_KEYS_FILE = new URL('../../../.env.local', import.meta.url);

/** The two public values, by name, from the app's keys file (every other line is skipped unread). */
function publicValues() {
  const wanted = { EXPO_PUBLIC_SUPABASE_URL: '', EXPO_PUBLIC_SUPABASE_KEY: '' };
  for (const line of readFileSync(APP_KEYS_FILE, 'utf8').split(/\r?\n/)) {
    const name = line.slice(0, line.indexOf('='));
    if (name in wanted) wanted[name] = line.slice(name.length + 1).trim().replace(/^["']|["']$/g, '');
  }
  return { url: wanted.EXPO_PUBLIC_SUPABASE_URL, key: wanted.EXPO_PUBLIC_SUPABASE_KEY };
}

const { url, key } = publicValues();

/** Asks the database's read address for `path` (like "passage?id=eq.1&select=title") and returns the rows. */
export async function readRows(path) {
  const reply = await fetch(`${url}/rest/v1/${path}`, { headers: { apikey: key, accept: 'application/json' } });
  // Only the status goes in the error: the reply never carries the key, but the request headers do.
  if (!reply.ok) throw new Error(`database read failed (${reply.status}) for ${path.split('?')[0]}`);
  return reply.json();
}
