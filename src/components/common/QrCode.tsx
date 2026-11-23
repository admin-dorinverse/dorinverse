// A QR code drawn as one still SVG path (every dark square merged), on a light background with its quiet border.
// The code is made once per text and reused, and nothing on it animates, so it costs the phone almost nothing.

import { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { qr } from '@/theme/colors';
import { qrPicture } from './qr/qrPicture';

/** Props for a QR code. */
type QrCodeProps = {
  /** The text the code holds, like a friend link. */
  value: string;
  /** Width and height in points, border included. */
  size: number;
};

/** A square QR code for some text. Shows a blank light square if the text is too long for a QR code. */
export function QrCode({ value, size }: QrCodeProps) {
  const picture = useMemo(() => qrPicture(value), [value]);
  if (!picture) return <View style={{ width: size, height: size, backgroundColor: qr.light }} />;
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${picture.side} ${picture.side}`}>
      <Rect x={0} y={0} width={picture.side} height={picture.side} fill={qr.light} />
      <Path d={picture.path} fill={qr.dark} />
    </Svg>
  );
}
