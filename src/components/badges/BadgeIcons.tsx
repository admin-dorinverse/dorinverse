// The two small pictures at the top of a badge's page: the close cross and the share arrow (a box with an arrow
// going up out of it, as phones draw it).

import Svg, { Path } from 'react-native-svg';

/** Props for an icon. */
type IconProps = {
  /** The picture's color. */
  color: string;
  /** Width and height. */
  size: number;
};

/** A cross, for closing the page. */
export function CloseIcon({ color, size }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.6} strokeLinecap="round">
      <Path d="M6 6l12 12M18 6L6 18" />
    </Svg>
  );
}

/** An arrow going up out of an open box, for sharing. */
export function ShareIcon({ color, size }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 3v12M7.5 7.5L12 3l4.5 4.5" />
      <Path d="M8 10H6a1.5 1.5 0 0 0-1.5 1.5v8A1.5 1.5 0 0 0 6 21h12a1.5 1.5 0 0 0 1.5-1.5v-8A1.5 1.5 0 0 0 18 10h-2" />
    </Svg>
  );
}
