// True while the page is on screen and the app is open; false when the page is hidden or the app goes to the
// background. Bakery TV uses it to stop its clock and its video.

import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

/** True while the page shows and the app is open. */
export function usePageShowing(): boolean {
  const [showing, setShowing] = useState(false);
  const focused = useRef(false);

  // Works out the answer again after either the page or the app changes.
  const update = useCallback(() => setShowing(focused.current && AppState.currentState === 'active'), []);

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

  return showing;
}
