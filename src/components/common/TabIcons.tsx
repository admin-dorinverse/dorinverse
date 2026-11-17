// The three tab icons from the Constellations design: a sparkle for Sky, an open book for Collections,
// and a sparkle with a plus for Keep it fresh.

import Svg, { Path } from 'react-native-svg';

/** Props shared by the tab icons. */
type TabIconProps = {
  /** Icon color. */
  color: string;
  /** Icon width and height. */
  size?: number;
};

/** A filled four-point sparkle, for the Sky tab. */
export function SkyIcon({ color, size = 19 }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 2l2.2 6.8L21 11l-6.8 2.2L12 20l-2.2-6.8L3 11l6.8-2.2Z" fill={color} />
    </Svg>
  );
}

/** An open book outline, for the Collections tab. */
export function CollectionsIcon({ color, size = 19 }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 6.5C10 5 7 4.6 4 5v13c3-.4 6 0 8 1.5 2-1.5 5-1.9 8-1.5V5c-3-.4-6 0-8 1.5Z" />
      <Path d="M12 6.5v13" />
    </Svg>
  );
}

/** A sparkle outline with a small plus, for the Keep it fresh tab. */
export function FreshIcon({ color, size = 19 }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 3.5 13.8 9 19.5 10.5 13.8 12 12 17.5 10.2 12 4.5 10.5 10.2 9Z" />
      <Path d="M18.5 16v4M16.5 18h4" />
    </Svg>
  );
}
