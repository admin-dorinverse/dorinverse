// The scenes on the Collections page's smaller cards: a light that travels from a prophecy to its fulfillment,
// a compass needle that swings and settles, and a prayer candle with sparks rising from it.

import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import Svg, { Circle, G, Path, Rect, Ellipse, Text as SvgText } from 'react-native-svg';
import type { AmbientClock } from '@/components/common/useAmbientClock';
import { easeInOut, easeOut, loop, mix } from '@/components/common/motion';
import { collectionArt, collectionHues } from '@/theme/colors';
import { mixColor } from '@/theme/mixColor';
import { fonts } from '@/theme/text';

/** A four-pointed star centered on (x, y), as drawn in the design. */
const star = (x: number, y: number) => `M${x} ${y - 12} L${x + 3} ${y - 3} L${x + 12} ${y} L${x + 3} ${y + 3} L${x} ${y + 12} L${x - 3} ${y + 3} L${x - 12} ${y} L${x - 3} ${y - 3}Z`;

/** The prophecy scene's drawing size, and how much it is enlarged on the card. */
const LINK_W = 150;
const LINK_H = 84;
const LINK_SCALE = 250 / 150;

/** How long one trip of the light takes, start to finish, then the pause before the next (ms). */
const LINK_LOOP_MS = 2800;

/** The prophecy card's scene: two stars joined by an arc, with a light running from the first to the second. */
export function ProphecyLink({ clock }: { clock: AmbientClock }) {
  const c = collectionHues.blue;
  const { time, still } = clock;
  const light = useAnimatedStyle(() => {
    const p = loop(time.get(), LINK_LOOP_MS);
    const t = easeInOut(Math.min(1, p / 0.7));
    // A point along the arc from (22, 58) over (75, -4) to (128, 58).
    const x = (1 - t) * (1 - t) * 22 + 2 * (1 - t) * t * 75 + t * t * 128;
    const y = (1 - t) * (1 - t) * 58 + 2 * (1 - t) * t * -4 + t * t * 58;
    return { opacity: still || p > 0.7 ? 0 : 1, transform: [{ translateX: x }, { translateY: y }] };
  });
  const flash = useAnimatedStyle(() => {
    const p = still ? 0.9 : loop(time.get(), LINK_LOOP_MS);
    const up = p < 0.62 ? 0 : p < 0.72 ? (p - 0.62) / 0.1 : 1 - (p - 0.72) / 0.28;
    const e = easeInOut(up);
    return { opacity: mix(e, 0.6, 1), transform: [{ scale: mix(e, 0.8, 1.45) }] };
  });

  return (
    <View style={styles.linkStage}>
      <View style={[styles.linkArt, { transform: [{ scale: LINK_SCALE }] }]}>
        <Svg width={LINK_W} height={LINK_H} style={StyleSheet.absoluteFill}>
          <Path d="M22 58 Q75 -4 128 58" fill="none" stroke={mixColor(c, 0.3)} strokeWidth={2} strokeDasharray="3 5" />
          <Path d={star(22, 58)} fill="#ffffff" />
          <SvgText x={22} y={82} fill="rgba(255,255,255,0.7)" fontFamily={fonts.extraBold} fontSize={9.5} textAnchor="middle">
            Prophesied
          </SvgText>
          <SvgText x={128} y={82} fill="rgba(255,255,255,0.7)" fontFamily={fonts.extraBold} fontSize={9.5} textAnchor="middle">
            Fulfilled
          </SvgText>
        </Svg>
        <Animated.View style={[styles.linkLight, { backgroundColor: c, boxShadow: `0 0 4px ${c}, 0 0 10px ${c}` }, light]} />
        <Animated.View style={[styles.linkStar, flash]}>
          <Svg width={26} height={26} viewBox="116 46 24 24">
            <Path d={star(128, 58)} fill="#ffffff" />
          </Svg>
        </Animated.View>
      </View>
    </View>
  );
}

/** The compass needle's swing as [time share, angle] keyframes over one 5-second loop. */
const SWING: readonly (readonly [number, number])[] = [
  [0, -40],
  [0.14, 28],
  [0.26, -14],
  [0.36, 7],
  [0.46, 0],
  [0.82, 0],
  [1, -40],
];

/** The Instructions card's scene: a compass whose needle swings, settles on north, then swings again. */
export function CompassScene({ clock }: { clock: AmbientClock }) {
  const c = collectionHues.cocoa;
  const { time, still } = clock;
  const needle = useAnimatedStyle(() => {
    const p = still ? 0.5 : loop(time.get(), 5000);
    let angle = 0;
    for (let i = 1; i < SWING.length; i++) {
      const [t1, a1] = SWING[i];
      const [t0, a0] = SWING[i - 1];
      if (p <= t1) {
        angle = mix(easeInOut((p - t0) / (t1 - t0)), a0, a1);
        break;
      }
    }
    return { transform: [{ rotate: `${angle}deg` }] };
  });
  return (
    <View style={styles.compass}>
      <Svg width={84} height={84} style={StyleSheet.absoluteFill}>
        <Circle cx={42} cy={42} r={36} fill="rgba(255,255,255,0.06)" stroke={c} strokeWidth={2.5} />
        <Circle cx={42} cy={42} r={29} fill="none" stroke="rgba(255,255,255,0.18)" strokeDasharray="2 5" />
        <SvgText x={42} y={20} fill={c} fontFamily={fonts.black} fontSize={10} textAnchor="middle">
          N
        </SvgText>
      </Svg>
      <Animated.View style={[StyleSheet.absoluteFill, needle]}>
        <Svg width={84} height={84}>
          <Path d="M42 14 L48 42 L42 46 L36 42Z" fill={collectionArt.needleNorth} />
          <Path d="M42 70 L48 42 L42 38 L36 42Z" fill={collectionArt.needleSouth} />
          <Circle cx={42} cy={42} r={4} fill={collectionArt.compassHub} stroke={c} strokeWidth={2} />
        </Svg>
      </Animated.View>
    </View>
  );
}

/** The sparks above the candle: [left in px, wait before the first rise in ms, drift sideways in px]. */
const PRAYER_SPARKS: readonly (readonly [number, number, number])[] = [
  [42, 0, -10],
  [55, 900, 6],
  [66, 1800, -4],
  [50, 2600, 12],
  [60, 450, -14],
];

/** The Prayers card's scene: a candle whose flame flickers, with sparks rising like prayers. */
export function PrayerCandle({ clock }: { clock: AmbientClock }) {
  const { time, still } = clock;
  const flame = useAnimatedStyle(() => {
    // The flicker goes there and back every 3.2 seconds, through two shapes.
    const p = still ? 0 : loop(time.get(), 3200);
    const s = p < 0.5 ? p * 2 : 2 - p * 2;
    const a = Math.min(1, s * 2);
    const b = Math.max(0, s * 2 - 1);
    const sx = s < 0.5 ? mix(easeInOut(a), 1, 1.08) : mix(easeInOut(b), 1.08, 0.95);
    const sy = s < 0.5 ? mix(easeInOut(a), 1, 0.94) : mix(easeInOut(b), 0.94, 1.06);
    const turn = s < 0.5 ? mix(easeInOut(a), 0, -3) : mix(easeInOut(b), -3, 3);
    return { transform: [{ scaleX: sx }, { scaleY: sy }, { rotate: `${turn}deg` }] };
  });
  return (
    <View style={styles.pray}>
      {PRAYER_SPARKS.map(([x, delay, dx]) => (
        <Spark key={x} x={x} delay={delay} dx={dx} clock={clock} />
      ))}
      <View style={styles.candle}>
        <Svg width={44} height={60} style={StyleSheet.absoluteFill}>
          <Ellipse cx={22} cy={58} rx={16} ry={2.5} fill="rgba(0,0,0,0.35)" />
          <Rect x={13} y={28} width={18} height={30} rx={3} fill={collectionArt.candle} />
          <Rect x={13} y={28} width={18} height={6} rx={3} fill={collectionArt.candleTop} />
          <Path d="M22 24 V28" stroke={collectionArt.wick} strokeWidth={1.6} />
        </Svg>
        <Animated.View style={[styles.flame, flame]}>
          <Svg width={44} height={44}>
            <G>
              <Path d="M22 6 C27 13 28 19 22 24 C16 19 17 13 22 6Z" fill={collectionArt.flameOuter} />
              <Path d="M22 13 C24.5 16.5 24.5 20 22 22.5 C19.5 20 19.5 16.5 22 13Z" fill={collectionArt.flameInner} />
            </G>
          </Svg>
        </Animated.View>
      </View>
    </View>
  );
}

/** One spark rising from the candle. */
function Spark({ x, delay, dx, clock }: { x: number; delay: number; dx: number; clock: AmbientClock }) {
  const c = collectionHues.lav;
  const style = useAnimatedStyle(() => {
    const now = clock.time.get();
    if (clock.still || now < delay) return { opacity: 0 };
    const p = loop(now, 3600, delay);
    const e = easeOut(p);
    return {
      opacity: p < 0.2 ? p / 0.2 : 1 - (p - 0.2) / 0.8,
      transform: [{ translateX: dx * e }, { translateY: -58 * e }, { scale: mix(e, 0.6, 1.1) }],
    };
  });
  return <Animated.View style={[styles.spark, { left: x, boxShadow: `0 0 6px ${c}, 0 0 12px ${c}` }, style]} />;
}

const styles = StyleSheet.create({
  linkStage: { alignItems: 'center', paddingTop: 6, paddingBottom: 18 },
  linkArt: { width: LINK_W, height: LINK_H, marginVertical: ((LINK_SCALE - 1) * LINK_H) / 2 },
  linkLight: { position: 'absolute', left: -3, top: -3, width: 6, height: 6, borderRadius: 3 },
  linkStar: { position: 'absolute', left: 115, top: 45, width: 26, height: 26 },
  compass: { width: 84, height: 84 },
  pray: { width: 110, height: 92 },
  candle: { position: 'absolute', left: 33, bottom: 0, width: 44, height: 60 },
  flame: { position: 'absolute', left: 0, top: 0, width: 44, height: 44, transformOrigin: '22px 22px' },
  spark: { position: 'absolute', bottom: 46, width: 5, height: 5, borderRadius: 3, backgroundColor: '#ffffff' },
});
