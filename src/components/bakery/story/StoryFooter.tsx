// The bottom of Papa Dorin's Story, as in the design: a dot for every page (the page that shows is a longer dot),
// then a white "Back" button and a brown "Next page" button, which reads "The end" on the last page.

import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { storyPage } from '@/theme/bakeryStoryColors';
import { radius } from '@/theme/spacing';
import { fonts } from '@/theme/text';

/** Props for the story's footer. */
type StoryFooterProps = {
  /** The page that shows, from 0. */
  page: number;
  /** How many pages there are. */
  pages: number;
  /** Goes back a page. */
  onBack: () => void;
  /** Goes to the next page, or ends the story on the last one. */
  onNext: () => void;
};

/** The page dots and the two buttons. */
export function StoryFooter({ page, pages, onBack, onNext }: StoryFooterProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.foot, { paddingBottom: 16 + insets.bottom }]}>
      <View style={styles.dots}>
        {Array.from({ length: pages }, (_, k) => (
          <Dot key={k} on={k === page} />
        ))}
      </View>
      <View style={styles.nav}>
        <Pressable
          accessibilityRole="button"
          disabled={page === 0}
          onPress={onBack}
          style={({ pressed }) => [styles.button, styles.ghost, pressed && styles.ghostPressed, page === 0 && styles.disabled]}
        >
          <Text style={[styles.label, styles.ghostLabel]}>Back</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={onNext} style={({ pressed }) => [styles.button, styles.next, pressed && styles.nextPressed]}>
          <Text style={styles.label}>{page === pages - 1 ? 'The end' : 'Next page'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

/** How long a dot takes to grow or shrink (ms). */
const DOT_MS = 300;

/** One page dot; it grows longer and darker while its page shows. */
function Dot({ on }: { on: boolean }) {
  const lit = useSharedValue(on ? 1 : 0);
  useEffect(() => {
    lit.set(withTiming(on ? 1 : 0, { duration: DOT_MS }));
  }, [on, lit]);
  const look = useAnimatedStyle(() => ({ width: 6 + 12 * lit.get(), backgroundColor: interpolateColor(lit.get(), [0, 1], [storyPage.dot, storyPage.dotOn]) }));
  return <Animated.View style={[styles.dot, look]} />;
}

const styles = StyleSheet.create({
  foot: { width: '100%', maxWidth: 556, alignSelf: 'center', paddingTop: 10, paddingHorizontal: 18 },
  dots: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 7, marginBottom: 10 },
  dot: { height: 6, borderRadius: 5 },
  nav: { flexDirection: 'row', gap: 10 },
  button: { borderRadius: radius.button, paddingVertical: 15, paddingHorizontal: 18, alignItems: 'center' },
  next: { flex: 1, backgroundColor: storyPage.button, boxShadow: `0 5px 0 ${storyPage.buttonShadow}` },
  nextPressed: { transform: [{ translateY: 4 }], boxShadow: `0 1px 0 ${storyPage.buttonShadow}` },
  ghost: { width: '34%', backgroundColor: storyPage.ghost, borderWidth: 2, borderColor: storyPage.ghostEdge, boxShadow: `0 5px 0 ${storyPage.ghostEdge}` },
  ghostPressed: { transform: [{ translateY: 4 }], boxShadow: `0 1px 0 ${storyPage.ghostEdge}` },
  disabled: { opacity: 0.4 },
  label: { fontFamily: fonts.black, fontSize: 17, letterSpacing: 0.3, color: storyPage.buttonText },
  ghostLabel: { color: storyPage.ghostText },
});
