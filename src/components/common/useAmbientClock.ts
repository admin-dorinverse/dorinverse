// A shared timer for a page's small looping animations (glows, bobbing, flickers). Every animated piece on the
// page reads this one timer instead of running its own loop. It ticks 20 times a second, or 60 while the page
// says something moves fast, and stops when the page is hidden, the app is in the background, or motion is off.

import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useFrameCallback, useReducedMotion, useSharedValue, type SharedValue } from 'react-native-reanimated';

/** Time between ticks while only slow things move (20 a second). */
const CALM_TICK_MS = 1000 / 20;

/** Time between ticks while something moves fast (60 a second). */
const BUSY_TICK_MS = 1000 / 60;

/** A gap between frames this long means the timer was paused. */
const PAUSE_GAP_MS = 250;

/** Leeway so a screen refresh that comes a hair early still counts. */
const TICK_SLACK_MS = 4;

/** A page's timer: the milliseconds since the page first showed, and whether animation is off. */
export type AmbientClock = {
  /** Milliseconds since the page first showed. It holds still while the page is hidden. */
  time: SharedValue<number>;
  /** True when the phone asks for less motion. The timer then never ticks; pieces show their resting look. */
  still: boolean;
};

/**
 * Starts a page's shared timer. `isBusy` runs on the animation thread with the current time and returns true
 * while something on the page moves fast (a slide, a card coming in), so the timer ticks 60 times a second then.
 */
export function useAmbientClock(isBusy: (time: number) => boolean): AmbientClock {
  const time = useSharedValue(0);
  const startedAt = useSharedValue(-1);
  const lastFrameAt = useSharedValue(-1);
  const still = useReducedMotion();

  const frames = useFrameCallback((frame) => {
    'worklet';
    const now = frame.timestamp;
    // After a pause (a long gap between frames), pick up where the page left off instead of jumping ahead.
    if (startedAt.get() < 0) startedAt.set(now);
    else if (now - lastFrameAt.get() > PAUSE_GAP_MS) startedAt.set(startedAt.get() + (now - lastFrameAt.get() - CALM_TICK_MS));
    lastFrameAt.set(now);
    const t = now - startedAt.get();
    const gap = isBusy(t) ? BUSY_TICK_MS : CALM_TICK_MS;
    if (t - time.get() >= gap - TICK_SLACK_MS) time.set(t);
  }, false);

  // The timer runs only while the page shows and the app is open.
  const focused = useRef(false);
  const update = useCallback(() => {
    const on = focused.current && AppState.currentState === 'active' && !still;
    if (on === frames.isActive) return;
    frames.setActive(on);
  }, [frames, still]);

  useFocusEffect(
    useCallback(() => {
      focused.current = true;
      update();
      return () => {
        focused.current = false;
        update();
      };
    }, [update]),
  );
  useEffect(() => {
    const listener = AppState.addEventListener('change', update);
    return () => listener.remove();
  }, [update]);

  return { time, still };
}
