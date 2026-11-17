// The rainbow flame in the streak pill. Each flame part flickers on its own rhythm and the glow around it
// slowly shifts color, as in the Constellations design. The parts are plain vector pictures moved on the
// animation thread, so nothing is redrawn each frame and the flame always shows, even after a reload.

import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { SvgXml } from 'react-native-svg';
import { FIRE_GLOWS, fireGlow, fireParts, fireViewBox } from './streakFireArt';
import { useSky } from './SkyProvider';

/** Props for the streak flame. */
type StreakFireProps = {
  /** Width of the flame. Its height is 1.2 times this. */
  size?: number;
  /** True when the phone asks for less motion. The flame then holds still. */
  still?: boolean;
};

/** Room around the flame for its glow, in points. */
const PAD = 4;

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

/** Props for one flickering flame part. */
type FlamePartProps = {
  /** The part's SVG picture. */
  svg: string;
  /** The sky clock that drives the flicker. */
  clock: SharedValue<number>;
  /** Seconds per flicker. */
  seconds: number;
  /** True to flicker backwards, out of step with the main flame. */
  reverse: boolean;
  /** The point the part flickers around, in points from the picture's top-left. */
  origin: [number, number];
  /** True to hold still. */
  still: boolean;
  /** Picture width and height. */
  width: number;
  height: number;
};

/** One flame part that stretches and leans around its base point, like the design's flicker. */
function FlamePart({ svg, clock, seconds, reverse, origin, still, width, height }: FlamePartProps) {
  const style = useAnimatedStyle(() => {
    const [sx, sy, skew] = still ? [1, 1, 0] : flickerPose(clock.value, seconds, reverse);
    return { transform: [{ scaleX: sx }, { scaleY: sy }, { skewX: `${skew}deg` }] };
  });
  return (
    <Animated.View style={[StyleSheet.absoluteFill, { transformOrigin: [origin[0], origin[1], 0] }, style]}>
      <SvgXml xml={svg} width={width} height={height} />
    </Animated.View>
  );
}

/** Props for one of the glow's color layers. */
type GlowLayerProps = {
  /** The glow's SVG picture in one color pair. */
  svg: string;
  /** Which of the three color pairs this is. */
  index: number;
  /** The sky clock that drives the color change. */
  clock: SharedValue<number>;
  /** True to hold the first colors. */
  still: boolean;
  /** Picture width and height. */
  width: number;
  height: number;
};

/** One color of the glow. The three fade into each other in turn, one full round every 4 seconds. */
function GlowLayer({ svg, index, clock, still, width, height }: GlowLayerProps) {
  const style = useAnimatedStyle(() => {
    const step = still ? 0 : ((clock.value / 4000) % 1) * 3;
    const current = Math.floor(step) % 3;
    const f = step - Math.floor(step);
    // Curved fades keep the glow equally bright halfway through a change.
    const opacity = index === current ? 1 - f * f : index === (current + 1) % 3 ? 1 - (1 - f) * (1 - f) : 0;
    return { opacity };
  });
  return (
    <Animated.View style={[StyleSheet.absoluteFill, style]}>
      <SvgXml xml={svg} width={width} height={height} />
    </Animated.View>
  );
}

/** A rainbow streak flame. It moves with the sky's pulse, up to 60 times a second, without redrawing anything. */
export function StreakFire({ size = 22, still = false }: StreakFireProps) {
  const { pulse: clock } = useSky();
  const scale = size / 40;
  const width = size + PAD * 2;
  const height = size * 1.2 + PAD * 2;
  const art = useMemo(() => {
    const viewBox = fireViewBox(scale, PAD);
    return { parts: fireParts(viewBox), glows: FIRE_GLOWS.map((pair) => fireGlow(viewBox, scale, pair)) };
  }, [scale]);
  /** Turns a spot in flame units into points on the picture. */
  const at = (x: number, y: number): [number, number] => [PAD + x * scale, PAD + y * scale];
  const shared = { clock, still, width, height };

  return (
    <View style={{ width, height }}>
      {art.glows.map((svg, i) => (
        <GlowLayer key={i} svg={svg} index={i} {...shared} />
      ))}
      <FlamePart svg={art.parts.sides} seconds={0.9} reverse origin={at(20, 43.2)} {...shared} />
      <FlamePart svg={art.parts.main} seconds={1.1} reverse={false} origin={at(20, 45.6)} {...shared} />
      <FlamePart svg={art.parts.inner} seconds={0.8} reverse origin={at(20, 45.6)} {...shared} />
      <View style={StyleSheet.absoluteFill}>
        <SvgXml xml={art.parts.base} width={width} height={height} />
      </View>
    </View>
  );
}
