// The second half of sending a box off, outside: the night sky and Papa Dorin's bakery planet, as on the home sky.
// The baker's box puffs out of the bakery's chimney the way the sky's boxes do, sails up into the sky turning as
// it goes, and lands as a new twinkling star. It plays once; then the star twinkles softly.

import { Canvas, Image as SkiaImage } from '@shopify/react-native-skia';
import { Image } from 'expo-image';
import { useEffect } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';
import { playSound } from '@/components/common/sounds';
import { BOX_WIDTH, CHIMNEY, PLANET_WIDTH } from '@/components/sky/bakeryLayout';
import { useSky } from '@/components/sky/SkyProvider';
import { StillSky } from '@/components/sky/StillSky';
import { SkyTwinkle } from './SkyTwinkle';

/** The box pictures are 132 by 110. */
const BOX_HEIGHT = (BOX_WIDTH * 110) / 132;

/** How long the box takes from the chimney to the sky, and how long the scene waits before it puffs out. */
const TRIP_MS = 2600;
const WAIT_MS = 500;

/** Props for the outside half. */
type SendOffOutsideProps = {
  /** The box picture in the constellation's color. */
  box: number;
  /** The constellation's color, for the star's glow. */
  color: string;
  /** True once the box has landed, so the star shows at once. */
  landed: boolean;
  /** Called once the box has become a star. */
  onLanded: () => void;
};

/** Where the box is at `t` (0 to 1): out of the chimney, then along a curve up to the star. */
function tripPose(t: number, fromX: number, fromY: number, toX: number, toY: number) {
  'worklet';
  if (t < 0.15) {
    const f = t / 0.15;
    return { x: fromX, y: fromY + 8 - 22 * f, scale: 0.3 + 0.55 * f, spin: 10 * f, opacity: f };
  }
  const f = (t - 0.15) / 0.85;
  const e = 1 - Math.pow(1 - f, 2);
  const sx = fromX;
  const sy = fromY - 14;
  const cx = sx + (toX - sx) * 0.15;
  const cy = toY + (sy - toY) * 0.25;
  const u = 1 - e;
  return {
    x: u * u * sx + 2 * u * e * cx + e * e * toX,
    y: u * u * sy + 2 * u * e * cy + e * e * toY,
    scale: 0.85 + 0.35 * Math.sin(e * Math.PI) - 0.75 * e * e,
    spin: 10 + 260 * e,
    opacity: f > 0.85 ? 1 - (f - 0.85) / 0.15 : 1,
  };
}

/** The sky, the bakery planet, the box and its star. */
export function SendOffOutside({ box, color, landed, onLanded }: SendOffOutsideProps) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const still = useReducedMotion();
  const { art } = useSky();
  const sprite = art.planet;
  const planetHeight = sprite.height + sprite.top * 2;
  const planetLeft = width / 2 - PLANET_WIDTH / 2;
  const planetTop = height * 0.5;
  const chimney = { x: planetLeft + PLANET_WIDTH * CHIMNEY.x, y: planetTop + planetHeight * CHIMNEY.y };
  const star = { x: width * 0.38, y: insets.top + 120 };
  const t = useSharedValue(landed ? 1 : 0);

  // The box puffs out and sails up, once.
  useEffect(() => {
    if (landed) return;
    const whoosh = setTimeout(() => playSound('splash'), WAIT_MS);
    t.set(
      withDelay(
        WAIT_MS,
        withTiming(1, { duration: still ? 0 : TRIP_MS, easing: Easing.linear }, (done) => {
          if (done) scheduleOnRN(onLanded);
        }),
      ),
    );
    return () => clearTimeout(whoosh);
    // Runs once, when the scene opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const boxStyle = useAnimatedStyle(() => {
    const p = tripPose(t.get(), chimney.x, chimney.y, star.x, star.y);
    return { opacity: p.opacity, transform: [{ translateX: p.x }, { translateY: p.y }, { rotate: `${p.spin}deg` }, { scale: p.scale }] };
  });

  return (
    <View style={styles.page}>
      <StillSky />
      <Animated.View pointerEvents="none" style={[styles.box, { left: -BOX_WIDTH / 2, top: -BOX_HEIGHT }, boxStyle]}>
        <Image source={box} style={{ width: BOX_WIDTH, height: BOX_HEIGHT }} contentFit="contain" />
      </Animated.View>
      <View pointerEvents="none" style={[styles.sprite, { left: planetLeft + sprite.left, top: planetTop + sprite.top, width: sprite.width, height: sprite.height }]}>
        <Canvas style={{ width: sprite.width, height: sprite.height }}>
          <SkiaImage image={sprite.image} x={0} y={0} width={sprite.width} height={sprite.height} fit="fill" />
        </Canvas>
      </View>
      {landed && <SkyTwinkle x={star.x} y={star.y} color={color} />}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  box: { position: 'absolute' },
  sprite: { position: 'absolute' },
});
