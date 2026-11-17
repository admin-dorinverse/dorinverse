// The Places card's scene: the newest places the person has visited, pinned along a glowing journey line.
// The pins drop in, the newest one pulses, and a small light walks the route between them.

import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import Svg, { Ellipse, Path } from 'react-native-svg';
import type { AmbientClock } from '@/components/common/useAmbientClock';
import { clamp01, easeInOut, easeOutBack, loop, mix, progress } from '@/components/common/motion';
import { collectionArt, collectionHues } from '@/theme/colors';
import { mixColor } from '@/theme/mixColor';
import { gutter } from '@/theme/spacing';
import { fonts } from '@/theme/text';
import type { CollectedPlace } from '@/types/collection';

/** The map's drawing size. It is scaled to fit the card. */
const MAP_W = 300;
const MAP_H = 112;

/** Widest the page's content gets, and the map's side padding inside the card. */
const PAGE_MAX = 560;
const MAP_PAD = 8;

/** Where the three pins stand on the map. */
const PIN_SPOTS = [
  [50, 74],
  [150, 44],
  [250, 70],
] as const;

/** The journey line through the pins, and the faint contour lines behind it. */
const ROUTE = 'M50 74 C 88 30, 112 92, 150 44 S 214 22, 250 70';
const CONTOURS = ['M-10 30 C 40 10, 80 40, 130 22 S 230 0, 310 18', 'M-10 98 C 50 80, 100 104, 170 90 S 260 76, 310 96', 'M200 112 C 210 96, 240 92, 262 100 S 300 110, 310 104'];

/** The route's two curves as their four control points each, for the walking light. */
const CURVES = [
  [50, 74, 88, 30, 112, 92, 150, 44],
  [150, 44, 188, -4, 214, 22, 250, 70],
] as const;

/** A point `t` (0 to 1) along the whole route. */
function routePoint(t: number): [number, number] {
  'worklet';
  const c = t < 0.5 ? CURVES[0] : CURVES[1];
  const u = t < 0.5 ? t * 2 : t * 2 - 1;
  const a = (1 - u) ** 3;
  const b = 3 * (1 - u) ** 2 * u;
  const d = 3 * (1 - u) * u * u;
  const e = u ** 3;
  return [a * c[0] + b * c[2] + d * c[4] + e * c[6], a * c[1] + b * c[3] + d * c[5] + e * c[7]];
}

/** Props for the map. */
type PlacesMapProps = {
  /** Places visited, oldest first. The newest three are pinned. */
  places: readonly CollectedPlace[];
  /** The page's shared animation timer. */
  clock: AmbientClock;
};

/** The journey map with up to three pins. */
export function PlacesMap({ places, clock }: PlacesMapProps) {
  const { width } = useWindowDimensions();
  // The map is drawn at the size it shows, never drawn small and enlarged, so lines and text stay sharp.
  const s = (Math.min(width, PAGE_MAX) - gutter * 2 - 2 - MAP_PAD * 2) / MAP_W;
  const pinned = places.slice(-3);
  const c = collectionHues.sage;
  const { time, still } = clock;

  const route = useAnimatedStyle(() => ({ opacity: still ? 1 : easeInOut(progress(time.get(), 900, 2200)) }));
  const walker = useAnimatedStyle(() => {
    const p = loop(time.get(), 4500, 3000);
    const [x, y] = routePoint(p);
    return { opacity: still || time.get() < 3000 ? 0 : 1, transform: [{ translateX: x * s }, { translateY: y * s }] };
  });

  const box = { width: MAP_W * s, height: MAP_H * s };
  const view = `0 0 ${MAP_W} ${MAP_H}`;
  return (
    <View style={[styles.wrap, { height: MAP_H * s + 10 }]}>
      <View style={box}>
        <Svg width={box.width} height={box.height} viewBox={view} style={StyleSheet.absoluteFill}>
          {CONTOURS.map((d) => (
            <Path key={d} d={d} fill="none" stroke={mixColor(c, 0.22)} strokeWidth={1} />
          ))}
        </Svg>
        <Animated.View style={[StyleSheet.absoluteFill, route]}>
          <Svg width={box.width} height={box.height} viewBox={view}>
            <Path d={ROUTE} fill="none" stroke={mixColor(c, 0.85, '#ffffff')} strokeWidth={2.2} strokeDasharray="2 7" strokeLinecap="round" />
          </Svg>
        </Animated.View>
        {pinned.length > 1 && (
          <Animated.View
            style={[styles.walker, { left: -2.8 * s, top: -2.8 * s, width: 5.6 * s, height: 5.6 * s, borderRadius: 3 * s, boxShadow: `0 0 4px ${c}, 0 0 9px ${c}` }, walker]}
          />
        )}
        {PIN_SPOTS.map(([x, y], i) => (
          <MapPin key={i} x={x * s} y={y * s} s={s} index={i} place={pinned[i]} newest={i === pinned.length - 1} clock={clock} />
        ))}
      </View>
    </View>
  );
}

/** Props for one pin. */
type MapPinProps = {
  /** Where the pin's point touches the map, in points on screen. */
  x: number;
  y: number;
  /** How much bigger the map shows than its drawing size. */
  s: number;
  /** The pin's place in line, which sets when it drops. */
  index: number;
  /** The place on the pin, or none for a "Next stop" pin. */
  place?: CollectedPlace;
  /** True for the newest place, which pulses. */
  newest: boolean;
  /** The page's shared animation timer. */
  clock: AmbientClock;
};

/** How big the pulse ring grows, as a multiple of its starting size. */
const PULSE_GROW = 2.2;

/** One pin with its name under it. */
function MapPin({ x, y, s, index, place, newest, clock }: MapPinProps) {
  const c = collectionHues.sage;
  const { time, still } = clock;
  const drop = useAnimatedStyle(() => {
    if (still) return { opacity: 1, transform: [{ translateY: 0 }, { scale: 1 }] };
    const t = progress(time.get(), 200 + index * 350, 700);
    const e = easeOutBack(t, 1.8);
    return { opacity: clamp01(t / 0.6), transform: [{ translateY: mix(e, -36, 0) * s }, { scale: mix(e, 0.6, 1) }] };
  });
  // The ring is drawn at its biggest size and only ever shrunk, so it never turns blurry.
  const pulse = useAnimatedStyle(() => {
    if (still) return { opacity: 0 };
    const p = loop(time.get(), 2200, 1400);
    return { opacity: time.get() < 1400 ? 0 : mix(p, 0.9, 0), transform: [{ scale: mix(easeInOut(p), 0.4, PULSE_GROW) / PULSE_GROW }] };
  });

  const ring = { w: 28 * PULSE_GROW * s, h: 10 * PULSE_GROW * s };
  return (
    <View style={[styles.pinSpot, { left: x, top: y }]}>
      {place && newest && (
        <Animated.View
          style={[styles.pulse, { top: -ring.h / 2, width: ring.w, height: ring.h, borderRadius: ring.w / 2, borderWidth: 1.5 * PULSE_GROW * s, borderColor: c }, pulse]}
        />
      )}
      {place && <View style={[styles.shadow, { top: -2.5 * s, width: 14 * s, height: 5 * s, borderRadius: 7 * s }]} />}
      <Animated.View style={[styles.pin, { top: -35 * s, width: 26 * s, height: 36 * s }, drop]}>
        <Svg width={26 * s} height={36 * s} viewBox="-13 -35 26 36">
          {place ? (
            <>
              <Path d="M0 0 C-7 -9 -12 -15 -12 -22 A12 12 0 1 1 12 -22 C12 -15 7 -9 0 0Z" fill={c} stroke="rgba(255,255,255,0.8)" strokeWidth={1.5} />
              <Ellipse cx={0} cy={-22} rx={8.5} ry={8.5} fill={collectionArt.pinInside} />
            </>
          ) : (
            <Path d="M0 0 C-7 -9 -11 -15 -11 -21 A11 11 0 1 1 11 -21 C11 -15 7 -9 0 0Z" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.45)" strokeDasharray="3 3" />
          )}
        </Svg>
        <Text style={[styles.pinMark, { top: 5 * s, width: 26 * s, fontSize: 11 * s, lineHeight: 16 * s }, !place && [styles.pinMarkEmpty, { fontSize: 12 * s, top: 6 * s }]]}>
          {place ? place.emoji : '?'}
        </Text>
      </Animated.View>
      <Text style={[styles.name, { top: 5 * s, fontSize: 12.5 * s }, !place && styles.nameEmpty]}>{place ? place.name : 'Next stop'}</Text>
      {place && <Text style={[styles.book, { top: 19 * s, fontSize: 10 * s }]}>{place.book}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: MAP_PAD, overflow: 'visible' },
  walker: { position: 'absolute', backgroundColor: '#ffffff' },
  pinSpot: { position: 'absolute', width: 0, height: 0, alignItems: 'center', overflow: 'visible' },
  pulse: { position: 'absolute' },
  shadow: { position: 'absolute', backgroundColor: 'rgba(0,0,0,0.35)' },
  pin: { position: 'absolute', alignItems: 'center', transformOrigin: '50% 100%' },
  pinMark: { position: 'absolute', textAlign: 'center' },
  pinMarkEmpty: { fontFamily: fonts.black, color: 'rgba(255,255,255,0.6)' },
  name: { position: 'absolute', width: 140, textAlign: 'center', fontFamily: fonts.black, color: '#ffffff' },
  nameEmpty: { color: 'rgba(255,255,255,0.5)' },
  book: { position: 'absolute', width: 140, textAlign: 'center', fontFamily: fonts.bold, color: 'rgba(255,255,255,0.6)' },
});
