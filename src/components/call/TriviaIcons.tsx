// Trivia's small pictures, drawn as in the call mockups: each answer's shape (triangle, diamond, circle, square),
// the trophy on the score chip, the right answer's check, the Next arrow, the Stop square, the winner's crown and
// the gold rays behind the winner. They are still pictures.

import Svg, { Circle, G, Path, Rect } from 'react-native-svg';

/** Props for a small picture. */
type IconProps = {
  /** The fill or line color. */
  color: string;
  /** Width and height. */
  size?: number;
};

/** The shape for an answer by its position (1 triangle, 2 diamond, 3 circle, 4 square). */
export function AnswerShape({ position, color, size = 24 }: IconProps & { position: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {position === 1 && <Path d="M12 4l9 16H3Z" fill={color} />}
      {position === 2 && <Path d="M12 2l9 10-9 10-9-10Z" fill={color} />}
      {position === 3 && <Circle cx={12} cy={12} r={9} fill={color} />}
      {position === 4 && <Rect x={4} y={4} width={16} height={16} rx={2} fill={color} />}
    </Svg>
  );
}

/** The trophy on "You: 200". */
export function TrophyIcon({ color, size = 16 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0Z" />
      <Path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3" />
    </Svg>
  );
}

/** A check in a circle, beside the right answer. */
export function RightIcon({ color, size = 26 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={12} cy={12} r={10} />
      <Path d="M7.5 12.5l3 3 6-6.5" />
    </Svg>
  );
}

/** The arrow on "Next question". */
export function NextIcon({ color, size = 18 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M5 12h14M13 6l6 6-6 6" />
    </Svg>
  );
}

/** The square on "Stop Papa Dorin". */
export function StopIcon({ color, size = 14 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x={5} y={5} width={14} height={14} rx={3} fill={color} />
    </Svg>
  );
}

/** The winner's gold crown, with its darker edge. */
export function CrownIcon({ color, edge }: IconProps & { edge: string }) {
  return (
    <Svg width={54} height={40} viewBox="0 0 54 40">
      <Path d="M4 36L8 8l12 12L27 2l7 18L46 8l4 28Z" fill={color} stroke={edge} strokeWidth={2} strokeLinejoin="round" />
    </Svg>
  );
}

/** The gold rays and two sparkles behind the winner. */
export function WinnerRays({ color, sparkle }: IconProps & { sparkle: string }) {
  return (
    <Svg width={260} height={210} viewBox="0 0 260 210">
      <G stroke={color} strokeWidth={5} strokeLinecap="round" opacity={0.8}>
        <Path d="M130 14v20" />
        <Path d="M130 176v20" />
        <Path d="M30 105h20" />
        <Path d="M210 105h20" />
        <Path d="M60 35l14 14" />
        <Path d="M186 161l14 14" />
        <Path d="M200 35l-14 14" />
        <Path d="M74 161l-14 14" />
      </G>
      <G fill={sparkle}>
        <Path d="M40 60l3 9 9 3-9 3-3 9-3-9-9-3 9-3Z" />
        <Path d="M222 150l2.5 7 7 2.5-7 2.5-2.5 7-2.5-7-7-2.5 7-2.5Z" />
      </G>
    </Svg>
  );
}
