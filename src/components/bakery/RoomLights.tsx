// The bakery room's soft background, as in the design: four big blurry colored lights drifting slowly, and tiny white
// motes floating up like flour in the light. Each is drawn once; the page's shared timer only moves and fades them.

import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import type { AmbientClock } from '@/components/common/useAmbientClock';
import { bakeryRoom } from '@/theme/bakeryColors';

/** Each light's spot (as shares of the room) and its head start (ms), as in the design. */
const LIGHTS: readonly { left: string; top: string; delay: number }[] = [
  { left: '-18%', top: '-14%', delay: 0 },
  { left: '58%', top: '-6%', delay: -4000 },
  { left: '-10%', top: '62%', delay: -8000 },
  { left: '54%', top: '66%', delay: -12000 },
];

/** Each mote's spot and head start (ms). */
const MOTES: readonly { left: string; top: string; delay: number }[] = [
  { left: '12%', top: '70%', delay: 0 },
  { left: '46%', top: '85%', delay: 1200 },
  { left: '80%', top: '60%', delay: 2400 },
  { left: '30%', top: '48%', delay: 3600 },
  { left: '66%', top: '40%', delay: 4800 },
  { left: '90%', top: '88%', delay: 6000 },
];

/** How long a light takes to drift there and back, and a mote to rise (ms). */
const DRIFT_MS = 32000;
const MOTE_MS = 7000;

/** One drifting light. */
function Light({ index, clock }: { index: number; clock: AmbientClock }) {
  const spot = LIGHTS[index];
  const drift = useAnimatedStyle(() => {
    if (clock.still) return {};
    const p = ((((clock.time.get() - spot.delay) % DRIFT_MS) + DRIFT_MS) % DRIFT_MS) / DRIFT_MS;
    const w = 0.5 - 0.5 * Math.cos(p * Math.PI * 2);
    return { transform: [{ translateX: 24 * w - 10 }, { translateY: -18 * w + 8 }, { scale: 0.95 + 0.17 * w }] };
  });
  const c = bakeryRoom.lights[index];
  return <Animated.View style={[styles.light, { left: spot.left as `${number}%`, top: spot.top as `${number}%`, backgroundImage: `radial-gradient(circle, ${c} 0%, rgba(255,255,255,0) 68%)` }, drift]} />;
}

/** One rising mote. */
function Mote({ index, clock }: { index: number; clock: AmbientClock }) {
  const spot = MOTES[index];
  const rise = useAnimatedStyle(() => {
    if (clock.still) return { opacity: 0 };
    const p = ((((clock.time.get() - spot.delay) % MOTE_MS) + MOTE_MS) % MOTE_MS) / MOTE_MS;
    return { opacity: p < 0.25 ? (p / 0.25) * 0.9 : 0.9 * (1 - (p - 0.25) / 0.75), transform: [{ translateY: -70 * p }] };
  });
  return <Animated.View style={[styles.mote, { left: spot.left as `${number}%`, top: spot.top as `${number}%` }, rise]} />;
}

/** The room's background lights and motes. */
export function RoomLights({ clock }: { clock: AmbientClock }) {
  return (
    <View pointerEvents="none" style={styles.room}>
      {LIGHTS.map((_, i) => (
        <Light key={i} index={i} clock={clock} />
      ))}
      {MOTES.map((_, i) => (
        <Mote key={i} index={i} clock={clock} />
      ))}
      <View style={styles.shade} />
    </View>
  );
}

const styles = StyleSheet.create({
  room: { ...StyleSheet.absoluteFill, overflow: 'hidden', backgroundColor: bakeryRoom.floor },
  light: { position: 'absolute', width: 340, height: 340, borderRadius: 170, opacity: 0.75 },
  mote: { position: 'absolute', width: 6, height: 6, borderRadius: 3, backgroundColor: bakeryRoom.mote, boxShadow: `0 0 8px ${bakeryRoom.mote}, 0 0 14px ${bakeryRoom.moteGlow}` },
  // A soft shadow under the belt, as in the design.
  shade: { position: 'absolute', left: 0, right: 0, top: 0, height: 26, backgroundImage: 'linear-gradient(180deg, rgba(90,58,34,0.28), rgba(90,58,34,0))' },
});
