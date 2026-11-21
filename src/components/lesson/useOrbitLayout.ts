// The orbit view's layout for this screen: where the big star and each stop's cookie sit, and the cookie size. The
// orbit view draws from it and the rocket checks it, so both agree. Worked out again only when the screen changes.

import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import { sharpCookieSize } from '@/components/common/cookieArt';
import { orbitLayout, type OrbitLayout } from './orbitLayout';

/** The layout for `stopCount` stops on this screen. */
export function useOrbitLayout(stopCount: number): OrbitLayout {
  const { width, height } = useWindowDimensions();
  // The design's cookies are 84 to 96 points; never bigger than their pictures allow, so they stay sharp.
  return useMemo(() => orbitLayout(stopCount, width, height, sharpCookieSize(width < 420 ? 84 : 96)), [stopCount, width, height]);
}
