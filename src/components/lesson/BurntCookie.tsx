// A small baked cookie in the Quality Check's score row, dark when it turned out burnt. The dark is a copy of the
// cookie cut to its own shape, so only the cookie darkens, never the box around it.

import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import { qualityColors } from '@/theme/lessonColors';

/** Props for the cookie. */
type BurntCookieProps = {
  /** The baked cookie picture. */
  source: number;
  /** Its width and height. */
  size: number;
  /** True to show it burnt. */
  burnt: boolean;
};

/** The cookie picture, burnt or not. */
export function BurntCookie({ source, size, burnt }: BurntCookieProps) {
  return (
    <View style={{ width: size, height: size }}>
      <Image source={source} style={{ width: size, height: size }} contentFit="contain" />
      {burnt && <Image source={source} style={[StyleSheet.absoluteFill, { opacity: qualityColors.charStrength }]} contentFit="contain" tintColor={qualityColors.char} />}
    </View>
  );
}
