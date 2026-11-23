// The Group Voice Call's passes (test version). The app asks here to start a call (the starter becomes its host),
// to join one from an invite link, to see who's already on it, to bring Papa Dorin in, or (host only) to mute
// everyone else at once.
// The LiveKit keys stay in Supabase's secrets (LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET) and never reach the
// phone; the phone only gets a pass for one call, good for a few hours, that lets it talk (microphone only).
//
// The host's identity starts with "host-" and a guest's with "guest-". Identities can't be changed on the call, so
// Papa Dorin's program trusts that start to know who may run the verse, lesson and trivia.
// A person signed in on the app also gets their friend code on the end ("guest-1a2b3c4d-AbCdEf1234"), so tapping
// them on the call opens their friend page. It sits in the identity because people can change their own name,
// metadata and attributes on the call (the lesson picks need that), but never their identity.
//
// Test only: anyone with the app can start a call. Hookup: require sign-in, check the host is a subscriber, and
// count voice calls on the server.

import { AccessToken, AgentDispatchClient, RoomServiceClient, TokenVerifier, TrackSource } from 'npm:livekit-server-sdk@2.20.1';
import { friendCodeFrom } from './friendCode.ts';

/** Papa Dorin's agent name, as set in scripts/app/papa-dorin-call/agent.mjs. */
const PAPA_DORIN = 'papa-dorin';

/** LiveKit's number for an agent in a call's people list (ParticipantInfo.Kind AGENT, not exported by the SDK). */
const AGENT_KIND = 4;

/** How long a pass lasts. */
const PASS_TTL = '4h';

/** A call's name: "call-" and 10 random letters and digits, made here when a call starts. */
const CALL_ROOM = /^call-[a-z0-9]{10}$/;

/** How long an empty call stays open (seconds), so the host can step out and back. */
const EMPTY_KEEP_SECONDS = 10 * 60;

/** The most people on one call. */
const MOST_PEOPLE = 20;

/** The longest name a person can show on the call. */
const NAME_MAX = 24;

/** Browsers may call this from the web join page. */
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

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

/** LiveKit's server address for its API: the same host as the call address, over https. */
function apiHost(url: string): string {
  return url.replace(/^wss:/, 'https:').replace(/^ws:/, 'http:');
}

/** LiveKit's room service, with the keys from Supabase's secrets. */
function rooms(): RoomServiceClient {
  return new RoomServiceClient(apiHost(secret('LIVEKIT_URL')), secret('LIVEKIT_API_KEY'), secret('LIVEKIT_API_SECRET'));
}

/** A short random ending, so two people with the same name are still two people. */
function randomTag(): string {
  return crypto.randomUUID().slice(0, 8);
}

/** "call-" and 10 random lowercase letters and digits, for a new call's name. */
function randomCallName(): string {
  const letters = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  return `call-${Array.from(bytes, (b) => letters[b % letters.length]).join('')}`;
}

/**
 * Makes a pass for one person to join one call, talking with their microphone only. They may set their own
 * attributes (the host's "what's on screen", everyone's lesson pick), but their identity, and so who is host, is fixed.
 * A signed-in person's `friendCode` goes on the end of their identity.
 */
async function passFor(room: string, name: string, role: 'host' | 'guest', friendCode: string | null): Promise<{ url: string; token: string }> {
  const at = new AccessToken(secret('LIVEKIT_API_KEY'), secret('LIVEKIT_API_SECRET'), {
    identity: `${role}-${randomTag()}${friendCode ? `-${friendCode}` : ''}`,
    name,
    ttl: PASS_TTL,
  });
  at.addGrant({
    room,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
    canUpdateOwnMetadata: true,
    canPublishSources: [TrackSource.MICROPHONE],
  });
  return { url: secret('LIVEKIT_URL'), token: await at.toJwt() };
}

/** Starts a new call with this person as host: makes the room, then their pass. */
async function startCall(name: string, friendCode: string | null): Promise<Response> {
  const room = randomCallName();
  await rooms().createRoom({ name: room, emptyTimeout: EMPTY_KEEP_SECONDS, departureTimeout: EMPTY_KEEP_SECONDS, maxParticipants: MOST_PEOPLE });
  return reply(200, { room, ...(await passFor(room, name, 'host', friendCode)) });
}

/** Joins an existing call as a guest; a call that has ended (or never started) can't be joined. */
async function joinCall(room: string, name: string, friendCode: string | null): Promise<Response> {
  const open = await rooms().listRooms([room]);
  if (open.length === 0) return reply(404, { error: 'This call has ended.' });
  return reply(200, { room, ...(await passFor(room, name, 'guest', friendCode)) });
}

/** The names of the people already on the call (not Papa Dorin), for the joining screen. */
async function whoIsHere(room: string): Promise<Response> {
  const people = await rooms()
    .listParticipants(room)
    .catch(() => []);
  return reply(200, { names: people.filter((p) => p.kind !== AGENT_KIND).map((p) => p.name || 'Guest') });
}

/** Brings Papa Dorin into the call, unless he's already there. */
async function wakePapaDorin(room: string): Promise<Response> {
  const people = await rooms().listParticipants(room);
  if (people.some((p) => p.kind === AGENT_KIND)) return reply(200, { coming: false, here: true });
  await new AgentDispatchClient(apiHost(secret('LIVEKIT_URL')), secret('LIVEKIT_API_KEY'), secret('LIVEKIT_API_SECRET')).createDispatch(room, PAPA_DORIN);
  return reply(200, { coming: true, here: false });
}

/**
 * The host's identity when `token` is this call's host pass (real, signed with our LiveKit secret, for this call,
 * and a host's); null for anyone else.
 */
async function hostFrom(room: string, token: unknown): Promise<string | null> {
  if (typeof token !== 'string' || token.length === 0) return null;
  const pass = await new TokenVerifier(secret('LIVEKIT_API_KEY'), secret('LIVEKIT_API_SECRET')).verify(token).catch(() => null);
  const host = pass?.sub ?? '';
  return pass && pass.video?.room === room && host.startsWith('host-') ? host : null;
}

/** The answer when someone other than the host asks for a host-only action. */
const ONLY_HOST = () => reply(403, { error: 'Only the host can do that.' });

/** The host's "End the voice call": closes the call for everyone (Papa Dorin leaves with it). */
async function endCall(room: string, token: unknown): Promise<Response> {
  if (!(await hostFrom(room, token))) return ONLY_HOST();
  await rooms().deleteRoom(room);
  return reply(200, { ended: true });
}

/** The host's "Quiet, please": turns off every other person's microphone on the call (each can turn theirs back on). */
async function quietEveryone(room: string, token: unknown): Promise<Response> {
  const host = await hostFrom(room, token);
  if (!host) return ONLY_HOST();
  const service = rooms();
  const people = await service.listParticipants(room);
  const mics = people
    .filter((p) => p.identity !== host && p.kind !== AGENT_KIND)
    .flatMap((p) => p.tracks.filter((t) => t.source === TrackSource.MICROPHONE && !t.muted).map((t) => ({ identity: p.identity, sid: t.sid })));
  await Promise.all(mics.map((m) => service.mutePublishedTrack(room, m.identity, m.sid, true)));
  return reply(200, { muted: mics.length });
}

/** The name from a request: trimmed, single spaces; empty when missing. */
function nameFrom(value: unknown): string {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return reply(405, { error: 'POST only' });
  let body: { action?: unknown; room?: unknown; name?: unknown; token?: unknown };
  try {
    body = await req.json();
  } catch {
    return reply(400, { error: 'not JSON' });
  }
  const name = nameFrom(body.name);
  const badName = name.length < 1 || name.length > NAME_MAX ? reply(400, { error: `A name is 1 to ${NAME_MAX} letters.` }) : null;
  try {
    if (body.action === 'start') return badName ?? (await startCall(name, await friendCodeFrom(req)));
    const room = typeof body.room === 'string' ? body.room : '';
    if (!CALL_ROOM.test(room)) return reply(400, { error: 'That call link is not right.' });
    if (body.action === 'join') return badName ?? (await joinCall(room, name, await friendCodeFrom(req)));
    if (body.action === 'wake') return await wakePapaDorin(room);
    if (body.action === 'who') return await whoIsHere(room);
    if (body.action === 'quiet') return await quietEveryone(room, body.token);
    if (body.action === 'end') return await endCall(room, body.token);
    return reply(400, { error: 'unknown action' });
  } catch (e) {
    console.error(e);
    return reply(500, { error: 'The call server could not be reached.' });
  }
});
