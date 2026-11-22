// How loud the microphone is right now, for the joining screen's mic check, in the browser. It opens the
// microphone (the browser asks first), measures it with the browser's own sound tools, and redraws at most 20
// times a second, only when the number of lit bars changes and only while the tab is showing. Phones use
// useMicLevel.native.ts instead.

import { useEffect, useState } from 'react';

/** How often the bars can change (20 times a second). */
const REDRAW_MS = 50;

/** The mic check's state: how many of its bars are lit, and whether the microphone could not be opened. */
export type MicLevel = { lit: number; failed: boolean };

/** The microphone's level as lit bars, out of `bars`. */
export function useMicLevel(bars: number): MicLevel {
  const [lit, setLit] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let gone = false;
    let stream: MediaStream | null = null;
    let audio: AudioContext | null = null;
    let timer: ReturnType<typeof setInterval> | null = null;
    let shown = 0;
    let wake: (() => void) | null = null;
    /** Stops waiting for a tap to wake the sound tools. */
    const removeWake = () => {
      if (!wake) return;
      document.removeEventListener('pointerdown', wake);
      document.removeEventListener('keydown', wake);
      wake = null;
    };

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (gone) return stream.getTracks().forEach((t) => t.stop());
        audio = new AudioContext();
        // Safari keeps sound tools paused until a tap; the first tap or key on the page (like typing the name) wakes it.
        const sound = audio;
        if (sound.state !== 'running') {
          wake = () => {
            void sound.resume();
            removeWake();
          };
          document.addEventListener('pointerdown', wake);
          document.addEventListener('keydown', wake);
          void sound.resume().catch(() => {});
        }
        const meter = audio.createAnalyser();
        meter.fftSize = 512;
        audio.createMediaStreamSource(stream).connect(meter);
        const samples = new Float32Array(meter.fftSize);
        timer = setInterval(() => {
          if (document.hidden) return;
          meter.getFloatTimeDomainData(samples);
          let sum = 0;
          for (const v of samples) sum += v * v;
          const level = Math.sqrt(sum / samples.length);
          // Speech levels are small numbers; the square root spreads them across the bars.
          const next = Math.min(bars, Math.round(Math.sqrt(level) * bars * 1.7));
          if (next !== shown) {
            shown = next;
            setLit(next);
          }
        }, REDRAW_MS);
      } catch {
        if (!gone) setFailed(true);
      }
    })();

    return () => {
      gone = true;
      if (timer) clearInterval(timer);
      removeWake();
      stream?.getTracks().forEach((t) => t.stop());
      void audio?.close();
    };
  }, [bars]);

  return { lit, failed };
}
