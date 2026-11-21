// Inside Papa Dorin's Bakery, for sending a box off: the ceiling beam, the striped kitchen wall with its posts, and
// the conveyor belt picture hung right under the ceiling, its glass chimney going up into it (as on the Bakery
// page). Also where the belt's spots are, and the post and chimney glass drawn again over the box so it passes
// behind them. Drawn once; only the oven's flash moves.

import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import Svg, { Rect } from 'react-native-svg';
import { beltSide, kitchen } from '@/theme/bakeryColors';

/** The belt picture, and its size in pixels, which all its spots below are measured in. */
const BELT_ART = require('../../../assets/images/kitchen-belt.webp');
const ART_W = 1327;
const ART_H = 684;

/** The ceiling beam's height, its shadow, and the gap between the beam and the belt picture (as on the Bakery page). */
const CEILING_H = 9;
const CEILING_SHADOW_H = 3;
const ART_GAP = 2;

/** The wall's stripe width, and the gap between the belt picture and the wall's right edge (as on the Bakery page). */
const STRIPE = 18;
const ART_RIGHT = 6;

/** How tall the belt picture is drawn: big enough to read, never taller than this. */
const ART_MAX_H = 300;

/** The belt's spots on screen. */
export type BeltSpots = {
  /** The belt picture's left edge, top, width and height. It is pinned to the right, so the oven always shows. */
  left: number;
  top: number;
  width: number;
  height: number;
  /** Where a box's bottom sits on the belt, and from where to where a box can be put down. */
  surfaceY: number;
  dropLeft: number;
  dropRight: number;
  /** Where a box slips into the oven, and where it is gone inside. */
  mouthX: number;
  insideX: number;
  /** The chimney's middle, and where a box shows at its bottom. */
  chimneyX: number;
  chimneyBottom: number;
};

/** Works out the belt's spots on a screen `screenW` wide, under a ceiling whose top is at `ceilingTop`. */
export function beltSpots(screenW: number, ceilingTop: number): BeltSpots {
  const height = Math.min(ART_MAX_H, screenW * 0.72);
  const k = height / ART_H;
  const width = ART_W * k;
  const left = screenW - ART_RIGHT - width;
  const top = ceilingTop + CEILING_H + ART_GAP;
  return {
    left,
    top,
    width,
    height,
    surfaceY: top + 491 * k,
    dropLeft: Math.max(20, left + 240 * k),
    dropRight: left + 960 * k,
    mouthX: left + 1000 * k,
    insideX: left + 1046 * k,
    chimneyX: left + 1172 * k,
    chimneyBottom: top + 340 * k,
  };
}

/** A part of the belt picture shown again over the box (as shares of the picture). */
function Cut({ spots, fx, fy, fw, fh, opacity }: { spots: BeltSpots; fx: number; fy: number; fw: number; fh: number; opacity: number }) {
  const { left, top, width, height } = spots;
  return (
    <View pointerEvents="none" style={[styles.cut, { left: left + fx * width, top: top + fy * height, width: fw * width, height: fh * height, opacity }]}>
      <Image source={BELT_ART} style={{ position: 'absolute', left: -fx * width, top: -fy * height, width, height }} contentFit="fill" />
    </View>
  );
}

/** The belt's long side running in from the left edge of the screen to the picture, as on the Bakery page. */
const BELT_SIDE = `linear-gradient(180deg, ${beltSide.map(([at, c]) => `${c} ${(at * 100).toFixed(2)}%`).join(', ')})`;

/** The ceiling, the wall and the belt, under the box. */
export function KitchenWall({ width, ceilingTop, spots }: { width: number; ceilingTop: number; spots: BeltSpots }) {
  const wallH = spots.top + spots.height - ceilingTop;
  const stripes = Math.ceil(width / STRIPE);
  const post = width * 0.023256;
  const line = width * 0.0093;
  return (
    <View pointerEvents="none" style={[styles.wall, { top: ceilingTop, height: wallH }]} accessibilityLabel="Papa Dorin's kitchen and conveyor belt">
      <Svg width={width} height={wallH} style={StyleSheet.absoluteFill}>
        {Array.from({ length: stripes }, (_, i) => (
          <Rect key={i} x={i * STRIPE} y={0} width={STRIPE} height={wallH} fill={i % 2 ? kitchen.stripeB : kitchen.stripeA} />
        ))}
        <Rect x={0} y={0} width={post} height={wallH} fill={kitchen.post} />
        <Rect x={width - post} y={0} width={post} height={wallH} fill={kitchen.post} />
        <Rect x={post} y={0} width={line} height={wallH} fill={kitchen.postLine} />
        <Rect x={width - post - line} y={0} width={line} height={wallH} fill={kitchen.postLine} />
        <Rect x={0} y={CEILING_H} width={width} height={CEILING_SHADOW_H} fill={kitchen.ceilingShadow} />
        <Rect x={0} y={0} width={width} height={CEILING_H} fill={kitchen.ceiling} />
      </Svg>
      {spots.left > 0 && <View style={{ position: 'absolute', left: 0, top: spots.top - ceilingTop, width: spots.left + 3, height: spots.height, backgroundImage: BELT_SIDE }} />}
      <Image source={BELT_ART} style={{ position: 'absolute', left: spots.left, top: spots.top - ceilingTop, width: spots.width, height: spots.height }} contentFit="fill" />
    </View>
  );
}

/** The post, the chimney's glass and the oven's glow, over the box. `flash` (0 to 1) brightens the oven mouth. */
export function BeltOver({ spots, flash }: { spots: BeltSpots; flash: SharedValue<number> }) {
  const glow = useAnimatedStyle(() => ({ opacity: 0.25 + 0.75 * flash.get(), transform: [{ scale: 1 + 0.25 * flash.get() }] }));
  const k = spots.width / ART_W;
  const glowW = 170 * k;
  const glowH = 120 * k;
  return (
    <>
      <Cut spots={spots} fx={0.765637} fy={0.494152} fw={0.040693} fh={0.494152} opacity={1} />
      <Cut spots={spots} fx={0.833459} fy={0} fw={0.099472} fh={0.45614} opacity={0.62} />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.glow,
          {
            left: spots.left + 1172 * k - glowW / 2,
            top: spots.top + 495 * k - glowH / 2,
            width: glowW,
            height: glowH,
            backgroundImage: `radial-gradient(ellipse, ${kitchen.ovenGlow[0]} 0%, ${kitchen.ovenGlow[1]} 55%, ${kitchen.ovenGlow[2]} 100%)`,
          },
          glow,
        ]}
      />
    </>
  );
}

const styles = StyleSheet.create({
  wall: { position: 'absolute', left: 0, right: 0, overflow: 'hidden' },
  cut: { position: 'absolute', overflow: 'hidden' },
  glow: { position: 'absolute', borderRadius: 999 },
});
