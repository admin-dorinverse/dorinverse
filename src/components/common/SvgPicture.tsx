// Draws a small static SVG picture with Skia, which supports the gradients and dashes the design's icons use.

import { Canvas, ImageSVG, Skia, Group } from '@shopify/react-native-skia';
import { useMemo } from 'react';

/** Props for an SVG picture. */
type SvgPictureProps = {
  /** The SVG drawing as text. */
  svg: string;
  /** Drawn width. */
  width: number;
  /** Drawn height. */
  height: number;
  /** Turns the picture by this many degrees around its center. */
  rotate?: number;
};

/** A small picture drawn from SVG text. */
export function SvgPicture({ svg, width, height, rotate = 0 }: SvgPictureProps) {
  const picture = useMemo(() => Skia.SVG.MakeFromString(svg), [svg]);
  if (!picture) return null;
  const turned = rotate % 180 !== 0;
  const w = turned ? height : width;
  const h = turned ? width : height;
  return (
    <Canvas style={{ width, height }}>
      <Group transform={[{ translateX: width / 2 }, { translateY: height / 2 }, { rotate: (rotate * Math.PI) / 180 }, { translateX: -w / 2 }, { translateY: -h / 2 }]}>
        <ImageSVG svg={picture} x={0} y={0} width={w} height={h} />
      </Group>
    </Canvas>
  );
}
