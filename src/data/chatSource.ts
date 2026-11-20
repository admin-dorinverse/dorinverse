// Where Chat with Papa Dorin's replies come from. This is the one file that changes at hookup: the chat page never
// asks anything else for a reply.
//
// Today (test only): the owner's PC runs scripts/app/papa-dorin-chat/dev-server.mjs, which answers through the
// owner's own Claude subscription, with his character notes as written and the baker's words unchanged. The app
// finds it on the same computer that serves the app while developing.
// Hookup: a server function that checks who is asking and their chat cookies, then calls Claude with the API.

import Constants from 'expo-constants';

/** One message in the chat: the baker's (user) or Papa Dorin's (assistant). */
export type ChatMessage = { role: 'user' | 'assistant'; content: string };

/** The test helper's port on the owner's PC. */
const HELPER_PORT = 8787;

/** The test helper's address: the computer serving the app while developing, or null when there is none. */
function helperAddress(): string | null {
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  return __DEV__ && host ? `http://${host}:${HELPER_PORT}` : null;
}

/** Papa Dorin's reply, and the id of the chat it belongs to (send it back with the next message so he remembers). */
export type ChatReply = { reply: string; sessionId: string };

/** Sends the baker's message, in a new chat or the one `sessionId` names. Throws a plain message when he can't answer. */
export async function askPapaDorin(message: string, sessionId: string | null, signal?: AbortSignal): Promise<ChatReply> {
  const address = helperAddress();
  if (!address) throw new Error("Papa Dorin's chat isn't open yet.");
  let res: Response;
  try {
    res = await fetch(`${address}/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message, sessionId }), signal });
  } catch (e) {
    if (signal?.aborted) throw e;
    throw new Error("Couldn't reach Papa Dorin. Is the test chat running on the PC?");
  }
  const j = (await res.json().catch(() => ({}))) as { reply?: string; sessionId?: string; error?: string };
  if (!res.ok || !j.reply || !j.sessionId) throw new Error(j.error ?? 'Papa Dorin is busy in the kitchen. Try again in a moment.');
  return { reply: j.reply, sessionId: j.sessionId };
}
