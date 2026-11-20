// The time now, updated once a second while the page shows and the app is open. It stops when the page is hidden
// or the app goes to the background, and jumps to the right time when either comes back.

import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

/** Time between updates (once a second). */
const TICK_MS = 1000;

/** The time now in milliseconds since 1970, updated once a second while the page shows. */
export function useSecondTick(): number {
  const [now, setNow] = useState(() => Date.now());
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const focused = useRef(false);

  // Starts the timer when the page shows and the app is open, and stops it otherwise.
  const update = useCallback(() => {
    const on = focused.current && AppState.currentState === 'active';
    if (on && !timer.current) {
      setNow(Date.now());
      timer.current = setInterval(() => setNow(Date.now()), TICK_MS);
    } else if (!on && timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
  }, []);

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

  return now;
}
