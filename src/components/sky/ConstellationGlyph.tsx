// A constellation's small glowing shape, used on Star Map pins and page headers.

import { BlurMask, Canvas, Circle, Group, Path, Skia } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import type { Constellation } from '@/types/constellation';

/** Props for a constellation glyph. */
type ConstellationGlyphProps = {
  /** The constellation to draw. */
  constellation: Constellation;
  /** Width and height of the shape. */
  size: number;
  /** Line thickness before scaling, as in the design (6 on map pins). */
  stroke?: number;
  /** How far the glow spreads around the shape. */
  glow?: number;
};

/** Draws the shape with white star dots, colored lines and a soft glow in its color. */
export function ConstellationGlyph({ constellation, size, stroke = 6, glow = 6 }: ConstellationGlyphProps) {
  const art = useMemo(() => {
    const { points, segments } = constellation.shape;
    const xs = points.map((p) => p[0]);
    const ys = points.map((p) => p[1]);
    const minX = Math.min(...xs) - 14;
    const minY = Math.min(...ys) - 14;
    const w = Math.max(...xs) + 14 - minX;
    const h = Math.max(...ys) + 14 - minY;
    const k = size / Math.max(w, h);
    const offX = (size - w * k) / 2;
    const offY = (size - h * k) / 2;
    const px = (x: number) => glow + offX + (x - minX) * k;
    const py = (y: number) => glow + offY + (y - minY) * k;
    const builder = Skia.PathBuilder.Make();
    for (const [a, b] of segments) {
      builder.moveTo(px(points[a][0]), py(points[a][1]));
      builder.lineTo(px(points[b][0]), py(points[b][1]));
    }
    const lines = builder.detach();
    const dots = points.map((p) => ({ x: px(p[0]), y: py(p[1]) }));
    return { lines, dots, k };
  }, [constellation, size, glow]);

  const full = size + glow * 2;
  const color = constellation.color;
  return (
    <Canvas style={{ width: full, height: full, margin: -glow }}>
      <Group>
        <BlurMask blur={glow / 2} style="normal" />
        <Path path={art.lines} style="stroke" strokeWidth={stroke * art.k + 2} color={color} />
        {art.dots.map((d, i) => (
          <Circle key={i} cx={d.x} cy={d.y} r={stroke * 1.9 * art.k + 1} color={color} />
        ))}
      </Group>
      <Path path={art.lines} style="stroke" strokeWidth={stroke * art.k} strokeCap="round" color={color} opacity={0.75} />
      {art.dots.map((d, i) => (
        <Group key={i}>
          <Circle cx={d.x} cy={d.y} r={stroke * 1.9 * art.k} color="#ffffff" />
          <Circle cx={d.x} cy={d.y} r={stroke * 1.9 * art.k} color={color} style="stroke" strokeWidth={2 * art.k} />
        </Group>
      ))}
    </Canvas>
  );
}
