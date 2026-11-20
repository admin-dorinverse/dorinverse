// The junk drawer pictures, drawn as in the design: the drawer sliding shut on Papa Dorin, and the drawer pulled
// open with kitchen light pouring in. The drawer front and the light are separate layers so only they move.

import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { easeInOut, loop, mix, wave } from '@/components/common/motion';
import { storyArt } from '@/theme/bakeryStoryColors';
import { artShadow, Stage, type ArtProps } from './artParts';

/** The drawer's size on the page, and the size of its drawing. */
const W = 210;
const H = 150;
const VIEW = '0 0 220 150';

/** How much the drawing is shrunk to fit, so moves in drawing units match the page. */
const SCALE = Math.min(W / 220, H / 150);

/** How long the drawer takes to slide shut and wait (ms), and how far open it starts (drawing units). */
const CLOSE_MS = 2600;
const OPEN_BY = 26;

/** The cabinet around the drawer. */
function Cabinet({ open }: { open: boolean }) {
  return (
    <Svg width={W} height={H} viewBox={VIEW} style={StyleSheet.absoluteFill}>
      <Rect x={10} y={30} width={200} height={110} rx={10} fill={storyArt.cabinet} />
      {open && <Rect x={22} y={40} width={176} height={30} fill={storyArt.inside} />}
    </Svg>
  );
}

/** The drawer's wooden front with its gold handle, `top` units from the drawing's top. */
function DrawerFront({ top }: { top: number }) {
  return (
    <Svg width={W} height={H} viewBox={VIEW}>
      <Defs>
        <LinearGradient id="storyDrawerWood" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={storyArt.woodLight} />
          <Stop offset="1" stopColor={storyArt.woodDark} />
        </LinearGradient>
      </Defs>
      <Rect x={16} y={top} width={188} height={70} rx={8} fill="url(#storyDrawerWood)" stroke={storyArt.woodEdge} strokeWidth={2} />
      <Rect x={88} y={top + 28} width={44} height={12} rx={6} fill={storyArt.handle} stroke={storyArt.handleEdge} strokeWidth={1.5} />
    </Svg>
  );
}

/** Chapter 6: the drawer slides shut, again and again. */
export function DrawerClosing({ clock }: ArtProps) {
  const slide = useAnimatedStyle(() => {
    const p = clock.still ? 1 : loop(clock.time.get(), CLOSE_MS);
    const shut = p < 0.3 ? 0 : p < 0.6 ? easeInOut((p - 0.3) / 0.3) : 1;
    return { transform: [{ translateY: mix(shut, OPEN_BY, 0) * SCALE }] };
  });
  return (
    <Stage style={styles.center}>
      <View style={styles.drawer}>
        <Cabinet open={false} />
        <Animated.View style={[StyleSheet.absoluteFill, slide]}>
          <DrawerFront top={40} />
        </Animated.View>
      </View>
    </Stage>
  );
}

/** Chapter 9: the drawer pulled open, with a slice of kitchen light that brightens and dims. */
export function DrawerLight({ clock }: ArtProps) {
  const glow = useAnimatedStyle(() => ({ opacity: mix(clock.still ? 1 : wave(clock.time.get(), 2400), 0.6, 1) }));
  return (
    <Stage style={styles.center}>
      <View style={styles.drawer}>
        <Cabinet open />
        <Animated.View style={[StyleSheet.absoluteFill, glow]}>
          <Svg width={W} height={H} viewBox={VIEW}>
            <Defs>
              <LinearGradient id="storyDrawerBeam" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={storyArt.beam} stopOpacity={0.95} />
                <Stop offset="1" stopColor={storyArt.beam} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            <Path d="M40 0 L180 0 L198 70 L22 70 Z" fill="url(#storyDrawerBeam)" />
          </Svg>
        </Animated.View>
        <View style={StyleSheet.absoluteFill}>
          <DrawerFront top={66} />
        </View>
      </View>
    </Stage>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  drawer: { width: W, height: H, filter: artShadow },
});
