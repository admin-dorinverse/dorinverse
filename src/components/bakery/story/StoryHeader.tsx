// The top of Papa Dorin's Story, as in the design: a round light glass back button with a brown arrow, and the
// page title "Papa Dorin's Story" in dark brown on the warm page.

import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { playSound } from '@/components/common/sounds';
import { storyPage } from '@/theme/bakeryStoryColors';
import { fonts } from '@/theme/text';

/** Props for the story's header. */
type StoryHeaderProps = {
  /** Closes the story, after a tap sound. */
  onBack: () => void;
};

/** The story's header with its back button and title. */
export function StoryHeader({ onBack }: StoryHeaderProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingTop: insets.top + 10 }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back"
        hitSlop={6}
        onPress={() => {
          playSound('tap');
          onBack();
        }}
        style={({ pressed }) => [styles.back, pressed && styles.pressed]}
      >
        <Svg width={18} height={18} viewBox="0 0 24 24">
          <Path d="M15 5l-7 7 7 7" fill="none" stroke={storyPage.ink} strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      </Pressable>
      <Text style={styles.title} numberOfLines={1}>
        Papa Dorin’s Story
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingBottom: 6 },
  back: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundImage: `radial-gradient(circle at 35% 28%, ${storyPage.backShine} 0%, ${storyPage.backMid} 38%, ${storyPage.backEdge} 100%)`,
    boxShadow: `inset 0 1px 1px ${storyPage.backInnerLight}, inset 0 -3px 6px ${storyPage.backInnerShade}, 0 3px 8px -2px ${storyPage.backShadow}`,
  },
  pressed: { transform: [{ scale: 0.94 }] },
  title: { flex: 1, fontFamily: fonts.black, fontSize: 19, color: storyPage.ink },
});
