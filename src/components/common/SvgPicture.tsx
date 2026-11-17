// Draws a small static SVG picture (the design's gradient icons) as a plain native view with react-native-svg,
// like the tab icons. It needs no drawing canvas of its own, so it is cheap and always shows, even after a reload.

import { View } from 'react-native';
import { SvgXml } from 'react-native-svg';

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
  const turned = rotate % 180 !== 0;
  const w = turned ? height : width;
  const h = turned ? width : height;
  return (
    <View style={{ width, height, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: w, height: h, transform: [{ rotate: `${rotate}deg` }] }}>
        <SvgXml xml={svg} width={w} height={h} />
      </View>
    </View>
  );
}
