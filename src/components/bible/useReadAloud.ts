// Reads text aloud with the phone's voice (expo-speech), and stops when the page closes.

import * as Speech from 'expo-speech';
import { useCallback, useEffect, useState } from 'react';

/** Starts and stops reading aloud. `speaking` is true while the phone is reading. */
export function useReadAloud() {
  const [speaking, setSpeaking] = useState(false);

  /** Stops reading. */
  const stop = useCallback(() => {
    Speech.stop();
    setSpeaking(false);
  }, []);

  /** Reads the text aloud from the start, a little slower than normal, as in the design. */
  const speak = useCallback((text: string) => {
    Speech.stop();
    if (!text) return;
    setSpeaking(true);
    Speech.speak(text, { rate: 0.92, onDone: () => setSpeaking(false), onStopped: () => setSpeaking(false), onError: () => setSpeaking(false) });
  }, []);

  // Never keep talking after the page closes.
  useEffect(() => () => void Speech.stop(), []);

  return { speaking, speak, stop };
}
