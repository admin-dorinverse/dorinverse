// "My Armor" in the sky, as in the Constellations design: the Armor of God made of glass shards, floating at its spot.
// Its pieces pulse gently one after another with a soft glow, and a shine sweeps across the earned shards. Everything
// is drawn once (armorArt.ts); the sky only moves, scales and fades those pictures, 20 times a second, and only while
// the armor is on screen on the Sky tab. Less motion on the phone keeps it still.

import { Canvas, Group, Image, LinearGradient, Paint, Rect, vec } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { PixelRatio, StyleSheet, Text } from 'react-native';
import Animated, { useAnimatedStyle, useDerivedValue, type SharedValue } from 'react-native-reanimated';
import { sampleUniverseSpots } from '@/data/sample/universe';
import { armor as armorColors } from '@/theme/armorColors';
import { text } from '@/theme/colors';
import { fonts } from '@/theme/text';
import { makeArmorArt, sampleEarned, type PieceArt } from './armorArt';
import { ARMOR_H, ARMOR_W } from './armorShapes';
import { useSky } from './SkyProvider';

/** Where the armor floats in the sky. */
const SPOT = sampleUniverseSpots.find((u) => u.id === 'armor') ?? { x: 720, y: -520 };

/** The design's timings, in seconds: a piece's pulse, the gap between pieces, the shine's sweep, and the float. */
const PULSE_S = 4.5;
const PULSE_GAP_S = 0.75;
const SHEEN_S = 5.5;
const FLOAT_S = 7.5;

/** How much a piece grows at the top of its pulse, and how far the armor floats up. */
const PULSE_GROW = 0.035;
const FLOAT_UP = 14;

/** Room over the armor for its name. */
const NAME_ROOM = 40;

/** Smooth start and end, like the design's ease-in-out. */
function ease(t: number): number {
  'worklet';
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

/** How far into its pulse a piece is (0 at rest, 1 at its fullest), as in the design's piecePulse (peaks at 45%). */
function pulseAt(seconds: number, index: number): number {
  'worklet';
  const p = ((((seconds - index * PULSE_GAP_S) / PULSE_S) % 1) + 1) % 1;
  return p < 0.45 ? ease(p / 0.45) : ease((1 - p) / 0.55);
}

/** True when the armor is near enough to the screen to show. */
function armorOnScreen(cameraX: number, cameraY: number, screenW: number, screenH: number): boolean {
  'worklet';
  return Math.abs(cameraX - SPOT.x) < ARMOR_W / 2 + screenW / 2 + 80 && Math.abs(cameraY - SPOT.y) < ARMOR_H / 2 + screenH / 2 + 120;
}

/** One piece: its picture, growing a little and glowing as it pulses. */
function Piece({ art, index, seconds }: { art: PieceArt; index: number; seconds: SharedValue<number> }) {
  const grow = useDerivedValue(() => [{ scale: 1 + PULSE_GROW * pulseAt(seconds.get(), index) }]);
  const glow = useDerivedValue(() => pulseAt(seconds.get(), index));
  return (
    <Group transform={grow} origin={vec(art.x + art.w / 2, art.y + art.h / 2)}>
      <Image image={art.base} x={art.x} y={art.y} width={art.w} height={art.h} />
      <Image image={art.glow} x={art.x} y={art.y} width={art.w} height={art.h} opacity={glow} />
    </Group>
  );
}

/** The armor. Place it over the sky canvas, under the rocket. */
export function SkyArmor() {
  const { sky, clock, pulse } = useSky();
  const art = useMemo(() => makeArmorArt(sampleEarned, PixelRatio.get()), []);

  // The armor's own time in seconds. It holds still (so nothing redraws) while it's off screen or motion is off.
  const seconds = useDerivedValue(() => {
    const s = sky.get();
    const live = s.atHome && !s.reduceMotion && armorOnScreen(s.camera.x, s.camera.y, s.width, s.height);
    return live ? clock.get() / 1000 : 0;
  });
  // The shine: a soft white band that sweeps across in the first 55% of every 5.5 seconds, then waits.
  const sheenStart = useDerivedValue(() => {
    const p = Math.min(1, ((seconds.get() % SHEEN_S) / SHEEN_S) / 0.55);
    return vec(-160 + 520 * p, 300 * p);
  });
  const sheenEnd = useDerivedValue(() => vec(sheenStart.get().x + 120, sheenStart.get().y + 120));
  const sheenOn = useDerivedValue(() => (seconds.get() > 0 ? 1 : 0));

  // Follows the camera and floats up and down every 7.5 seconds; hidden while far off screen.
  const place = useAnimatedStyle(() => {
    const now = pulse.get();
    const s = sky.get();
    const lift = s.reduceMotion ? 0 : FLOAT_UP * ease(0.5 - 0.5 * Math.cos((2 * Math.PI * (now / 1000 + 2)) / FLOAT_S));
    return {
      opacity: armorOnScreen(s.camera.x, s.camera.y, s.width, s.height) ? s.worldShown : 0,
      transform: [{ translateX: s.width / 2 - s.camera.x }, { translateY: s.height / 2 - s.camera.y - Math.round(lift * 2) / 2 }],
    };
  });

  if (!art) return null;
  const pad = art.haloPad;
  return (
    <Animated.View pointerEvents="none" style={[styles.origin, place]}>
      <Text style={[styles.name, { left: SPOT.x - 150, top: SPOT.y - ARMOR_H / 2 - NAME_ROOM }]}>My Armor</Text>
      <Canvas style={[styles.canvas, { left: SPOT.x - ARMOR_W / 2 - pad, top: SPOT.y - ARMOR_H / 2 - pad, width: ARMOR_W + pad * 2, height: ARMOR_H + pad * 2 }]}>
        <Group transform={[{ translateX: pad }, { translateY: pad }]}>
          <Image image={art.halo} x={-pad} y={-pad} width={ARMOR_W + pad * 2} height={ARMOR_H + pad * 2} />
          {art.pieces.map((p, i) => (
            <Piece key={i} art={p} index={i} seconds={seconds} />
          ))}
          {/* The shine shows only on earned shards: their masks, then the band kept to them, added as light. */}
          <Group layer={<Paint blendMode="screen" />} opacity={sheenOn}>
            {art.pieces.map((p, i) =>
              p.mask ? <Image key={i} image={p.mask} x={p.x} y={p.y} width={p.w} height={p.h} /> : null,
            )}
            <Rect x={-pad} y={-pad} width={ARMOR_W + pad * 2} height={ARMOR_H + pad * 2} blendMode="srcIn">
              <LinearGradient start={sheenStart} end={sheenEnd} colors={[armorColors.sheenClear, armorColors.sheen, armorColors.sheenClear]} positions={[0, 0.5, 1]} />
            </Rect>
          </Group>
        </Group>
      </Canvas>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  origin: { position: 'absolute', left: 0, top: 0, width: 0, height: 0, overflow: 'visible' },
  canvas: { position: 'absolute' },
  name: {
    position: 'absolute',
    width: 300,
    textAlign: 'center',
    fontFamily: fonts.black,
    fontSize: 20,
    letterSpacing: 0.4,
    color: text.onDark,
    textShadowColor: armorColors.nameGlow,
    textShadowRadius: 10,
    textShadowOffset: { width: 0, height: 0 },
  },
});
