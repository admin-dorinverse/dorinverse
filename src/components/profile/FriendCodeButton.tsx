// The small square glass button with a QR picture, next to the Account pill on the Profile page. Tapping it opens
// the person's friend card with their QR code. Nothing here animates except the small press shrink.

import { Pressable, StyleSheet } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { GlassSurface } from '@/components/common/Glass';
import { playSound } from '@/components/common/sounds';
import { text } from '@/theme/colors';
import { profileSizes } from '@/theme/profileColors';

/** Props for the QR picture. */
type QrIconProps = {
  /** The picture's color. */
  color: string;
  /** Width and height. */
  size: number;
};

/** A simple QR-looking picture: three corner squares and a few small blocks. */
function QrIcon({ color, size }: QrIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round">
      <Rect x={3} y={3} width={7} height={7} rx={1.6} />
      <Rect x={14} y={3} width={7} height={7} rx={1.6} />
      <Rect x={3} y={14} width={7} height={7} rx={1.6} />
      <Rect x={5.5} y={5.5} width={2} height={2} fill={color} stroke="none" />
      <Rect x={16.5} y={5.5} width={2} height={2} fill={color} stroke="none" />
      <Rect x={5.5} y={16.5} width={2} height={2} fill={color} stroke="none" />
      <Rect x={13.5} y={13.5} width={3} height={3} rx={0.6} fill={color} stroke="none" />
      <Rect x={18.5} y={13.5} width={3} height={3} rx={0.6} fill={color} stroke="none" />
      <Rect x={16} y={16} width={3} height={3} rx={0.6} fill={color} stroke="none" />
      <Rect x={13.5} y={18.5} width={3} height={3} rx={0.6} fill={color} stroke="none" />
      <Rect x={18.5} y={18.5} width={3} height={3} rx={0.6} fill={color} stroke="none" />
    </Svg>
  );
}

/** Props for the friend code button. */
type FriendCodeButtonProps = {
  /** Opens the friend card. */
  onPress: () => void;
};

/** The square QR button that opens the friend card. */
export function FriendCodeButton({ onPress }: FriendCodeButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Your friend code"
      onPress={() => {
        playSound('tap');
        onPress();
      }}
      hitSlop={6}
      style={({ pressed }) => pressed && styles.pressed}
    >
      <GlassSurface look="pill" style={styles.square}>
        <QrIcon color={text.goldNote} size={profileSizes.qrIcon} />
      </GlassSurface>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  square: {
    width: profileSizes.topButton,
    height: profileSizes.topButton,
    borderRadius: profileSizes.topButtonRadius,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { transform: [{ scale: 0.94 }] },
});
