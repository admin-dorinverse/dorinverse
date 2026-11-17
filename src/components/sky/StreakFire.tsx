// The rainbow flame in the streak pill. Each flame part flickers on its own rhythm and the glow around it
// slowly shifts color, as in the Constellations design.

import { Canvas, Group, LinearGradient, Paint, Path, Shadow, useClock, vec } from '@shopify/react-native-skia';
import { interpolateColor, useDerivedValue } from 'react-native-reanimated';
import { FIRE } from './hudArt';

/** Props for the streak flame. */
type StreakFireProps = {
  /** Width of the flame. Its height is 1.2 times this. */
  size?: number;
  /** True when the phone asks for less motion. The flame then holds still. */
  still?: boolean;
};

/** The flicker shape: [scaleX, scaleY, skew in degrees] at the start, middle and end of each flicker. */
const FLICKER = [[1, 1, 0], [0.94, 1.06, 2], [1.03, 0.96, -2]] as const;

/** Where a flame is in its flicker, given the time, the flicker length and whether it runs backwards. */
function flickerPose(ms: number, seconds: number, reverse: boolean) {
  'worklet';
  const cycle = (ms / 1000 / seconds) % 2;
  let t = cycle < 1 ? cycle : 2 - cycle;
  if (reverse) t = 1 - t;
  const a = t < 0.5 ? FLICKER[0] : FLICKER[1];
  const b = t < 0.5 ? FLICKER[1] : FLICKER[2];
  const f = t < 0.5 ? t * 2 : (t - 0.5) * 2;
  const e = f * f * (3 - 2 * f);
  return [a[0] + (b[0] - a[0]) * e, a[1] + (b[1] - a[1]) * e, a[2] + (b[2] - a[2]) * e];
}

/** Turns a flicker pose into a transform around the flame's base point. */
function flickerTransform(ms: number, seconds: number, reverse: boolean, originY: number, still: boolean) {
  'worklet';
  const [sx, sy, skew] = still ? [1, 1, 0] : flickerPose(ms, seconds, reverse);
  return [
    { translateX: 20 },
    { translateY: originY },
    { scaleX: sx },
    { scaleY: sy },
    { skewX: (skew * Math.PI) / 180 },
    { translateX: -20 },
    { translateY: -originY },
  ];
}

/** The glow's three color pairs it cycles through every 4 seconds. */
const GLOWS = [
  ['rgba(255,120,200,0.75)', 'rgba(120,200,255,0.55)'],
  ['rgba(255,200,90,0.8)', 'rgba(120,255,170,0.5)'],
  ['rgba(150,120,255,0.8)', 'rgba(255,110,140,0.55)'],
] as const;

/** Blends smoothly between one glow color and the next. `step` runs 0 to 3; `which` picks the inner or outer glow. */
function blendGlow(step: number, which: 0 | 1): string {
  'worklet';
  const i = Math.floor(step) % 3;
  return interpolateColor(step - Math.floor(step), [0, 1], [GLOWS[i][which], GLOWS[(i + 1) % 3][which]]) as string;
}

/** A rainbow streak flame. */
export function StreakFire({ size = 22, still = false }: StreakFireProps) {
  const clock = useClock();
  const scale = size / 40;
  const mainT = useDerivedValue(() => flickerTransform(clock.value, 1.1, false, 45.6, still));
  const sideT = useDerivedValue(() => flickerTransform(clock.value, 0.9, true, 43.2, still));
  const innerT = useDerivedValue(() => flickerTransform(clock.value, 0.8, true, 45.6, still));
  const glowStep = useDerivedValue(() => (still ? 0 : ((clock.value / 4000) % 1) * 3));
  const glowA = useDerivedValue(() => blendGlow(glowStep.value, 0));
  const glowB = useDerivedValue(() => blendGlow(glowStep.value, 1));
  const bottom = vec(0, 48);
  const top = vec(0, 0);

  return (
    <Canvas style={{ width: size + 8, height: size * 1.2 + 8 }}>
      <Group
        transform={[{ translateX: 4 }, { translateY: 4 }, { scale }]}
        layer={
          <Paint>
            <Shadow dx={0} dy={0} blur={4.5 / scale} color={glowB} />
            <Shadow dx={0} dy={0} blur={2 / scale} color={glowA} />
          </Paint>
        }
      >
        <Group transform={sideT} opacity={0.85}>
          <Path path={FIRE.left}>
            <LinearGradient start={bottom} end={top} colors={[...FIRE.rainbow.colors]} positions={[...FIRE.rainbow.positions]} />
          </Path>
          <Path path={FIRE.right}>
            <LinearGradient start={bottom} end={top} colors={[...FIRE.rainbow.colors]} positions={[...FIRE.rainbow.positions]} />
          </Path>
        </Group>
        <Group transform={mainT}>
          <Path path={FIRE.main}>
            <LinearGradient start={bottom} end={top} colors={[...FIRE.rainbow.colors]} positions={[...FIRE.rainbow.positions]} />
          </Path>
        </Group>
        <Group transform={innerT}>
          <Path path={FIRE.inner}>
            <LinearGradient start={bottom} end={top} colors={[...FIRE.inside.colors]} positions={[...FIRE.inside.positions]} />
          </Path>
        </Group>
        <Path path="M16.4 40 a3.6 4.4 0 1 0 7.2 0 a3.6 4.4 0 1 0 -7.2 0 Z" color="#fff8d0" opacity={0.95} />
      </Group>
    </Canvas>
  );
}
