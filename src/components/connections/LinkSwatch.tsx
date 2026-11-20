// A short sample of a kind of link's line, in its color and dash pattern, for the filter list and link lists.

import Svg, { Line } from 'react-native-svg';
import { linkColors } from '@/theme/characterWebColors';
import { LINK_STYLES } from './webModel';

/** Props for a swatch. */
type LinkSwatchProps = {
  /** The kind of link. */
  type: string;
  /** The swatch's width and height. */
  width?: number;
  height?: number;
};

/** One line swatch. */
export function LinkSwatch({ type, width = 28, height = 10 }: LinkSwatchProps) {
  const style = LINK_STYLES[type] ?? {};
  return (
    <Svg width={width} height={height}>
      <Line
        x1={2}
        y1={height / 2}
        x2={width - 2}
        y2={height / 2}
        stroke={linkColors[type]}
        strokeWidth={3.2 * (style.width ?? 1)}
        strokeLinecap="round"
        strokeDasharray={style.dash?.map((x) => x * 0.6)}
      />
    </Svg>
  );
}
