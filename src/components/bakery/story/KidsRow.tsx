// Papa Dorin's six cookie-cutter kids in a row, as in the design: each cutter is its constellation's outline drawn
// as a thick line in a darker shade of its color, with a thin white shine on top, and they take turns hopping.

import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { easeInOut, loop, mix } from '@/components/common/motion';
import { sampleConstellations } from '@/data/sample/constellations';
import { constellationShapes } from '@/data/sample/constellationShapes';
import { storyArt } from '@/theme/bakeryStoryColors';
import { fonts } from '@/theme/text';
import type { ArtProps } from './artParts';

/** The six kids in order: their cutter shape and name. */
const KIDS = [
  ['gingerbread', 'Chip'],
  ['heart', 'Sparkle'],
  ['dove', 'Minty'],
  ['star', 'Berry'],
  ['flower', 'Buttercup'],
  ['bell', 'Ruby'],
] as const;

/** Darkens "#rrggbb" by multiplying each part by `f`, like the design's dk(). */
function darken(hex: string, f = 0.62): string {
  return `#${[1, 3, 5].map((i) => Math.round(parseInt(hex.slice(i, i + 2), 16) * f).toString(16).padStart(2, '0')).join('')}`;
}

/** One cutter worked out once: its name, darker color, drawing box and outline path. */
type Cutter = { name: string; color: string; viewBox: string; path: string };

/** The six cutters, worked out once when the app loads. */
const CUTTERS: readonly Cutter[] = KIDS.map(([shape, name]) => {
  const { points, segments } = constellationShapes[shape];
  const c = sampleConstellations.find((x) => x.shape === constellationShapes[shape]);
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const x0 = Math.min(...xs) - 14;
  const y0 = Math.min(...ys) - 14;
  const viewBox = `${x0} ${y0} ${Math.max(...xs) + 14 - x0} ${Math.max(...ys) + 14 - y0}`;
  const path = segments.map(([a, b]) => `M${points[a][0]} ${points[a][1]}L${points[b][0]} ${points[b][1]}`).join('');
  return { name, color: darken(c?.color ?? storyArt.kidName), viewBox, path };
});

/** How long one hop loop takes (ms), and how much later each kid starts than the one before. */
const HOP_MS = 2600;
const HOP_STAGGER_MS = 120;

/** Props for the row of kids. */
type KidsRowProps = ArtProps & {
  /** True to show each kid's name under it, with bigger cutters. */
  named: boolean;
};

/** The six cutter kids side by side. */
export function KidsRow({ clock, named }: KidsRowProps) {
  return (
    <View style={styles.row}>
      {CUTTERS.map((cutter, i) => (
        <Kid key={cutter.name} clock={clock} cutter={cutter} index={i} named={named} />
      ))}
    </View>
  );
}

/** One cutter kid, hopping up and back down once each loop. */
function Kid({ clock, cutter, index, named }: ArtProps & { cutter: Cutter; index: number; named: boolean }) {
  const size = named ? 50 : 38;
  const hop = useAnimatedStyle(() => {
    const p = clock.still ? 0 : loop(clock.time.get() + HOP_MS - index * HOP_STAGGER_MS, HOP_MS);
    const up = p < 0.12 ? easeInOut(p / 0.12) : p < 0.24 ? 1 - easeInOut((p - 0.12) / 0.12) : 0;
    return { transform: [{ translateY: mix(up, 0, -8) }] };
  });
  return (
    <Animated.View style={[styles.kid, hop]}>
      <Svg width={size} height={size} viewBox={cutter.viewBox}>
        <Path d={cutter.path} fill="none" stroke={cutter.color} strokeWidth={13} strokeLinecap="round" strokeLinejoin="round" />
        <Path d={cutter.path} fill="none" stroke={storyArt.cutterShine} strokeOpacity={0.55} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
      {named && <Text style={styles.name}>{cutter.name}</Text>}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'center', gap: 4 },
  kid: { alignItems: 'center', gap: 2 },
  name: { fontFamily: fonts.black, fontSize: 12, color: storyArt.kidName },
});
