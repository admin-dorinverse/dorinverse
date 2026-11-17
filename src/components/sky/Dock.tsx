// The glass dock at the bottom left of the Sky tab: Shop, Reading plans, Notifications and My Hangar.
// Each button gives a little bounce when tapped. What each one opens comes in a later phase.

import { Image } from 'expo-image';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassSurface } from '@/components/common/Glass';
import { SvgPicture } from '@/components/common/SvgPicture';
import { playSound } from '@/components/common/sounds';
import { chrome, gutter, radius } from '@/theme/spacing';
import { HANGAR_SVG, READING_SVG } from './hudArt';

/** Props for one dock button. */
type DockButtonProps = {
  /** What a screen reader says for the button. */
  label: string;
  /** The button's picture. */
  children: ReactNode;
};

/** One dock button that bounces when tapped. */
function DockButton({ label, children }: DockButtonProps) {
  const scale = useSharedValue(1);
  const bounce = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      onPress={() => {
        playSound('tap');
        scale.set(withSequence(withTiming(0.85, { duration: 127 }), withTiming(1.08, { duration: 127 }), withTiming(1, { duration: 126 })));
      }}
    >
      <Animated.View style={[styles.icon, bounce]}>{children}</Animated.View>
    </Pressable>
  );
}

/** The dock. */
export function Dock() {
  const insets = useSafeAreaInsets();
  const size = chrome.dockIcon;
  return (
    <GlassSurface look="pill" style={[styles.dock, { bottom: insets.bottom + chrome.bottom }]}>
      <DockButton label="Shop">
        <Image source={require('../../../assets/images/icons/shop.png')} style={{ width: size, height: size }} contentFit="contain" />
      </DockButton>
      <DockButton label="Reading plans">
        <SvgPicture svg={READING_SVG} width={size} height={size} />
      </DockButton>
      <DockButton label="Notifications">
        <Image source={require('../../../assets/images/icons/notifications.png')} style={{ width: size, height: size }} contentFit="contain" />
      </DockButton>
      <DockButton label="My Hangar">
        <SvgPicture svg={HANGAR_SVG} width={size} height={size} />
      </DockButton>
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  dock: {
    position: 'absolute',
    left: gutter,
    flexDirection: 'row',
    gap: 2,
    padding: 6,
    borderRadius: radius.sheet,
    zIndex: 24,
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18), 0 2px 0 rgba(0,0,0,0.25), 0 14px 24px -10px rgba(0,0,0,0.65)',
  },
  button: { width: chrome.dockButton, height: chrome.dockButton, borderRadius: radius.dockButton, alignItems: 'center', justifyContent: 'center' },
  pressed: { backgroundColor: 'rgba(255,255,255,0.12)' },
  icon: { filter: 'drop-shadow(0 4px 4px rgba(0,0,0,0.45))' },
});
