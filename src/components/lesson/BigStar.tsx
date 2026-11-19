// The big star the orbit view's cookies circle, as in the design: a soft halo, two sets of rays turning slowly in
// opposite directions, and a bright core that breathes. The rays are drawn once; the shared timer only turns them.

import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import type { AmbientClock } from '@/components/common/useAmbientClock';
import { SvgPicture } from '@/components/common/SvgPicture';
import { wave } from '@/components/common/motion';
import { mixColor } from '@/theme/mixColor';
import { lessonSky } from '@/theme/lessonColors';
import { raysSvg } from './orbitLayout';

/** The halo's, rays' and core's sizes, from the design. */
const HALO = 440;
const RAYS = 300;
const CORE = 92;

/** How long each set of rays takes to turn once, and how long the core takes to breathe in and out. */
const TURN_MS = 60000;
const TURN_BACK_MS = 90000;
const BREATH_MS = 4000;

/** Props for the big star. */
type BigStarProps = {
  /** Its center. */
  x: number;
  y: number;
  /** The constellation's color. */
  color: string;
  /** The page's shared timer. */
  clock: AmbientClock;
};

/** The big star. */
export function BigStar({ x, y, color, clock }: BigStarProps) {
  const art = useMemo(() => ({ rays: raysSvg(color, 12, 150), rays2: raysSvg(lessonSky.white, 8, 120) }), [color]);
  const turn = useAnimatedStyle(() => ({ transform: [{ rotate: `${((clock.time.get() % TURN_MS) / TURN_MS) * 360}deg` }] }));
  const turnBack = useAnimatedStyle(() => ({ transform: [{ rotate: `${-((clock.time.get() % TURN_BACK_MS) / TURN_BACK_MS) * 360}deg` }] }));
  const breathe = useAnimatedStyle(() => ({ transform: [{ scale: 1 + 0.08 * wave(clock.time.get(), BREATH_MS) }] }));
  return (
    <View pointerEvents="none" style={[styles.at, { left: x, top: y }]}>
      <View
        style={[
          styles.halo,
          { backgroundImage: `radial-gradient(circle, ${mixColor(color, 0.55)} 0%, ${mixColor(color, 0.22)} 30%, rgba(0,0,0,0) 70%)` },
        ]}
      />
      <Animated.View style={[styles.rays, turn]}>
        <SvgPicture svg={art.rays} width={RAYS} height={RAYS} />
      </Animated.View>
      <Animated.View style={[styles.rays, styles.rays2, turnBack]}>
        <SvgPicture svg={art.rays2} width={RAYS} height={RAYS} />
      </Animated.View>
      <Animated.View
        style={[styles.core, { backgroundImage: `radial-gradient(circle, #ffffff 0%, #ffffff 22%, ${color} 48%, rgba(0,0,0,0) 72%)` }, breathe]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  at: { position: 'absolute', width: 0, height: 0 },
  halo: { position: 'absolute', left: -HALO / 2, top: -HALO / 2, width: HALO, height: HALO, borderRadius: HALO / 2 },
  rays: { position: 'absolute', left: -RAYS / 2, top: -RAYS / 2, width: RAYS, height: RAYS, opacity: 0.85 },
  rays2: { opacity: 0.5 },
  core: { position: 'absolute', left: -CORE / 2, top: -CORE / 2, width: CORE, height: CORE, borderRadius: CORE / 2 },
});
