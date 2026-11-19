// How many stops the orbit view shows as baked. A stop baked in the player is recorded at once, but the orbit view
// waits until it is showing again, so the person sees the cookie bounce from dough to baked.

import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

/** A short wait after coming back, so the bounce plays once the page has slid into view. */
const SETTLE_MS = 380;

/** The baked count to draw: `baked`, caught up a moment after the page shows again. Undefined until progress loads. */
export function useShownBaked(baked: number | undefined): number | undefined {
  const [shown, setShown] = useState(baked);
  // The first known count is shown at once, with no bounce.
  if (shown === undefined && baked !== undefined) setShown(baked);
  useFocusEffect(
    useCallback(() => {
      if (baked === undefined || shown === undefined || baked === shown) return;
      const timer = setTimeout(() => setShown(baked), baked > shown ? SETTLE_MS : 0);
      return () => clearTimeout(timer);
    }, [baked, shown]),
  );
  return shown;
}
