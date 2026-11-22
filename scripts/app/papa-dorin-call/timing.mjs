// Prints where the time goes between letting go of Papa Dorin's picture and his first words, one short line per
// step: the end-of-turn wait, speech-to-text, Claude's first word, ElevenLabs' first sound, and when he starts
// talking. Only timings and counts are printed, never what anyone said.

import { voice } from '@livekit/agents';

/** Milliseconds as "1.23 s". */
const seconds = (ms) => `${(ms / 1000).toFixed(2)} s`;

/** Starts printing a session's timings; `letGo()` marks the moment someone lets go of his picture. */
export function watchTiming(session) {
  let since = 0;
  const after = () => (since ? ` (${seconds(Date.now() - since)} after letting go)` : '');
  session.on(voice.AgentSessionEventTypes.MetricsCollected, ({ metrics: m }) => {
    if (m.type === 'eou_metrics') console.log(`[timing] end of turn: wait ${seconds(m.endOfUtteranceDelayMs)}, transcript ${seconds(m.transcriptionDelayMs)}${after()}`);
    if (m.type === 'stt_metrics') console.log(`[timing] hearing: ${seconds(m.audioDurationMs)} of sound`);
    if (m.type === 'llm_metrics')
      console.log(`[timing] Claude: first word ${seconds(m.ttftMs)}, whole reply ${seconds(m.durationMs)}, ${m.completionTokens} tokens out, ${m.promptCachedTokens} of ${m.promptTokens} prompt tokens from cache${after()}`);
    if (m.type === 'tts_metrics') console.log(`[timing] voice: first sound ${seconds(m.ttfbMs)}, ${m.charactersCount} characters${after()}`);
  });
  session.on(voice.AgentSessionEventTypes.AgentStateChanged, ({ newState }) => {
    if (newState === 'thinking' || newState === 'speaking') console.log(`[timing] he is ${newState}${after()}`);
  });
  return {
    /** Someone let go of his picture: timings after this are counted from now. */
    letGo() {
      since = Date.now();
    },
  };
}
