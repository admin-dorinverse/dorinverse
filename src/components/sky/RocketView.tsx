// The rocket that follows the view. Its body and flame are vector pictures drawn once; the phone's compositor
// moves and turns the rocket and flickers the flame every frame, without redrawing anything.

import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { SvgXml } from 'react-native-svg';
import { BODY_SVG, FLAME_ORIGIN, FLAME_SVG, ROCKET_BOX } from './rocketSvg';
import { useSky } from './SkyProvider';

/** The rocket. Place it over the sky canvas and the planet. */
export function RocketView() {
  const { sky, pulse } = useSky();

  // Follows the sky's rocket spot, bobbing while it rests and turning toward where it is going.
  const place = useAnimatedStyle(() => {
    pulse.get();
    const s = sky.get();
    const rk = s.rocket;
    return {
      opacity: s.worldShown,
      transform: [
        { translateX: rk.x - s.camera.x + s.width / 2 },
        { translateY: rk.y + rk.bob - s.camera.y + s.height / 2 },
        { rotate: `${rk.rotation}deg` },
      ],
    };
  });
  // The flame flickers fast and grows longer as the rocket speeds up. It never shrinks below full size.
  const flame = useAnimatedStyle(() => {
    const now = pulse.get();
    const s = sky.get();
    const flicker = s.reduceMotion ? 0 : (Math.sin((now / 90) * Math.PI) + 1) / 2;
    const grow = Math.min(1.9, 1 + s.rocket.speed / 900);
    const widen = Math.min(1.2, 1 + s.rocket.speed / 2500);
    return { transform: [{ scaleX: widen * (1 - 0.08 * flicker) }, { scaleY: grow * (1 + 0.12 * flicker) }] };
  });

  return (
    <Animated.View pointerEvents="none" style={[styles.rocket, place]}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.flame, flame]}>
        <SvgXml xml={FLAME_SVG} width={ROCKET_BOX.width} height={ROCKET_BOX.height} />
      </Animated.View>
      <View style={StyleSheet.absoluteFill}>
        <SvgXml xml={BODY_SVG} width={ROCKET_BOX.width} height={ROCKET_BOX.height} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  rocket: { position: 'absolute', left: -ROCKET_BOX.width / 2, top: -ROCKET_BOX.height / 2, width: ROCKET_BOX.width, height: ROCKET_BOX.height },
  flame: { transformOrigin: FLAME_ORIGIN },
});
