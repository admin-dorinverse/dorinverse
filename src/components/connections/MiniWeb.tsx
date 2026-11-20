// The small web at the top of a person's page, as in the owner's artifact: the person in the middle and everyone they
// are linked to in rings around them (8 in the first ring, then 14, 20 and 26), each joined by its colored lines with
// a round handle. A big web gets a frame you can drag and pinch, with + and − buttons.

import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { GestureDetector, usePanGesture, usePinchGesture, useSimultaneousGestures } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, G, Line } from 'react-native-svg';
import { playSound } from '@/components/common/sounds';
import { linkColors, webPage } from '@/theme/characterWebColors';
import { fonts } from '@/theme/text';
import { SquareFills, WebSquare } from './WebSquare';
import { LINK_STYLES, LINK_TYPES, type WebLink, type WebNode } from './webModel';

/** How many people each ring holds, inside to outside; later rings hold as many as the last. */
const RING_CAPS = [8, 14, 20, 26];

/** Space between rings, and the middle card's size. */
const RING_GAP = 110;
const CENTER = 96;

/** Widest the small web is drawn. */
const MAX_W = 520;

/** How far a big web can zoom in. */
const MAX_ZOOM = 6;

/** Props for one line in a small web. */
type MiniLineProps = {
  /** The link. */
  link: WebLink;
  /** Its two ends. */
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  /** Its base width. */
  width: number;
  /** Its place among several lines between the same two people. */
  offset: number;
  /** Opens the link; left out while either person is not collected yet. */
  onPress?: () => void;
};

/** One colored line with its round middle handle, as the artifact's small webs draw them. */
export function MiniLine({ link, x1, y1, x2, y2, width: w, offset, onPress }: MiniLineProps) {
  const len = Math.hypot(x2 - x1, y2 - y1) || 1;
  const ox = (-(y2 - y1) / len) * offset * w * 3;
  const oy = ((x2 - x1) / len) * offset * w * 3;
  const style = LINK_STYLES[link.type];
  const c = linkColors[link.type];
  const faint = link.why === undefined ? 0.25 : 1;
  const mx = (x1 + x2) / 2 + ox;
  const my = (y1 + y2) / 2 + oy;
  return (
    <G onPress={onPress} opacity={faint}>
      <Line x1={x1 + ox} y1={y1 + oy} x2={x2 + ox} y2={y2 + oy} stroke={c} strokeWidth={w * (style.width ?? 1)} strokeLinecap="round" strokeDasharray={style.dash?.map((v) => (v * w) / 3.5)} />
      <Circle cx={mx} cy={my} r={w * 2.4} fill={webPage.background} stroke={c} strokeWidth={w * 0.9} />
      <Circle cx={mx} cy={my} r={w * 0.9} fill={c} />
    </G>
  );
}

/** Props for a person's small web. */
type PersonWebProps = {
  /** The person. */
  node: WebNode;
  /** Their shown links, in the order the page lists them. */
  links: readonly WebLink[];
  /** Opens a person or a link. */
  onPerson: (node: WebNode) => void;
  onLink: (link: WebLink) => void;
};

/** A person's small web. */
export function PersonWeb({ node, links, onPerson, onLink }: PersonWebProps) {
  const { width } = useWindowDimensions();
  // Everyone they are linked to, each with their links, in the order the page lists them.
  const groups: [WebNode, WebLink[]][] = [];
  for (const l of links) {
    const other = l.a === node ? l.b : l.a;
    const group = groups.find(([o]) => o === other);
    if (group) group[1].push(l);
    else groups.push([other, [l]]);
  }
  const rings: number[] = [];
  for (let left = groups.length, r = 0; left > 0; r++) {
    const count = Math.min(RING_CAPS[Math.min(r, RING_CAPS.length - 1)], left);
    rings.push(count);
    left -= count;
  }
  const s = rings.length > 1 ? 70 : 76;
  const half = CENTER / 2 + 40 + Math.max(1, rings.length) * RING_GAP;
  const size = half * 2;
  const lines: ReactNode[] = [];
  const squares: ReactNode[] = [];
  let at = 0;
  rings.forEach((count, r) => {
    const radius = CENTER / 2 + 40 + (r + 0.6) * RING_GAP;
    for (let j = 0; j < count; j++, at++) {
      const angle = -Math.PI / 2 + ((j + (r % 2) * 0.5) * 2 * Math.PI) / count;
      const [other, ls] = groups[at];
      const x = half + Math.cos(angle) * radius;
      const y = half + Math.sin(angle) * radius;
      ls.forEach((l, k) => lines.push(<MiniLine key={`${l.index}`} link={l} x1={half} y1={half} x2={x} y2={y} width={3.5} offset={k - (ls.length - 1) / 2} onPress={l.why !== undefined ? () => onLink(l) : undefined} />));
      squares.push(<WebSquare key={other.lookup} node={other} x={x} y={y} size={s} ring={linkColors[ls[0].type]} ringWidth={4} onPress={other.character ? () => onPerson(other) : undefined} />);
    }
  });
  const drawn = Math.min(width - 36, MAX_W);
  const drawing = (
    <Svg width={drawn} height={drawn} viewBox={`0 0 ${size} ${size}`}>
      <SquareFills />
      {lines}
      <WebSquare node={node} x={half} y={half} size={CENTER} ring={webPage.cardEdge} ringWidth={2.5} />
      {squares}
    </Svg>
  );
  return rings.length > 1 ? <ZoomFrame size={drawn}>{drawing}</ZoomFrame> : <View style={styles.plain}>{drawing}</View>;
}

/** A framed square you can drag and pinch, with + and − buttons, for a big small web. */
function ZoomFrame({ size, children }: { size: number; children: ReactNode }) {
  const k = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const view = useAnimatedStyle(() => ({ transform: [{ translateX: tx.get() }, { translateY: ty.get() }, { scale: k.get() }] }));
  const pan = usePanGesture({
    maxPointers: 1,
    onUpdate: (e) => {
      'worklet';
      tx.set(tx.get() + e.changeX);
      ty.set(ty.get() + e.changeY);
    },
  });
  const pinch = usePinchGesture({
    onUpdate: (e) => {
      'worklet';
      k.set(Math.max(1, Math.min(MAX_ZOOM, k.get() * e.scaleChange)));
    },
  });
  const gestures = useSimultaneousGestures(pan, pinch);
  /** Zooms by a factor from a button, keeping the middle in place. */
  const zoom = (f: number) => {
    playSound('tap');
    const next = Math.max(1, Math.min(MAX_ZOOM, k.get() * f));
    k.set(withTiming(next));
    if (next === 1) {
      tx.set(withTiming(0));
      ty.set(withTiming(0));
    }
  };
  return (
    <View style={[styles.frame, { width: size, height: size }]}>
      <GestureDetector gesture={gestures}>
        <Animated.View style={view}>{children}</Animated.View>
      </GestureDetector>
      <View style={styles.zoom}>
        {(
          [
            ['+', 1.6, 'Zoom in'],
            ['−', 0.625, 'Zoom out'],
          ] as const
        ).map(([mark, f, label]) => (
          <Pressable key={mark} accessibilityRole="button" accessibilityLabel={label} onPress={() => zoom(f)} style={styles.zoomButton}>
            <Text style={styles.zoomMark}>{mark}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

/** The person's shown links, in the artifact's order: by kind of link, then by the other person's name. */
export function personLinks(node: WebNode, links: readonly WebLink[]): WebLink[] {
  const other = (l: WebLink) => (l.a === node ? l.b : l.a);
  return links
    .filter((l) => l.a === node || l.b === node)
    .sort((a, b) => LINK_TYPES.indexOf(a.type) - LINK_TYPES.indexOf(b.type) || other(a).name.localeCompare(other(b).name));
}

const styles = StyleSheet.create({
  plain: { alignItems: 'center' },
  frame: { alignSelf: 'center', overflow: 'hidden', borderWidth: 1, borderColor: webPage.line, borderRadius: 14, backgroundColor: webPage.background },
  zoom: { position: 'absolute', right: 8, bottom: 8, flexDirection: 'row', gap: 6 },
  zoomButton: { width: 40, height: 40, borderRadius: 10, borderWidth: 1, borderColor: webPage.line, backgroundColor: webPage.background, alignItems: 'center', justifyContent: 'center' },
  zoomMark: { fontFamily: fonts.black, fontSize: 20, color: webPage.ink },
});
