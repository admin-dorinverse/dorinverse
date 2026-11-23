// The glass dock at the bottom left of the Sky tab: Shop, Notifications and My Hangar.
// Each button gives a little bounce when tapped. The bell opens Notifications and shows a dot when news is new;
// what the other buttons open comes in a later phase.

import { Image } from 'expo-image';
import { useRouter, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassSurface } from '@/components/common/Glass';
import { SvgPicture } from '@/components/common/SvgPicture';
import { playSound } from '@/components/common/sounds';
import { useUnreadCount } from '@/data/queries/friends';
import { friends } from '@/theme/friendsColors';
import { chrome, gutter, radius } from '@/theme/spacing';
import { HANGAR_SVG } from './hudArt';

/** Props for one dock button. */
type DockButtonProps = {
  /** What a screen reader says for the button. */
  label: string;
  /** The button's picture. */
  children: ReactNode;
  /** Runs when tapped, after the tap sound and the start of the bounce. */
  onPress?: () => void;
  /** Drawn over the button without bouncing, like the bell's dot. */
  badge?: ReactNode;
};

/** One dock button that bounces when tapped. */
function DockButton({ label, children, onPress, badge }: DockButtonProps) {
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
        onPress?.();
      }}
    >
      <Animated.View style={[styles.icon, bounce]}>{children}</Animated.View>
      {badge}
    </Pressable>
  );
}

/**
 * The bell: opens Notifications, with a still dot when news is new. It is its own piece so only it redraws when
 * the count changes, not the whole dock. A screen reader hears how many are new.
 */
function BellButton() {
  const router = useRouter();
  const unread = useUnreadCount();
  const size = chrome.dockIcon;
  const label = unread > 0 ? `Notifications, ${unread} new` : 'Notifications';
  return (
    <DockButton label={label} onPress={() => router.push('/notifications' as Href)} badge={unread > 0 ? <View style={styles.newDot} /> : null}>
      <Image source={require('../../../assets/images/icons/notifications.webp')} style={{ width: size, height: size }} contentFit="contain" />
    </DockButton>
  );
}

/** The dock. */
export function Dock() {
  const insets = useSafeAreaInsets();
  const size = chrome.dockIcon;
  return (
    <GlassSurface look="pill" style={[styles.dock, { bottom: insets.bottom + chrome.bottom }]}>
      <DockButton label="Shop">
        <Image source={require('../../../assets/images/icons/shop.webp')} style={{ width: size, height: size }} contentFit="contain" />
      </DockButton>
      <BellButton />
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
  newDot: { position: 'absolute', top: 6, right: 7, width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: friends.newDotEdge, backgroundColor: friends.newDot },
});
