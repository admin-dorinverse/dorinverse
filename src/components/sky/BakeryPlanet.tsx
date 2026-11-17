// Papa Dorin's bakery planet: a warm halo, the planet floating and gently rocking, and cookie boxes puffing out
// of its chimney. The planet is drawn once; the phone's compositor then just slides, floats and rocks that
// picture, which costs almost nothing. It moves every frame even while the star sky behind it draws less often.

import { Canvas, Image as SkiaImage, RadialGradient, Rect, vec } from '@shopify/react-native-skia';
import { PixelRatio, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { HALO, PLANET_TOP, PLANET_WIDTH, ROCK_ORIGIN, planetFloat, planetRock } from './bakeryLayout';
import { ChimneyBoxes } from './ChimneyBoxes';
import { useSky } from './SkyProvider';

/** The halo's colors: warm gold fading to nothing at 62% of its radius. */
const HALO_COLORS = ['rgba(255,200,120,0.16)', 'rgba(255,200,120,0)'];

/** The bakery planet with its halo and chimney boxes. Place it over the sky canvas. */
export function BakeryPlanet() {
  const { sky, pulse, art } = useSky();
  const { width: screenW, height: screenH } = useWindowDimensions();
  const sprite = art.planet;
  const planetHeight = sprite.height + sprite.top * 2;
  const pixelRatio = PixelRatio.get();
  // The sky's center on screen, where the planet's layout is measured from.
  const cx = screenW / 2;
  const cy = screenH / 2;

  // Follows the camera: a screen-sized box that slides opposite to the camera.
  const place = useAnimatedStyle(() => {
    pulse.get();
    const s = sky.get();
    return {
      opacity: s.worldShown,
      transform: [{ translateX: -s.camera.x }, { translateY: -s.camera.y }],
    };
  });
  // The float, snapped to whole screen pixels so the planet's edges stay equally crisp while it moves.
  const float = useAnimatedStyle(() => {
    const now = pulse.get();
    const lift = planetFloat(now / 1000, sky.get().reduceMotion);
    return { transform: [{ translateY: Math.round(lift * pixelRatio) / pixelRatio }] };
  });
  const rock = useAnimatedStyle(() => {
    const now = pulse.get();
    return { transform: [{ rotate: `${planetRock(now / 1000, sky.get().reduceMotion)}deg` }] };
  });

  const haloSize = HALO.radius * 2;
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, place]}>
      <View style={[styles.halo, { left: cx - PLANET_WIDTH / 2 + PLANET_WIDTH * HALO.x - HALO.radius, top: cy + PLANET_TOP + planetHeight * HALO.y - HALO.radius, width: haloSize, height: haloSize }]}>
        <Canvas style={{ width: haloSize, height: haloSize }}>
          <Rect x={0} y={0} width={haloSize} height={haloSize}>
            <RadialGradient c={vec(HALO.radius, HALO.radius)} r={HALO.radius} colors={HALO_COLORS} positions={[0, 0.62]} />
          </Rect>
        </Canvas>
      </View>
      <Animated.View style={[styles.planetBox, { left: cx - PLANET_WIDTH / 2, top: cy + PLANET_TOP, width: PLANET_WIDTH, height: planetHeight }, float]}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.rocker, rock]}>
          <ChimneyBoxes planetHeight={planetHeight} />
          <View style={[styles.sprite, { left: sprite.left, top: sprite.top, width: sprite.width, height: sprite.height }]}>
            <Canvas style={{ width: sprite.width, height: sprite.height }}>
              <SkiaImage image={sprite.image} x={0} y={0} width={sprite.width} height={sprite.height} fit="fill" />
            </Canvas>
          </View>
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  halo: { position: 'absolute' },
  planetBox: { position: 'absolute' },
  rocker: { transformOrigin: ROCK_ORIGIN },
  sprite: { position: 'absolute' },
});
