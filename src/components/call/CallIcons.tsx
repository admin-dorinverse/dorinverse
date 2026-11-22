// The call's small line icons, drawn as in the call mockups: the microphone (and crossed out when muted), the
// speaker, and the Leave arrow. They are still pictures.

import Svg, { Path, Rect } from 'react-native-svg';

/** Props for an icon. */
type IconProps = {
  /** The line color. */
  color: string;
  /** Width and height. */
  size?: number;
};

/** A microphone, crossed out when `off`. */
export function MicIcon({ color, size = 24, off = false }: IconProps & { off?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Rect x={9} y={3} width={6} height={11} rx={3} />
      <Path d="M5 11a7 7 0 0 0 14 0" />
      <Path d="M12 18v3" />
      {off && <Path d="M3 3l18 18" />}
    </Svg>
  );
}

/** A speaker with sound coming out, or none when `off` (the earpiece). */
export function SpeakerIcon({ color, size = 24, off = false }: IconProps & { off?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4 9v6h4l5 4V5L8 9Z" />
      {!off && <Path d="M16.5 8.5a5 5 0 0 1 0 7" />}
    </Svg>
  );
}

/** The Leave arrow, out through a door. */
export function LeaveIcon({ color, size = 20 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M15 4h4v16h-4" />
      <Path d="M10 8l-4 4 4 4" />
      <Path d="M6 12h10" />
    </Svg>
  );
}

/** The small gold sparkle beside Papa Dorin's name. */
export function SparkleIcon({ color, size = 14 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 2l2.2 6.8L21 11l-6.8 2.2L12 20l-2.2-6.8L3 11l6.8-2.2Z" fill={color} />
    </Svg>
  );
}

/** A shield with a check, beside the privacy line. */
export function ShieldIcon({ color, size = 20 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 3l8 4v5c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V7Z" />
      <Path d="M9 12l2 2 4-4" />
    </Svg>
  );
}
