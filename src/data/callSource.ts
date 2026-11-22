// Where the Group Voice Call gets its passes, and how it brings Papa Dorin in. This is the one file that changes at
// hookup: the call screens never ask anything else.
//
// Today (test only): the Supabase function call-pass starts a call for anyone with the app (they become its host)
// and lets anyone with the invite link join. Hookup: the same function requires sign-in, checks the host is a
// subscriber, and counts get-togethers.

import { database } from './database';

/** Everything needed to be on one call: its name, LiveKit's address and a pass for this person. */
export type CallPass = { room: string; url: string; token: string };

/** Asks the call-pass function for something; throws its plain message (like "This call has ended.") on failure. */
async function ask<T>(body: Record<string, string>): Promise<T> {
  const { data, error } = await database.functions.invoke<T>('call-pass', { body });
  if (error || !data) {
    // The function's own message, when it sent one, says what went wrong better than a general one.
    const sent = await (error as { context?: Response } | null)?.context?.json?.().catch(() => null);
    throw new Error(typeof sent?.error === 'string' ? sent.error : "Couldn't reach the call. Check the internet and try again.");
  }
  return data;
}

/** Starts a new call with this person as its host, showing `name` to everyone. */
export function startCall(name: string): Promise<CallPass> {
  return ask<CallPass>({ action: 'start', name });
}

/** Joins the call an invite link names, showing `name` to everyone. */
export function joinCall(room: string, name: string): Promise<CallPass> {
  return ask<CallPass>({ action: 'join', room, name });
}

/** The names of the people already on the call, for the joining screen. */
export async function whoIsHere(room: string): Promise<string[]> {
  return (await ask<{ names: string[] }>({ action: 'who', room })).names;
}

/** Host only: turns off everyone else's microphone (each can turn theirs back on); gives back how many. */
export async function quietEveryone(room: string, hostToken: string): Promise<number> {
  return (await ask<{ muted: number }>({ action: 'quiet', room, token: hostToken })).muted;
}

/** The host ends the get-together for everyone; `hostToken` is their pass, which proves they're the host. */
export async function endCall(room: string, hostToken: string): Promise<void> {
  await ask<{ ended: boolean }>({ action: 'end', room, token: hostToken });
}

/** Brings Papa Dorin into the call; `here` is true when he was already there. */
export function wakePapaDorin(room: string): Promise<{ coming: boolean; here: boolean }> {
  return ask({ action: 'wake', room });
}
