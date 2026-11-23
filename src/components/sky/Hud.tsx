// The top row of the screen: the person's round avatar (it opens their Profile page), then three glass pills for the
// streak, questions left today, and chips. Shown on all three tabs. What each pill opens comes in a later phase.

import { Image } from 'expo-image';
import { useRouter, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAccount } from '@/data/account';
import { samplePlayer } from '@/data/sample/player';
import { GlassSurface } from '@/components/common/Glass';
import { PersonAvatar } from '@/components/common/PersonAvatar';
import { SvgPicture } from '@/components/common/SvgPicture';
import { playSound } from '@/components/common/sounds';
import { text } from '@/theme/colors';
import { profileSizes } from '@/theme/profileColors';
import { chrome, radius } from '@/theme/spacing';
import { textStyles } from '@/theme/text';
import { TRAY_SVG } from './hudArt';
import { StreakFire } from './StreakFire';

/** The Profile page's address. */
const PROFILE = '/profile' as Href;

/** Screens narrower than this (small phones, about 360 wide) get less room between the HUD items, so all four fit. */
const NARROW_SCREEN = 380;

/** Props for one HUD pill. */
type HudPillProps = {
  /** What a screen reader says for the pill. */
  label: string;
  /** The pill's picture. */
  icon: React.ReactNode;
  /** The number shown. */
  value: string;
};

/** One glass pill with a picture and a number. It shrinks a little while pressed. */
function HudPill({ label, icon, value }: HudPillProps) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={() => playSound('tap')} style={({ pressed }) => pressed && styles.pressed}>
      <GlassSurface look="pill" style={styles.pill}>
        {icon}
        <Text style={[textStyles.hudNumber, styles.number]}>{value}</Text>
      </GlassSurface>
    </Pressable>
  );
}

/** The person's avatar on round pill glass, a pill high. Tapping it plays the tap sound and opens their Profile page. */
function HudAvatar() {
  const router = useRouter();
  const { username } = useAccount();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Your profile"
      onPress={() => {
        playSound('tap');
        router.push(PROFILE);
      }}
      style={({ pressed }) => pressed && styles.pressed}
    >
      <GlassSurface look="pill" style={styles.avatar}>
        <PersonAvatar username={username ?? ''} size={profileSizes.hudAvatar} />
      </GlassSurface>
    </Pressable>
  );
}

/** The HUD row, centered at the top under the safe area. */
export function Hud() {
  const insets = useSafeAreaInsets();
  const still = useReducedMotion();
  const { width } = useWindowDimensions();
  const p = samplePlayer;
  return (
    <View style={[styles.row, width < NARROW_SCREEN && styles.rowNarrow, { top: insets.top + chrome.hudTop }]} pointerEvents="box-none">
      <HudAvatar />
      <HudPill label={`${p.streak} day streak`} value={String(p.streak)} icon={<StreakFire size={22} still={still} />} />
      <HudPill label={`${p.questionsLeft} questions left today`} value={String(p.questionsLeft)} icon={<SvgPicture svg={TRAY_SVG} width={30} height={22} rotate={90} />} />
      <HudPill
        label={`${p.chips} chips`}
        value={p.chips.toLocaleString()}
        icon={<Image source={require('../../../assets/images/icons/chip.webp')} style={styles.chip} contentFit="contain" />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 8, zIndex: 24 },
  rowNarrow: { gap: 6 },
  avatar: {
    width: chrome.hudPillHeight,
    height: chrome.hudPillHeight,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    height: chrome.hudPillHeight,
    borderRadius: radius.pill,
    paddingLeft: 9,
    paddingRight: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  number: { color: text.onDark },
  chip: { width: 22, height: 22 },
  pressed: { transform: [{ scale: 0.95 }] },
});
