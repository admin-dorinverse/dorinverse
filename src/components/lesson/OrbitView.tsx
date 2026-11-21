// The orbit view's sky picture, as in the Constellations design: each stop's ring around the big star (solid once
// baked, dotted before), the curved paths between stops (gold between baked ones), the big star, and the cookies.
// The rings and paths are drawn once and never move; the star and cookies move only on the page's shared timer,
// which stops whenever another page or sheet covers this one. A cookie the rocket has collected leaves a glowing done circle on its spot.

import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import type { CookieArt } from '@/components/common/cookieArt';
import { useAmbientClock } from '@/components/common/useAmbientClock';
import { lessonSky } from '@/theme/lessonColors';
import { BigStar } from './BigStar';
import { CookieNode } from './CookieNode';
import { DoneRing } from './DoneRing';
import { useOrbitLayout } from './useOrbitLayout';

/** Nothing here moves fast, so the timer always ticks at its calm 20 a second. */
function neverBusy(): boolean {
  'worklet';
  return false;
}

/** Props for the orbit view. */
type OrbitViewProps = {
  /** How many stops the lesson has. */
  stopCount: number;
  /** How many are baked (stops bake in order). */
  baked: number;
  /** The constellation's color. */
  color: string;
  /** The constellation's cookie pictures. */
  art: CookieArt;
  /** The stops (by place, from 0) whose cookies the rocket has collected. */
  collected: ReadonlySet<number>;
  /** Opens a stop by its place, from 0. */
  onOpen: (index: number) => void;
};

/** The rings, paths, big star and cookies. */
export function OrbitView({ stopCount, baked, color, art, collected, onOpen }: OrbitViewProps) {
  const { width, height } = useWindowDimensions();
  const clock = useAmbientClock(neverBusy);
  const layout = useOrbitLayout(stopCount);
  const size = layout.size;
  return (
    <View style={StyleSheet.absoluteFill}>
      <Svg width={width} height={height} style={StyleSheet.absoluteFill} pointerEvents="none">
        {layout.nodes.map((n, i) => (
          <Circle
            key={`ring-${i}`}
            cx={layout.starX}
            cy={layout.starY}
            r={n.ring}
            fill="none"
            stroke={color}
            strokeOpacity={i < baked ? 0.45 : 0.16}
            strokeWidth={i < baked ? 2 : 1.2}
            strokeDasharray={i < baked ? undefined : '2 7'}
          />
        ))}
        {layout.paths.map((d, i) => {
          const gold = i + 1 < baked;
          return (
            <Path
              key={`path-${i}`}
              d={d}
              fill="none"
              stroke={gold ? lessonSky.bakedPath : lessonSky.path}
              strokeWidth={gold ? 4 : 3}
              strokeLinecap="round"
              strokeDasharray={gold ? undefined : '1 10'}
            />
          );
        })}
      </Svg>
      <BigStar x={layout.starX} y={layout.starY} color={color} clock={clock} />
      {layout.nodes.map((n, i) =>
        collected.has(i) ? (
          <DoneRing key={i} x={n.x} y={n.y} color={color} clock={clock} />
        ) : (
        <CookieNode
          key={i}
          index={i}
          x={n.x}
          y={n.y}
          size={size}
          state={i < baked ? 'baked' : i === baked ? 'next' : 'locked'}
          art={art}
          color={color}
          clock={clock}
          onOpen={onOpen}
        />
        ),
      )}
    </View>
  );
}
