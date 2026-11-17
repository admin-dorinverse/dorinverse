// The round map button at the bottom right of the Sky tab. It shows a live mini map and grows while the sky moves.
// Tapping it opens the Star Map.

import { Canvas, Picture, createPicture, type SkPicture } from '@shopify/react-native-skia';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedReaction, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { sampleUniverseSpots } from '@/data/sample/universe';
import { chrome, gutter, radius } from '@/theme/spacing';
import { drawMiniMap } from './drawMiniMap';
import { useSky } from './SkyProvider';

/** The design's springy timing for the button growing (cubic-bezier .2, .9, .3, 1.25). */
const GROW = { duration: 450, easing: Easing.bezier(0.2, 0.9, 0.3, 1.25) };

/** Props for the map button. */
type MapButtonProps = {
  /** Opens the Star Map. */
  onPress: () => void;
};

/** The live mini map button. */
export function MapButton({ onPress }: MapButtonProps) {
  const insets = useSafeAreaInsets();
  const { sky, clock, constellations } = useSky();
  const size = chrome.mapButton;
  const picture = useSharedValue<SkPicture>(createPicture(() => {}));
  const lastDrawn = useSharedValue(0);
  const big = useSharedValue(0);

  // Redraw the mini map 11 times a second, or 25 while the sky moves. Grow the button while moving.
  useAnimatedReaction(
    () => clock.value,
    (now) => {
      const s = sky.value;
      const moving = s.atHome && now - s.lastMovedAt < 900 ? 1 : 0;
      if (moving !== big.value) big.value = moving;
      if (now - lastDrawn.value < (moving ? 40 : 90)) return;
      lastDrawn.value = now;
      picture.value = createPicture((canvas) => drawMiniMap(canvas, s, size, constellations, sampleUniverseSpots), { width: size, height: size });
    },
  );
  const grow = useSharedValue(1);
  useAnimatedReaction(
    () => big.value,
    (b, previous) => {
      if (b !== previous) grow.value = withTiming(b ? chrome.mapButtonGrow : 1, GROW);
    },
  );
  const growStyle = useAnimatedStyle(() => ({
    transform: [{ scale: grow.value }],
    boxShadow: grow.value > 1.01 ? '0 10px 30px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.25)' : '0 8px 30px rgba(0,0,0,0.35)',
  }));

  return (
    <Animated.View style={[styles.wrap, { bottom: insets.bottom + chrome.bottom, width: size, height: size }, growStyle]}>
      <Pressable accessibilityRole="button" accessibilityLabel="Star map" onPress={onPress} style={({ pressed }) => [styles.press, pressed && styles.pressed]}>
        <Canvas style={{ width: size, height: size }}>
          <Picture picture={picture} />
        </Canvas>
        <View style={styles.rim} pointerEvents="none" />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', right: gutter, borderRadius: radius.pill, zIndex: 25, transformOrigin: '100% 100%' },
  press: { flex: 1, borderRadius: radius.pill, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)' },
  pressed: { transform: [{ scale: 0.94 }] },
  rim: {
    ...StyleSheet.absoluteFill,
    borderRadius: radius.pill,
    boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.25), inset 0 0 18px rgba(140,170,255,0.35)',
  },
});
