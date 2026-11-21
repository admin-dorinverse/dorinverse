// Where the chat's replies come from, for Papa Dorin and the weekly guest. This is the one file that changes at
// hookup: the chat page never asks anything else for a reply.
//
// Today (test only): the owner's PC runs scripts/app/papa-dorin-chat/dev-server.mjs, which answers through the
// owner's own Claude subscription, with the character's notes as written and the baker's words unchanged. The app
// finds it on the same computer that serves the app while developing.
// Hookup: a server function that checks who is asking and their chat cookies, then calls Claude with the API.

import Constants from 'expo-constants';
import type { ChatCharacter } from '@/types/chat';

/** One message in the chat: the baker's (user) or the character's (assistant). */
export type ChatMessage = { role: 'user' | 'assistant'; content: string };

/** The test helper's port on the owner's PC. */
const HELPER_PORT = 8787;

/** The test helper's address: the computer serving the app while developing, or null when there is none. */
function helperAddress(): string | null {
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  return __DEV__ && host ? `http://${host}:${HELPER_PORT}` : null;
}

/** The character's reply, and the id of the chat it belongs to (send it back with the next message so they remember). */
export type ChatReply = { reply: string; sessionId: string };

/**
 * Sends the baker's message to a character, in a new chat or the one `sessionId` names (a chat stays with one
 * character). Throws a plain message when they can't answer.
 */
export async function askCharacter(who: ChatCharacter, message: string, sessionId: string | null, signal?: AbortSignal): Promise<ChatReply> {
  const address = helperAddress();
  if (!address) throw new Error(`${who.name}'s chat isn't open yet.`);
  let res: Response;
  try {
    res = await fetch(`${address}/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ character: who.id, message, sessionId }), signal });
  } catch (e) {
    if (signal?.aborted) throw e;
    throw new Error(`Couldn't reach ${who.name}. Is the test chat running on the PC?`);
  }
  const j = (await res.json().catch(() => ({}))) as { reply?: string; sessionId?: string; error?: string };
  if (!res.ok || !j.reply || !j.sessionId) throw new Error(j.error ?? `${who.name} is busy in the kitchen. Try again in a moment.`);
  return { reply: j.reply, sessionId: j.sessionId };
}
