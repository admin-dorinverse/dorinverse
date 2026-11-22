// Papa Dorin on the get-together call (test version). A LiveKit agent that joins a call only when someone first holds
// his picture, listens to one person at a time while they hold it, and answers out loud to everyone. The host can
// also have him read a lesson card's explanation aloud, and host trivia on a lesson's questions (trivia.mjs).
//
// Run on the owner's PC:  node scripts/app/papa-dorin-call/agent.mjs dev
// It reads its keys from scripts/app/papa-dorin-call/.env.local (never committed): LIVEKIT_URL, LIVEKIT_API_KEY,
// LIVEKIT_API_SECRET, ANTHROPIC_API_KEY and ELEVEN_API_KEY. His notes are papa-dorin.md exactly as written. The
// lessons are read with the app's public database values only (publicDatabase.mjs).
// Hookup: the same file is deployed to LiveKit Cloud, with the keys in LiveKit's secrets instead of the file.

import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import Anthropic from '@anthropic-ai/sdk';
import { cli, defineAgent, inference, ServerOptions, voice } from '@livekit/agents';
import * as anthropic from '@livekit/agents-plugin-anthropic';
import * as elevenlabs from '@livekit/agents-plugin-elevenlabs';
import { loadExplanation } from './lessonText.mjs';
import { watchTiming } from './timing.mjs';
import { createTrivia, TRIVIA_ATTRIBUTE } from './trivia.mjs';

/** The keys file next to this one, loaded before anything reads the keys. */
const KEYS_FILE = fileURLToPath(new URL('.env.local', import.meta.url));
if (existsSync(KEYS_FILE)) process.loadEnvFile(KEYS_FILE);

/** The name the app's join pass asks for, so he joins only the calls that call him. */
export const AGENT_NAME = 'papa-dorin';

/** His notes: the whole of his instructions, unchanged. */
const NOTES = readFileSync(new URL('../../dough-maker/lesson-docs/papa-dorin.md', import.meta.url), 'utf8');

/**
 * The Claude model he thinks with on calls, and how hard: Sonnet 5.5 at medium effort (the owner's pick, 2026-11-21).
 * Opus 5.5 at low lost his humor; at medium it was too slow (about 18 s before his first words).
 */
const MODEL = 'claude-sonnet-5-5';
const EFFORT = 'medium';

/**
 * His ElevenLabs voice (the owner's, trying this one since 2026-11-22; the previous one, pLDqNoheKYSx3bhs57So, is in
 * TODO.md) and its model: Eleven v4 Turbo, which streams live. If
 * the owner prefers plain 'eleven_v4', it can't stream live: wrap the TTS in LiveKit's tts.StreamAdapter so he
 * speaks one sentence at a time.
 */
const VOICE_ID = 'DcREernlIYXuL5D8TdbT';
const VOICE_MODEL = 'eleven_v4_turbo';

/** Speech-to-text from LiveKit Inference: it runs only while someone holds his picture. */
const HEARING = 'deepgram/nova-3';

/** He leaves the call after this long with nobody asking him anything, so a quiet Papa Dorin isn't billed. */
const IDLE_LEAVE_MS = 5 * 60_000;

/** The start of the host's call identity (the app's HOST_PREFIX); the server gives it out, so it can't be faked. */
const HOST_PREFIX = 'host-';

/** The starts of the people's identities on a call (host and guests); agents have neither. */
const PERSON_PREFIXES = [HOST_PREFIX, 'guest-'];

/** His notes (the system blocks) marked for Claude's prompt cache, unchanged otherwise. */
function cachedNotes(system) {
  if (!Array.isArray(system) || !system.length) return system;
  return system.map((block, i) => (i === system.length - 1 ? { ...block, cache_control: { type: 'ephemeral' } } : block));
}

/**
 * A Claude connection that asks for EFFORT on every request, and uses Claude's prompt cache: his notes (the same on
 * every request, on every call) and the conversation so far are read from the cache instead of afresh. LiveKit's
 * Claude add-on has neither setting.
 */
function claudeAtEffort() {
  const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, maxRetries: 0 });
  const create = claude.messages.create.bind(claude.messages);
  claude.messages.create = (body, options) =>
    create({ ...body, system: cachedNotes(body.system), cache_control: { type: 'ephemeral' }, output_config: { ...(body.output_config ?? {}), effort: EFFORT } }, options).catch((e) => {
      // The voice framework doesn't print Claude's errors, so they're printed here.
      console.error(`Claude request failed: ${e?.status ?? ''} ${e?.message ?? e}`);
      throw e;
    });
  return claude;
}

/** Reads an RPC's JSON payload; an unreadable one is an empty object. */
function payloadOf(data) {
  try {
    return JSON.parse(data.payload || '{}') ?? {};
  } catch {
    return {};
  }
}

export default defineAgent({
  entry: async (ctx) => {
    const session = new voice.AgentSession({
      stt: new inference.STT({ model: HEARING, language: 'en' }),
      // The keys are handed over directly: the add-ons read their keys when they load, before the keys file is read.
      llm: new anthropic.LLM({ model: MODEL, client: claudeAtEffort() }),
      tts: new elevenlabs.TTS({ voiceId: VOICE_ID, model: VOICE_MODEL, apiKey: process.env.ELEVEN_API_KEY }),
      // Push-to-talk: a turn starts when someone holds his picture and ends when they let go.
      turnHandling: { turnDetection: 'manual' },
    });
    const timing = watchTiming(session);
    await session.start({ agent: new voice.Agent({ instructions: NOTES }), room: ctx.room });
    await ctx.connect();
    // His ears stay off until someone holds his picture.
    session.input.setAudioEnabled(false);

    /** Who is holding his picture now; one person at a time. */
    let holder = null;
    /** Who he's answering now (the last person who asked), so they (or the host) can stop him. */
    let answeringFor = null;
    /** What he's doing (LiveKit's agent state): while 'thinking' or 'speaking', nobody else can ask. */
    let state = 'idle';
    session.on('agent_state_changed', (ev) => {
      state = ev.newState;
      // Once he's done answering, nobody is "being answered" any more, so asking opens for everyone again.
      if ((state === 'listening' || state === 'idle') && !holder && answeringFor) {
        answeringFor = null;
        void showAsker(null, false);
      }
    });
    /** The timer that sends him home when nobody has asked anything for a while. */
    let idle = setTimeout(() => ctx.shutdown('nobody asked for a while'), IDLE_LEAVE_MS);
    /** Restarts the timer that sends him home. */
    const stillWanted = () => {
      clearTimeout(idle);
      idle = setTimeout(() => ctx.shutdown('nobody asked for a while'), IDLE_LEAVE_MS);
    };
    ctx.addShutdownCallback(async () => clearTimeout(idle));

    const me = ctx.room.localParticipant;
    /** Tells every phone who is asking him (so they can show "Listening to Jordan") and whether they still hold. */
    const showAsker = (identity, holding) => me.setAttributes({ asker: identity ?? '', holding: holding ? 'yes' : 'no' });

    /**
     * Stops him mid-sentence, if he's saying anything; resolves once the stop has gone through, so words said right
     * after it aren't cut off by it.
     */
    const stopSpeaking = async () => {
      try {
        await session.interrupt({ force: true }).await;
      } catch {
        // Nothing was playing; carry on.
      }
    };

    /** Stops listening without answering. */
    const stopListening = () => {
      session.input.setAudioEnabled(false);
      session.clearUserTurn();
      holder = null;
      void showAsker(null, false);
    };

    /** Everyone on the call except agents, as trivia counts them. */
    const people = () =>
      [...ctx.room.remoteParticipants.values()]
        .filter((p) => PERSON_PREFIXES.some((start) => p.identity.startsWith(start)))
        .map((p) => ({ identity: p.identity, name: p.name || 'Guest' }));

    // With nobody else on the call he leaves at once. Otherwise he'd sit in empty calls (and LiveKit sends him back
    // into them when his program restarts), each one holding a speech-to-text line and a voice line open, until
    // the services refuse new ones and his voice goes silent.
    const leaveIfAlone = () => {
      if (people().length === 0) ctx.shutdown('everyone left');
    };
    leaveIfAlone();
    ctx.room.on('participantDisconnected', leaveIfAlone);

    const trivia = createTrivia({
      publish: (state) => me.setAttributes({ [TRIVIA_ATTRIBUTE]: state ? JSON.stringify(state) : '' }),
      // The questions are read, not answered, so they stay out of his conversation.
      speak: (text) => session.say(text, { addToChatCtx: false }),
      reply: (text) => session.generateReply({ userInput: text }),
      stopSpeaking,
      people,
    });

    /** Registers an RPC only the host may call; anyone else gets 'host only'. */
    const hostOnly = (method, handler) =>
      me.registerRpcMethod(method, async (data) => {
        if (!data.callerIdentity.startsWith(HOST_PREFIX)) return 'host only';
        stillWanted();
        return handler(payloadOf(data), data);
      });

    // Someone holds his picture: he stops talking, forgets any half-heard question, and listens to that one person.
    // While a trivia question is being read or answered he doesn't take questions.
    // One asker at a time (the owner's rule): nobody else can ask while someone holds him or while he's answering.
    me.registerRpcMethod('start_turn', async (data) => {
      if (holder && holder !== data.callerIdentity) return 'busy';
      if (state === 'thinking' || state === 'speaking') return 'answering';
      if (trivia.busy) return 'trivia';
      stillWanted();
      await stopSpeaking();
      session.clearUserTurn();
      // The Node framework keeps room listening on an internal field; switching it is what links him to the holder.
      session._roomIO?.setParticipant(data.callerIdentity);
      session.input.setAudioEnabled(true);
      holder = data.callerIdentity;
      answeringFor = holder;
      await showAsker(holder, true);
      return 'ok';
    });
    // Stop: the person he's answering, or the host, can stop him mid-answer (the owner's rule).
    me.registerRpcMethod('stop_answer', async (data) => {
      const caller = data.callerIdentity;
      if (caller !== answeringFor && !caller.startsWith(HOST_PREFIX)) return 'not yours';
      await stopSpeaking();
      answeringFor = null;
      await showAsker(null, false);
      return 'ok';
    });
    // They let go: his ears turn off and he answers what he heard.
    me.registerRpcMethod('end_turn', async (data) => {
      if (holder !== data.callerIdentity) return 'not yours';
      timing.letGo();
      session.input.setAudioEnabled(false);
      session.commitUserTurn();
      // The asker's name stays up while he answers them.
      await showAsker(holder, false);
      holder = null;
      stillWanted();
      return 'ok';
    });
    // They slid off his picture or left: nothing is answered.
    me.registerRpcMethod('cancel_turn', async (data) => {
      if (holder !== data.callerIdentity) return 'not yours';
      stopListening();
      return 'ok';
    });
    // If the holder leaves the call mid-question, he stops listening.
    ctx.room.on('participantDisconnected', (p) => {
      if (p.identity === holder) stopListening();
    });

    // The host has him read a lesson choice card's written explanation aloud, word for word.
    hostOnly('read_explanation', async ({ passageId, stop, card }) => {
      const words = await loadExplanation(passageId, stop, card);
      if (!words) return 'no explanation';
      await stopSpeaking();
      session.say(words);
      return 'ok';
    });

    // Trivia: the host starts, moves on, asks for an explanation and ends it; anyone picks.
    hostOnly('trivia_start', ({ passageId }) => trivia.start(passageId));
    hostOnly('trivia_next', () => trivia.next());
    hostOnly('trivia_explain', (_payload, data) => trivia.explain(data.payload));
    hostOnly('trivia_end', () => trivia.end());
    hostOnly('trivia_close', () => trivia.closeNow());
    me.registerRpcMethod('trivia_pick', async (data) => {
      const person = ctx.room.remoteParticipants.get(data.callerIdentity);
      return trivia.pick(data.callerIdentity, person?.name || 'Guest', Number(payloadOf(data).position));
    });
  },
});

cli.runApp(new ServerOptions({ agent: fileURLToPath(import.meta.url), agentName: AGENT_NAME }));
