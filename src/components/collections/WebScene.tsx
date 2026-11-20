// The Character Connections card's scene: a glowing light blue web, like a constellation, whose three rings of dots
// and lines each turn their own way. Each ring is drawn once; the page's shared timer only turns them.

import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';
import type { AmbientClock } from '@/components/common/useAmbientClock';
import { skyWeb } from '@/theme/characterWebColors';

/** The drawing's size. */
const BOX = 170;
const MID = BOX / 2;

/** One ring: its radius, how many dots, which dots its lines join, how long one turn takes (negative turns back). */
type Ring = { radius: number; dots: number; skips: readonly number[]; turnSeconds: number; startAngle: number };

/** The three rings, inside to outside. */
const RINGS: readonly Ring[] = [
  { radius: 24, dots: 5, skips: [2], turnSeconds: 40, startAngle: -90 },
  { radius: 50, dots: 7, skips: [1, 3], turnSeconds: -60, startAngle: -60 },
  { radius: 76, dots: 9, skips: [1, 4], turnSeconds: 90, startAngle: -20 },
];

/** A ring's dot spots. */
function ringDots(ring: Ring): [number, number][] {
  return Array.from({ length: ring.dots }, (_, i) => {
    const a = ((ring.startAngle + (i * 360) / ring.dots) * Math.PI) / 180;
    return [MID + Math.cos(a) * ring.radius, MID + Math.sin(a) * ring.radius];
  });
}

/** One ring, drawn once, turning at its own speed and way. */
function TurningRing({ ring, clock }: { ring: Ring; clock: AmbientClock }) {
  const dots = ringDots(ring);
  const d = ring.skips
    .flatMap((skip) => dots.map(([x, y], i) => `M${x.toFixed(1)} ${y.toFixed(1)}L${dots[(i + skip) % dots.length][0].toFixed(1)} ${dots[(i + skip) % dots.length][1].toFixed(1)}`))
    .join('');
  const turn = useAnimatedStyle(() => (clock.still ? {} : { transform: [{ rotate: `${((clock.time.get() / 1000 / ring.turnSeconds) * 360) % 360}deg` }] }));
  return (
    <Animated.View style={[StyleSheet.absoluteFill, turn]}>
      <Svg width={BOX} height={BOX}>
        <Path d={d} stroke={skyWeb.glow} strokeWidth={6} strokeLinecap="round" fill="none" />
        <Path d={d} stroke={skyWeb.line} strokeOpacity={0.8} strokeWidth={1.4} strokeLinecap="round" fill="none" />
        {dots.map(([x, y], i) => (
          <Circle key={i} cx={x} cy={y} r={5} fill={skyWeb.glow} />
        ))}
        {dots.map(([x, y], i) => (
          <Circle key={`c${i}`} cx={x} cy={y} r={2} fill={skyWeb.core} />
        ))}
      </Svg>
    </Animated.View>
  );
}

/** The spinning web. */
export function WebScene({ clock }: { clock: AmbientClock }) {
  return (
    <View style={styles.stage}>
      <View style={styles.box}>
        {RINGS.map((ring) => (
          <TurningRing key={ring.radius} ring={ring} clock={clock} />
        ))}
        <View style={styles.hub} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { alignItems: 'center', paddingTop: 4, paddingBottom: 14 },
  box: { width: BOX, height: BOX },
  hub: {
    position: 'absolute',
    left: MID - 5,
    top: MID - 5,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: skyWeb.core,
    boxShadow: `0 0 8px ${skyWeb.line}, 0 0 16px ${skyWeb.line}`,
  },
});
